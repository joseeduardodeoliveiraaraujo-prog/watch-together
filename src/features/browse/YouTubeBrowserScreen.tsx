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
import {
  addToPlaylist,
  listPlaylist,
  PLAYLIST_CAPACITY,
  playPlaylistItem,
} from '@/features/playlist/api';
import { fetchVideoInfo, thumbnailUrl } from '@/features/playlist/oembed';
import { useAsyncData } from '@/hooks/useAsyncData';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import {
  BROWSER_SCRIPT,
  BROWSER_START_URL,
  browserSearchUrl,
  isBrowserUrl,
  parseBrowserMessage,
  searchQueryFromUrl,
  videoIdFromBrowserUrl,
} from '@/lib/youtube/browser';

type Busy = 'video' | 'adding' | null;

const BUSY_TEXT: Record<Exclude<Busy, null>, string> = {
  video: 'Abrindo vídeo…',
  adding: 'Adicionando à fila…',
};

/**
 * Navegador do YouTube dentro da sala: a pessoa navega pelo site e, ao tocar num vídeo, escolhe
 * "Adicionar à fila" ou "Tocar agora". O player da sala continua tocando por baixo. ADR 0011.
 */
export function YouTubeBrowserScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  // Fila própria desta tela (contador, fila cheia, "já está na fila"); recarrega a cada adição.
  const playlist = useAsyncData(`browse-playlist:${roomId}`, () => listPlaylist(roomId));
  // `WebView<object>`: ver o comentário em src/lib/youtube/YouTubePlayer.tsx.
  const webViewRef = useRef<WebView<object>>(null);
  const canGoBackRef = useRef(false);
  /** Vídeo cujo menu já foi aberto pela mudança de endereço (evita abrir de novo). */
  const promptedRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [queryFocused, setQueryFocused] = useState(false);

  const count = playlist.data?.length ?? null;
  const full = count !== null && count >= PLAYLIST_CAPACITY;

  // Botão "voltar" do Android: volta no site; na primeira página, sai da tela.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBackRef.current) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const withBusy = async (kind: Exclude<Busy, null>, task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const add = (videoId: string, title: string | null, playNow: boolean) =>
    withBusy('adding', async () => {
      try {
        const itemId = await addToPlaylist(roomId, videoId, title);
        playlist.reload();
        if (playNow) {
          await playPlaylistItem(roomId, itemId);
          dialog.toast({ message: 'Tocando para a sala', icon: 'play' });
          router.back();
        } else {
          dialog.toast({ message: 'Adicionado à fila', icon: 'check-circle' });
        }
      } catch (e) {
        playlist.reload();
        dialog.toast({ message: describeRpcError(e), tone: 'error' });
      }
    });

  const openVideo = (videoId: string) => {
    if (full) {
      dialog.toast({
        message: `A fila já tem ${PLAYLIST_CAPACITY} vídeos. Remova algum na sala.`,
        tone: 'error',
      });
      return;
    }
    void withBusy('video', async () => {
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
      const author = info.status === 'ok' ? info.author : null;
      const alreadyQueued = playlist.data?.some((item) => item.videoId === videoId) ?? false;
      dialog.sheet({
        title: title ?? 'Vídeo do YouTube',
        subtitle: author ?? undefined,
        thumbnail: thumbnailUrl(videoId),
        note: alreadyQueued ? 'Este vídeo já está na fila.' : undefined,
        actions: [
          {
            label: alreadyQueued ? 'Adicionar de novo' : 'Adicionar à fila',
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
  };

  /** Endereço mudou: se a página de um vídeo abriu mesmo assim, volta e abre o menu. */
  const handleUrl = (url: string) => {
    const searched = searchQueryFromUrl(url);
    if (searched !== null && !queryFocused) setQuery(searched);

    const videoId = videoIdFromBrowserUrl(url);
    if (!videoId) {
      promptedRef.current = null;
      return;
    }
    if (promptedRef.current === videoId) return;
    promptedRef.current = videoId;
    webViewRef.current?.injectJavaScript('history.back(); true;');
    openVideo(videoId);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    // Só mensagens do próprio YouTube.
    if (!isBrowserUrl(event.nativeEvent.url)) return;
    const message = parseBrowserMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === 'videoLink') {
      const videoId = videoIdFromBrowserUrl(message.url);
      if (videoId) openVideo(videoId);
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
      openVideo(videoId);
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

  const showProgress = loading && progress < 1;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-[60px] flex-row items-center gap-2 border-b border-border bg-surface px-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar para a sala"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-raised"
        >
          <Icon name="chevron-left" size={24} />
        </Pressable>

        <View
          className={`h-10 flex-1 flex-row items-center gap-2 rounded-full border bg-background px-3.5 ${queryFocused ? 'border-primary' : 'border-border'}`}
        >
          <Icon name="search" size={16} color={Colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            onFocus={() => setQueryFocused(true)}
            onBlur={() => setQueryFocused(false)}
            placeholder="Buscar no YouTube"
            placeholderTextColor={Colors.subtle}
            selectionColor={Colors.primary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar no YouTube"
            className="h-full flex-1 font-sans text-sm text-text"
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={8}
              className="active:opacity-70"
            >
              <Icon name="x-circle" size={16} color={Colors.subtle} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={
            count === null ? 'Fila' : `Fila com ${count} vídeos. Voltar para a sala`
          }
          className={`h-10 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-80 ${full ? 'bg-danger/10' : 'bg-primary/15'}`}
        >
          <Icon name="list" size={15} color={full ? Colors.danger : Colors.accent} />
          <Text className={`font-mono-bold text-[13px] ${full ? 'text-danger' : 'text-accent'}`}>
            {count ?? '–'}
          </Text>
        </Pressable>
      </View>

      {/* Progresso do carregamento da página, como nos navegadores. */}
      <View className="h-0.5 bg-transparent">
        {showProgress ? (
          <View
            className="h-full bg-primary"
            style={{ width: `${Math.max(0.08, progress) * 100}%` }}
          />
        ) : null}
      </View>

      {full ? (
        <View className="flex-row items-center gap-2 bg-danger/10 px-4 py-2.5">
          <Icon name="alert-circle" size={15} color={Colors.danger} />
          <Text className="flex-1 font-semibold text-xs text-danger">
            Fila cheia ({PLAYLIST_CAPACITY} vídeos). Remova algum na sala para adicionar mais.
          </Text>
        </View>
      ) : null}

      <WebView<object>
        ref={webViewRef}
        source={{ uri: BROWSER_START_URL }}
        originWhitelist={['https://*']}
        injectedJavaScriptBeforeContentLoaded={BROWSER_SCRIPT}
        injectedJavaScript={BROWSER_SCRIPT}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onNavigationStateChange={handleNavigation}
        onLoadStart={() => {
          setLoading(true);
          setProgress(0);
        }}
        onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
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
          style={{ top: insets.top + 76 }}
        >
          <View
            className="flex-row items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2.5"
            style={{ boxShadow: '0px 8px 24px #00000080' }}
          >
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text className="font-semibold text-[13px] text-text">{BUSY_TEXT[busy]}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
