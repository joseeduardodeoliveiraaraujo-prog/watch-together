/**
 * Navegador do YouTube dentro da sala (o site m.youtube.com numa WebView). Ver ADR 0011.
 *
 * O script injetado (`BROWSER_SCRIPT`) faz três coisas na página:
 *  1. intercepta toques em links de vídeo e manda o link ao app em vez de abrir o vídeo;
 *  2. avisa o app quando o endereço muda (o site troca de página sem recarregar);
 *  3. pausa e silencia qualquer vídeo que comece a tocar (o som é do player da sala).
 *
 * Página → app: `BrowserMessage`, validada por `parseBrowserMessage`.
 */

import { extractYouTubeVideoId } from './videoId';

export const BROWSER_START_URL = 'https://m.youtube.com/';

export function browserSearchUrl(query: string): string {
  return `https://m.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
}

/** Domínios que abrem dentro do navegador. O resto vai para o navegador do celular. */
const BROWSER_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'consent.youtube.com',
]);

const HOST_PATTERN = /^https:\/\/([^/?#:]+)(?::\d+)?(?:[/?#]|$)/i;

export function hostOf(url: string): string | null {
  const match = HOST_PATTERN.exec(url);
  return match ? match[1].toLowerCase() : null;
}

/** A página principal pode ir para este endereço (dentro do navegador)? */
export function isBrowserUrl(url: string): boolean {
  const host = hostOf(url);
  return host !== null && BROWSER_HOSTS.has(host);
}

/** Endereço que abre um vídeo (/watch, /shorts, /live, youtu.be): devolve o ID. */
export function videoIdFromBrowserUrl(url: string): string | null {
  if (!/^https:\/\//i.test(url)) return null;
  const host = hostOf(url);
  if (host === null) return null;
  // /embed/ só aparece em iframes de terceiros, nunca é "abrir um vídeo".
  if (/^https:\/\/[^/]+\/embed\//i.test(url)) return null;
  return extractYouTubeVideoId(url);
}

export type BrowserMessage =
  /** Toque num link de vídeo (a abertura foi cancelada na página). */
  | { type: 'videoLink'; url: string }
  /** Endereço atual da página (mudou sem recarregar). */
  | { type: 'url'; url: string };

const MAX_URL = 2048;

export function parseBrowserMessage(raw: string): BrowserMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (typeof msg.url !== 'string' || msg.url.length > MAX_URL || !/^https:\/\//i.test(msg.url)) {
    return null;
  }
  if (msg.type === 'videoLink') return { type: 'videoLink', url: msg.url };
  if (msg.type === 'url') return { type: 'url', url: msg.url };
  return null;
}

/**
 * Injetado antes do conteúdo carregar, a cada carregamento completo da página principal.
 * ES5 sem crases: roda em WebViews antigas.
 */
export const BROWSER_SCRIPT = `(function () {
  if (window.__wtBrowser) return;
  window.__wtBrowser = true;

  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  var VIDEO_LINK = /^https:\\/\\/(?:(?:www|m)\\.)?(?:youtube\\.com\\/(?:watch\\?|shorts\\/|live\\/)|youtu\\.be\\/)/i;

  // 1. Toque em link de vídeo: cancela a abertura e avisa o app.
  function onClick(event) {
    var node = event.target;
    while (node && node !== document) {
      if (node.tagName === 'A' && node.href) {
        if (VIDEO_LINK.test(node.href)) {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          post({ type: 'videoLink', url: node.href });
        }
        return;
      }
      node = node.parentNode;
    }
  }
  document.addEventListener('click', onClick, true);

  // 2. Mudanças de endereço sem recarregar (history API) + conferência periódica.
  var lastUrl = '';
  function reportUrl() {
    var url = String(location.href);
    if (url === lastUrl) return;
    lastUrl = url;
    post({ type: 'url', url: url });
  }
  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    history[name] = function () {
      var result = original.apply(this, arguments);
      setTimeout(reportUrl, 0);
      return result;
    };
  });
  window.addEventListener('popstate', reportUrl);
  setInterval(reportUrl, 700);
  reportUrl();

  // 3. Nenhum vídeo toca aqui: o som da sala vem do player.
  document.addEventListener('play', function (event) {
    var media = event.target;
    if (media && typeof media.pause === 'function') {
      media.muted = true;
      media.pause();
    }
  }, true);
})();
true;`;
