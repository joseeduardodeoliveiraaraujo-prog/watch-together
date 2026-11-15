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
  ref?: Ref<YouTubePlayerHandle>;
};

function getOrigin(url: string): string {
  const match = /^(https?:\/\/[^/?#]+)/i.exec(url);
  return match ? match[1].toLowerCase() : '';
}

export function YouTubePlayer({ playerUrl, fill = false, onEvent, ref }: YouTubePlayerProps) {
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
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo={false}
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        overScrollMode="never"
        // Android pode matar o processo de renderização sob pressão de memória: recarrega.
        onRenderProcessGone={() => webViewRef.current?.reload()}
        style={{ backgroundColor: '#000' }}
      />
    </View>
  );
}
