import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { useDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import { addToPlaylist, playPlaylistItem } from '@/features/playlist/api';
import { fetchVideoInfo } from '@/features/playlist/oembed';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import {
  BROWSER_SCRIPT,
  BROWSER_START_URL,
  browserSearchUrl,
  isBrowserUrl,
  parseBrowserMessage,
  videoIdFromBrowserUrl,
} from '@/lib/youtube/browser';

/**
 * Navegador do YouTube dentro da sala: a pessoa navega pelo site e, ao tocar num vídeo, escolhe
 * "Adicionar à fila" ou "Tocar agora". O player da sala continua tocando por baixo. ADR 0011.
 */
export function YouTubeBrowserScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  // `WebView<object>`: ver o comentário em src/lib/youtube/YouTubePlayer.tsx.
  const webViewRef = useRef<WebView<object>>(null);
  const canGoBackRef = useRef(false);
  /** Vídeo cujo menu já foi aberto pela mudança de endereço (evita abrir de novo). */
  const promptedRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Botão "voltar" do Android: volta no site; na primeira página, sai da tela.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBackRef.current) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const withBusy = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const add = (videoId: string, title: string | null, playNow: boolean) =>
    withBusy(async () => {
      try {
        const itemId = await addToPlaylist(roomId, videoId, title);
        if (playNow) {
          await playPlaylistItem(roomId, itemId);
          dialog.toast({ message: 'Tocando para a sala', icon: 'play' });
          router.back();
        } else {
          dialog.toast({ message: 'Adicionado à fila' });
        }
      } catch (e) {
        dialog.toast({ message: describeRpcError(e), tone: 'error' });
      }
    });

  const openVideo = (videoId: string) =>
    withBusy(async () => {
      const info = await fetchVideoInfo(videoId);
      if (info.status === 'blocked') {
        dialog.toast({
          message: 'O dono deste vídeo não permite que ele toque fora do YouTube.',
          tone: 'error',
        });
        return;
      }
      if (info.status === 'not_found') {
        dialog.toast({ message: 'Vídeo não encontrado (removido ou privado).', tone: 'error' });
        return;
      }
      const title = info.status === 'ok' ? info.title : null;
      dialog.sheet({
        title: title ?? 'Vídeo do YouTube',
        subtitle: 'O que fazer com este vídeo?',
        actions: [
          {
            label: 'Adicionar à fila',
            icon: 'plus',
            onPress: () => void add(videoId, title, false),
          },
          {
            label: 'Tocar agora',
            icon: 'play',
            onPress: () => void add(videoId, title, true),
          },
        ],
      });
    });

  /** Endereço mudou: se a página de um vídeo abriu mesmo assim, volta e abre o menu. */
  const handleUrl = (url: string) => {
    const videoId = videoIdFromBrowserUrl(url);
    if (!videoId) {
      promptedRef.current = null;
      return;
    }
    if (promptedRef.current === videoId) return;
    promptedRef.current = videoId;
    webViewRef.current?.injectJavaScript('history.back(); true;');
    void openVideo(videoId);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    // Só mensagens do próprio YouTube.
    if (!isBrowserUrl(event.nativeEvent.url)) return;
    const message = parseBrowserMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'videoLink') {
      const videoId = videoIdFromBrowserUrl(message.url);
      if (videoId) void openVideo(videoId);
    } else {
      handleUrl(message.url);
    }
  };

  const handleShouldStartLoad = (request: ShouldStartLoadRequest) => {
    // Iframes (anúncios, consentimento) carregam normalmente.
    if (request.isTopFrame === false) return true;
    if (request.url === 'about:blank') return true;
    const videoId = videoIdFromBrowserUrl(request.url);
    if (videoId) {
      void openVideo(videoId);
      return false;
    }
    if (isBrowserUrl(request.url)) return true;
    // Outros sites abrem no navegador do celular; esquemas de app (intent:, vnd.youtube:) não.
    if (/^https?:\/\//i.test(request.url)) Linking.openURL(request.url).catch(() => undefined);
    return false;
  };

  const handleNavigation = (nav: WebViewNavigation) => {
    canGoBackRef.current = nav.canGoBack;
    handleUrl(nav.url);
  };

  const search = () => {
    if (!query.trim()) return;
    const url = browserSearchUrl(query);
    webViewRef.current?.injectJavaScript(`location.href = ${JSON.stringify(url)}; true;`);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-[56px] flex-row items-center gap-2 px-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para a sala"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-raised"
        >
          <Icon name="x" size={22} />
        </Pressable>
        <View className="h-10 flex-1 flex-row items-center gap-2 rounded-full border border-border bg-surface px-3.5">
          <Icon name="search" size={16} color={Colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            placeholder="Buscar no YouTube"
            placeholderTextColor={Colors.subtle}
            selectionColor={Colors.primary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar no YouTube"
            className="h-full flex-1 font-sans text-sm text-text"
          />
          {busy || loading ? <ActivityIndicator size="small" color={Colors.accent} /> : null}
        </View>
      </View>

      <WebView<object>
        ref={webViewRef}
        source={{ uri: BROWSER_START_URL }}
        originWhitelist={['https://*']}
        injectedJavaScriptBeforeContentLoaded={BROWSER_SCRIPT}
        injectedJavaScript={BROWSER_SCRIPT}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigation}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction
        allowsInlineMediaPlayback
        allowsFullscreenVideo={false}
        setSupportMultipleWindows={false}
        onRenderProcessGone={() => webViewRef.current?.reload()}
        style={{ flex: 1, backgroundColor: Colors.background }}
      />

      {busy ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 items-center"
          style={{ top: insets.top + 64 }}
        >
          <View className="flex-row items-center gap-2 rounded-full bg-surface-raised px-3.5 py-2">
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text className="font-semibold text-xs text-text">Carregando…</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
