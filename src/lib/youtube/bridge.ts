/**
 * Protocolo entre o app (React Native) e a página do player (WebView).
 *
 * App → página: `PlayerCommand`, executado via `injectJavaScript` em `window.__wt.handle(cmd)`.
 * Página → app: `PlayerEvent`, enviado via `window.ReactNativeWebView.postMessage(JSON)`.
 *
 * A página é propositalmente "burra": repassa os números crus da IFrame API e o app interpreta.
 */

export type PlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

export type PlayerCommand =
  | { type: 'load'; videoId: string; startSeconds?: number; autoplay: boolean }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'seek'; seconds: number }
  | { type: 'mute'; muted: boolean }
  /** Volume do vídeo neste aparelho, 0 a 100 (dentro do volume de mídia do celular). */
  | { type: 'volume'; volume: number }
  /** Pede a lista de legendas do vídeo atual (resposta: evento `captions`). */
  | { type: 'getCaptions' }
  /** Liga a legenda escolhida; `null` desliga. Vale só para este aparelho. */
  | { type: 'setCaption'; selection: CaptionSelection | null };

/**
 * Legenda disponível no vídeo (lista do próprio YouTube). `id` distingue a manual da gerada
 * automaticamente (`auto`) do mesmo idioma.
 */
export type CaptionTrack = { id: string; label: string; auto: boolean };

/** Idioma para o qual o YouTube sabe traduzir a legenda automaticamente. */
export type CaptionLanguage = { code: string; label: string };

/** Legenda ativa: a faixa `id`, opcionalmente traduzida pelo YouTube para `translateTo`. */
export type CaptionSelection = { id: string; translateTo: string | null };

export type PlayerEvent =
  /** Player criado e pronto para receber comandos. */
  | { type: 'ready' }
  | { type: 'stateChange'; state: PlayerState; currentTime: number; at: number }
  /** Enviado periodicamente (~500 ms) pela página. `at` = Date.now() no momento da leitura. */
  | {
      type: 'status';
      state: PlayerState;
      currentTime: number;
      duration: number;
      muted: boolean;
      at: number;
    }
  /** Erro da IFrame API (2, 5, 100, 101, 150, 152, 153…). */
  | { type: 'error'; code: number }
  /** O script da IFrame API não carregou (sem rede, bloqueio etc.). */
  | { type: 'apiLoadError' }
  /** Legendas do vídeo atual e a ativa (`null` = desligada). */
  | {
      type: 'captions';
      tracks: CaptionTrack[];
      translations: CaptionLanguage[];
      active: CaptionSelection | null;
    }
  | { type: 'log'; message: string };

const STATE_BY_CODE: Record<number, PlayerState> = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued',
};

export function playerStateFromCode(code: unknown): PlayerState | null {
  return typeof code === 'number' ? (STATE_BY_CODE[code] ?? null) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Valida e converte uma mensagem crua vinda da WebView.
 * Retorna `null` para qualquer coisa fora do protocolo (nunca confiar no conteúdo da página).
 */
export function parsePlayerEvent(raw: string): PlayerEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  switch (msg.type) {
    case 'ready':
      return { type: 'ready' };
    case 'apiLoadError':
      return { type: 'apiLoadError' };
    case 'stateChange': {
      const state = playerStateFromCode(msg.state);
      if (!state || !isFiniteNumber(msg.currentTime) || !isFiniteNumber(msg.at)) return null;
      return { type: 'stateChange', state, currentTime: msg.currentTime, at: msg.at };
    }
    case 'status': {
      const state = playerStateFromCode(msg.state);
      if (
        !state ||
        !isFiniteNumber(msg.currentTime) ||
        !isFiniteNumber(msg.duration) ||
        !isFiniteNumber(msg.at)
      ) {
        return null;
      }
      return {
        type: 'status',
        state,
        currentTime: msg.currentTime,
        duration: msg.duration,
        muted: msg.muted === true,
        at: msg.at,
      };
    }
    case 'error':
      return isFiniteNumber(msg.code) ? { type: 'error', code: msg.code } : null;
    case 'captions':
      return parseCaptions(msg);
    case 'log':
      return typeof msg.message === 'string'
        ? { type: 'log', message: msg.message.slice(0, 500) }
        : null;
    default:
      return null;
  }
}

const MAX_ITEMS = 300;

function shortString(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

function parseCaptions(msg: Record<string, unknown>): PlayerEvent | null {
  if (!Array.isArray(msg.tracks)) return null;
  const tracks: CaptionTrack[] = [];
  for (const item of msg.tracks.slice(0, MAX_ITEMS)) {
    if (typeof item !== 'object' || item === null) continue;
    const raw = item as Record<string, unknown>;
    const id = shortString(raw.id, 100);
    if (!id) continue;
    tracks.push({
      id,
      label: (shortString(raw.label, 200) ?? id).slice(0, 100),
      auto: raw.auto === true,
    });
  }

  const translations: CaptionLanguage[] = [];
  if (Array.isArray(msg.translations)) {
    for (const item of msg.translations.slice(0, MAX_ITEMS)) {
      if (typeof item !== 'object' || item === null) continue;
      const raw = item as Record<string, unknown>;
      const code = shortString(raw.code, 20);
      if (!code) continue;
      translations.push({ code, label: (shortString(raw.label, 200) ?? code).slice(0, 100) });
    }
  }

  let active: CaptionSelection | null = null;
  if (typeof msg.active === 'object' && msg.active !== null) {
    const raw = msg.active as Record<string, unknown>;
    const id = shortString(raw.id, 100);
    if (id && tracks.some((t) => t.id === id)) {
      const translateTo = shortString(raw.translateTo, 20);
      active = {
        id,
        translateTo:
          translateTo && translations.some((l) => l.code === translateTo) ? translateTo : null,
      };
    }
  }
  return { type: 'captions', tracks, translations, active };
}

/** Gera o JS injetado na WebView para executar um comando. */
export function commandToScript(command: PlayerCommand): string {
  // JSON é uma expressão JS válida; o `true;` final evita warnings no Android.
  return `window.__wt && window.__wt.handle(${JSON.stringify(command)}); true;`;
}
