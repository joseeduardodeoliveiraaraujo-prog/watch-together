import { useImperativeHandle, useRef, type Ref } from 'react';
import { Linking, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { commandToScript, parsePlayerEvent, type PlayerCommand, type PlayerEvent } from './bridge';

/**
 * Player do YouTube: a WebView abre a página publicada em `playerUrl` (origem real, então o
 * YouTube recebe um Referer confiável e não dá erro 153). Ver ADR 0004.
 */

export type YouTubePlayerHandle = {
  send: (command: PlayerCommand) => void;
  reload: () => void;
};

type YouTubePlayerProps = {
  playerUrl: string;
  /** Ocupa todo o espaço do pai (tela cheia) em vez de 16:9 na largura. */
  fill?: boolean;
  onEvent: (event: PlayerEvent) => void;
  /**
   * A página do player não carregou: sem resposta (sem internet, DNS) ou, com `httpStatus`,
   * o servidor respondeu com erro.
   */
  onLoadError?: (httpStatus?: number) => void;
  /** Diagnóstico: medidas que a página enxerga, enviadas a cada mudança de tamanho. */
  onWebLayout?: (layout: WebLayout) => void;
  ref?: Ref<YouTubePlayerHandle>;
};

/** Tamanho visto de dentro da página (px CSS), para diagnosticar a janelinha. */
export type WebLayout = {
  innerWidth: number;
  innerHeight: number;
  vvWidth: number;
  vvHeight: number;
  vvTop: number;
  /** Retângulo do player do YouTube na página: "x,y LxA". */
  frame: string;
};

const WEB_LAYOUT_MARKER = '__wtLayout';

/** Injetado só com `onWebLayout`: não depende de publicar a página de novo. */
const WEB_LAYOUT_SCRIPT = `(function () {
  var last = '';
  function report() {
    var vv = window.visualViewport || { width: 0, height: 0, offsetTop: 0 };
    var el = document.getElementById('player');
    var b = el ? el.getBoundingClientRect() : null;
    var data = {
      ${WEB_LAYOUT_MARKER}: true,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      vvWidth: Math.round(vv.width),
      vvHeight: Math.round(vv.height),
      vvTop: Math.round(vv.offsetTop),
      frame: b ? Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) : '?'
    };
    var json = JSON.stringify(data);
    if (json !== last && window.ReactNativeWebView) {
      last = json;
      window.ReactNativeWebView.postMessage(json);
    }
  }
  window.addEventListener('resize', report);
  setInterval(report, 1000);
  report();
})(); true;`;

function parseWebLayout(data: string): WebLayout | null {
  if (!data.includes(WEB_LAYOUT_MARKER)) return null;
  try {
    return JSON.parse(data) as WebLayout;
  } catch {
    return null;
  }
}

function getOrigin(url: string): string {
  const match = /^(https?:\/\/[^/?#]+)/i.exec(url);
  return match ? match[1].toLowerCase() : '';
}

export function YouTubePlayer({
  playerUrl,
  fill = false,
  onEvent,
  onLoadError,
  onWebLayout,
  ref,
}: YouTubePlayerProps) {
  // `WebView<object>`: os tipos da lib declaram `WebView<P = undefined>` com props
  // `WebViewProps & P`; no TypeScript 6, `X & undefined` vira `never`. Só afeta tipos.
  const webViewRef = useRef<WebView<object>>(null);
  const playerOrigin = getOrigin(playerUrl);

  useImperativeHandle(ref, () => ({
    send: (command) => webViewRef.current?.injectJavaScript(commandToScript(command)),
    reload: () => webViewRef.current?.reload(),
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    // Só aceitamos mensagens da nossa página (nunca de páginas para onde o usuário navegou).
    if (getOrigin(event.nativeEvent.url) !== playerOrigin) return;
    if (onWebLayout) {
      const layout = parseWebLayout(event.nativeEvent.data);
      if (layout) return onWebLayout(layout);
    }
    const parsed = parsePlayerEvent(event.nativeEvent.data);
    if (parsed) onEvent(parsed);
  };

  const handleShouldStartLoad = (request: ShouldStartLoadRequest) => {
    // Iframes (o próprio player do YouTube) sempre carregam.
    if (request.isTopFrame === false) return true;
    if (request.url.startsWith(playerUrl) || request.url === 'about:blank') return true;
    // Toques no logo/título do YouTube abrem o app/navegador, sem tirar a WebView do player.
    Linking.openURL(request.url).catch(() => undefined);
    return false;
  };

  return (
    <View className={fill ? 'flex-1 bg-black' : 'aspect-video w-full bg-black'}>
      <WebView<object>
        ref={webViewRef}
        source={{ uri: playerUrl }}
        originWhitelist={['https://*']}
        onMessage={handleMessage}
        injectedJavaScript={onWebLayout ? WEB_LAYOUT_SCRIPT : undefined}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo={false}
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        overScrollMode="never"
        // Só a nossa página conta (falhas de recursos do YouTube não derrubam o player).
        onError={(e) => {
          if (getOrigin(e.nativeEvent.url) === playerOrigin) onLoadError?.();
        }}
        onHttpError={(e) => {
          if (getOrigin(e.nativeEvent.url) === playerOrigin)
            onLoadError?.(e.nativeEvent.statusCode);
        }}
        // Android pode matar o processo de renderização sob pressão de memória: recarrega.
        onRenderProcessGone={() => webViewRef.current?.reload()}
        style={{ backgroundColor: '#000' }}
      />
    </View>
  );
}
