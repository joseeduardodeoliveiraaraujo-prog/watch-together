import { NavigationBar } from 'expo-navigation-bar';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  type HostInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { GradientView } from '@/components/ui/Decor';
import { Icon } from '@/components/ui/Icon';
import { PLAYER_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import {
  BROWSER_HEADER_HEIGHT,
  YouTubeBrowserScreen,
} from '@/features/browse/YouTubeBrowserScreen';
import { useProfile } from '@/features/auth/useProfile';
import { ChatOverlay, ChatPanel } from '@/features/chat/ChatPanel';
import { useRoomChat } from '@/features/chat/useRoomChat';
import { FullscreenControls } from '@/features/player/FullscreenControls';
import { PlayerControls } from '@/features/player/PlayerControls';
import { PipIcon } from '@/features/player/PipIcon';
import { PlayerStatusOverlay } from '@/features/player/PlayerStatusOverlay';
import { VOLUME_POPOVER_WIDTH, VolumePopover } from '@/features/player/VolumeControl';
import { useCaptions } from '@/features/player/useCaptions';
import { useVolume } from '@/features/player/useVolume';
import { useFullscreen } from '@/features/player/useFullscreen';
import { useMiniPlayer } from '@/features/player/useMiniPlayer';
import { usePictureInPicture } from '@/features/player/usePictureInPicture';
import { useRoomPlayback } from '@/features/player/useRoomPlayback';
import { listPlaylist } from '@/features/playlist/api';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { useAsyncData } from '@/hooks/useAsyncData';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import {
  pageLoadIssue,
  playerErrorIssue,
  type PlayerAction,
  type PlayerIssue,
} from '@/lib/youtube/errors';
import { YouTubePlayer, type YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

import { fetchRoom } from './api';
import { shareRoomInvite } from './invite';
import { memberColorMap } from './memberColors';
import { PlaybackStatus } from './PlaybackStatus';
import { RoomInfoPanel } from './RoomInfoPanel';
import { countUnread, RoomTabBar, type Tab } from './RoomTabBar';
import { useRoomChannel, type PresencePerson } from './useRoomChannel';

/** Composição da sala: player sincronizado, controles e abas de chat, fila e sala. */
export function RoomScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const room = useAsyncData(`room:${roomId}`, () => fetchRoom(roomId));
  const playlist = useAsyncData(`playlist:${roomId}`, () => listPlaylist(roomId));
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const playback = useRoomPlayback(roomId, userId, playerRef);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen();
  const pip = usePictureInPicture({
    autoEnter: !!PLAYER_URL && !!playback.snapshot?.videoId && !!playback.snapshot?.isPlaying,
    // Fora da tela (sem janelinha): o vídeo para só aqui; a sala continua para os outros.
    onHiddenChange: playback.setSuspended,
  });
  /** Só o vídeo na tela: tela cheia ou janelinha (picture in picture). */
  const videoOnly = fullscreen || pip.active;
  /** Navegador do YouTube aberto por cima da sala, com o vídeo num miniplayer. */
  const [browsing, setBrowsing] = useState(false);
  const mini = browsing && !videoOnly;
  const miniPlayer = useMiniPlayer({
    enabled: mini,
    topInset: insets.top + BROWSER_HEADER_HEIGHT,
    onTap: () => setBrowsing(false),
  });
  const volume = useVolume(playerRef);
  /** A página do player (Vercel) não carregou. */
  const [pageIssue, setPageIssue] = useState<PlayerIssue | null>(null);
  /** Barra de volume (em pé) aberta sobre o vídeo; `volumeTouch` reinicia o tempo para fechar. */
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [volumeTouch, setVolumeTouch] = useState(0);
  /** Posição horizontal da barra dentro da área do vídeo (medida ao abrir). */
  const [volumeLeft, setVolumeLeft] = useState(0);
  const playerAreaRef = useRef<HostInstance>(null);
  const captions = useCaptions(playerRef, playback.snapshot?.videoId ?? null);
  const { profile } = useProfile();
  const myName = profile?.display_name ?? null;
  const chat = useRoomChat(roomId, { userId, displayName: myName ?? 'Você' });
  const [tab, setTab] = useState<Tab>('chat');
  /** Mensagem mais nova já vista na aba de chat (para contar as não lidas). */
  const [seenEntryId, setSeenEntryId] = useState<string | null>(null);

  const memberName = (id: unknown) => room.data?.members.find((m) => m.userId === id)?.displayName;
  const nameOf = (person: PresencePerson) => memberName(person.id) ?? person.name ?? 'Alguém';

  const channel = useRoomChannel(
    roomId,
    { userId, displayName: myName },
    {
      // Alguém entrou ou saiu: recarrega a lista de membros (apelidos vêm do banco).
      onPresenceChange: room.reload,
      onPresenceDiff: (joined, left) => {
        for (const person of joined) chat.notice(`${nameOf(person)} entrou`);
        for (const person of left) chat.notice(`${nameOf(person)} saiu`);
      },
      onPlaybackState: playback.handleRemoteRow,
      onPlaylistChange: (change) => {
        playlist.reload();
        const record = change.record as { added_by?: unknown; title?: unknown } | undefined;
        if (change.operation !== 'INSERT' || !record) return;
        const who = record.added_by === userId ? 'Você' : (memberName(record.added_by) ?? 'Alguém');
        const title = typeof record.title === 'string' ? `"${record.title}"` : 'um vídeo';
        chat.notice(`${who} adicionou ${title} à fila`);
      },
      onChat: chat.receive,
      // (Re)conectou: busca o estado atual para não perder mudanças feitas enquanto estava fora.
      onConnected: () => {
        void playback.refresh();
        playlist.reload();
      },
    },
  );

  if (room.isFirstLoad) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (room.error && !room.data) {
    return (
      <Message
        text={describeRpcError(room.error)}
        action={<Button title="Tentar de novo" onPress={room.reload} />}
      />
    );
  }

  const details = room.data;
  if (!details) {
    return (
      <Message
        text="Sala não encontrada, ou você não participa dela."
        action={<Button title="Voltar ao início" onPress={() => router.replace('/')} />}
      />
    );
  }

  const invite = () => void shareRoomInvite(details.code);

  const switchTab = (next: Tab) => {
    // Entrando ou saindo do chat: marca como lido tudo o que estava na tela.
    if (tab === 'chat' || next === 'chat') setSeenEntryId(chat.entries[0]?.id ?? null);
    setTab(next);
  };
  const unread = tab === 'chat' ? 0 : countUnread(chat.entries, seenEntryId, userId);

  const hasVideo = !!playback.snapshot?.videoId;
  const names = new Map(details.members.map((m) => [m.userId, m.displayName]));
  const colorOf = memberColorMap(details.members.map((m) => m.userId));
  const currentTitle =
    playlist.data?.find((item) => item.id === playback.snapshot?.currentItemId)?.title ?? null;
  const online = channel.onlineIds.size;

  const pressVolume = (centerX: number) => {
    if (!volumeOpen) {
      // Centraliza a barra sobre o alto-falante, medindo a área do vídeo na tela.
      const area = playerAreaRef.current;
      if (!area) return;
      area.measureInWindow((x) => {
        setVolumeLeft(centerX - x - VOLUME_POPOVER_WIDTH / 2);
        setVolumeOpen(true);
      });
      return;
    }
    volume.toggleMute();
    setVolumeTouch((n) => n + 1);
  };

  const switchFullscreen = () => {
    setVolumeOpen(false);
    toggleFullscreen();
  };

  const enterPictureInPicture = pip.supported
    ? () => {
        setVolumeOpen(false);
        pip.enter();
      }
    : undefined;

  const videoId = playback.snapshot?.videoId ?? null;
  const playerIssue: PlayerIssue | null =
    pageIssue ??
    (playback.playerErrorCode !== null && hasVideo
      ? playerErrorIssue(playback.playerErrorCode)
      : null);

  const handlePlayerAction = (action: PlayerAction) => {
    if (action === 'retry') {
      setPageIssue(null);
      playback.resetPlayer();
      playerRef.current?.reload();
    } else if (action === 'skip') {
      playback.skipBroken();
    } else if (videoId) {
      void Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
    }
  };

  const handlePlayerEvent: typeof playback.handlePlayerEvent = (event) => {
    if (event.type === 'ready') setPageIssue(null);
    captions.handleEvent(event);
    volume.handleEvent(event);
    playback.handlePlayerEvent(event);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: videoOnly ? 0 : insets.top }}>
      <StatusBar hidden={videoOnly} style="light" />
      <NavigationBar hidden={videoOnly} />

      {videoOnly ? null : (
        <AppHeader
          title={
            <View className="gap-0.5">
              <Text
                accessibilityRole="header"
                accessibilityLabel={`Sala ${details.code}`}
                className="font-mono-bold text-[17px] tracking-[2.5px] text-text"
              >
                {details.code}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <View
                  className={`h-1.5 w-1.5 rounded-full ${channel.status === 'online' ? 'bg-success' : 'bg-faint'}`}
                />
                <Text className="font-sans text-xs text-muted">
                  {channel.status === 'online'
                    ? `${online} assistindo agora`
                    : channel.status === 'connecting'
                      ? 'Conectando…'
                      : 'Reconectando…'}
                </Text>
              </View>
            </View>
          }
          right={
            <Pressable
              onPress={invite}
              accessibilityRole="button"
              accessibilityLabel="Convidar"
              className="h-9 flex-row items-center gap-1.5 rounded-full bg-primary/15 px-3.5 active:opacity-80"
            >
              <Icon name="user-plus" size={16} color={Colors.accent} />
              <Text className="font-bold text-[13px] text-accent">Convidar</Text>
            </Pressable>
          }
        />
      )}

      {/* O player fica sempre no mesmo lugar da árvore: alternar tela cheia, janelinha ou
          miniplayer só muda o estilo e não recarrega o vídeo. */}
      <Animated.View
        ref={playerAreaRef}
        style={
          videoOnly
            ? { flex: 1, backgroundColor: Colors.black }
            : mini
              ? {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  zIndex: 20,
                  elevation: 12,
                  width: miniPlayer.size.width,
                  height: miniPlayer.size.height,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: Colors.black,
                  boxShadow: '0px 8px 24px #00000099',
                  transform: miniPlayer.transform,
                }
              : undefined
        }
      >
        {PLAYER_URL ? (
          <YouTubePlayer
            ref={playerRef}
            playerUrl={PLAYER_URL}
            fill={videoOnly}
            onEvent={handlePlayerEvent}
            onLoadError={(httpStatus) => setPageIssue(pageLoadIssue(httpStatus))}
          />
        ) : (
          <View className="aspect-video w-full items-center justify-center bg-surface p-4">
            <Text className="text-center font-sans text-muted">
              Player não configurado: defina EXPO_PUBLIC_PLAYER_URL no .env.local.
            </Text>
          </View>
        )}
        {pip.active ? null : mini ? (
          // Miniplayer: arrasta para outro canto; um toque volta para a sala.
          <View
            className="absolute inset-0 items-end p-1.5"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Vídeo da sala"
            accessibilityHint="Toque para voltar para a sala. Arraste para mudar de canto."
            {...miniPlayer.panHandlers}
          >
            <View className="h-6 w-6 items-center justify-center rounded-full bg-black/50">
              <Icon name="maximize-2" size={12} color={Colors.white} />
            </View>
          </View>
        ) : fullscreen ? (
          <FullscreenControls
            isPlaying={!!playback.snapshot?.isPlaying}
            progress={playback.progress}
            volume={volume}
            disabled={!hasVideo}
            title={currentTitle}
            captions={captions.captions}
            onPlay={playback.play}
            onPause={playback.pause}
            onSeekBy={playback.seekBy}
            onSeekTo={playback.seekTo}
            onExit={switchFullscreen}
            onPictureInPicture={enterPictureInPicture}
            onRequestCaptions={captions.refresh}
            onSelectCaption={captions.select}
            overlay={<ChatOverlay entries={chat.entries} userId={userId} colorOf={colorOf} />}
          />
        ) : (
          <>
            {/* Bloqueia toques no vídeo: o play do YouTube tocaria só aqui e a sincronia pausaria. */}
            <View
              className="absolute inset-0"
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => setVolumeOpen(false)}
            />
            {currentTitle && !playerIssue ? (
              <GradientView
                gradient="linear-gradient(to bottom, #00000000, #000000AA)"
                className="absolute bottom-0 left-0 right-0 justify-end px-4 pb-3 pt-8"
                style={{ pointerEvents: 'none' }}
              >
                <Text className="font-semibold text-[13px] text-white" numberOfLines={1}>
                  {currentTitle}
                </Text>
              </GradientView>
            ) : null}
            {enterPictureInPicture && hasVideo && !playerIssue ? (
              // No canto do vídeo: na linha de controles em pé não cabe mais um botão.
              <Pressable
                onPress={enterPictureInPicture}
                accessibilityRole="button"
                accessibilityLabel="Janelinha (picture in picture)"
                hitSlop={6}
                className="absolute right-2.5 top-2.5 h-9 w-9 items-center justify-center rounded-full bg-black/50 active:opacity-70"
              >
                <PipIcon size={17} color={Colors.white} />
              </Pressable>
            ) : null}
            {volumeOpen ? (
              // Dentro da área do vídeo (toques fora do pai não chegam no Android), centralizada
              // sobre o alto-falante.
              <View className="absolute bottom-2" style={{ left: volumeLeft }}>
                <VolumePopover
                  controls={volume}
                  activityKey={volumeTouch}
                  onClose={() => setVolumeOpen(false)}
                />
              </View>
            ) : null}
          </>
        )}
        {PLAYER_URL && !pip.active && !mini ? (
          <PlayerStatusOverlay
            progress={playback.progress}
            issue={playerIssue}
            ready={playback.playerReady}
            hasVideo={hasVideo}
            expectPlaying={!!playback.snapshot?.isPlaying}
            size={fullscreen ? 'fullscreen' : 'portrait'}
            onAction={handlePlayerAction}
            onExitFullscreen={fullscreen ? switchFullscreen : undefined}
          />
        ) : null}
      </Animated.View>

      {videoOnly ? null : (
        <Screen padded={false} topInset={false}>
          <PlayerControls
            isPlaying={!!playback.snapshot?.isPlaying}
            progress={playback.progress}
            volume={volume}
            volumeOpen={volumeOpen}
            onVolumePress={pressVolume}
            disabled={!hasVideo}
            onPlay={playback.play}
            onPause={playback.pause}
            onSeekBy={playback.seekBy}
            onSeekTo={playback.seekTo}
            onToggleFullscreen={switchFullscreen}
          />
          <PlaybackStatus
            lastAction={playback.lastAction}
            members={details.members}
            userId={userId}
            hasVideo={hasVideo}
            // Problemas do vídeo aparecem sobre ele (PlayerStatusOverlay); aqui, só os da sala.
            error={playback.error}
          />

          <RoomTabBar
            tab={tab}
            onChange={switchTab}
            unread={unread}
            queueCount={playlist.data?.length ?? 0}
            online={online}
          />

          {tab === 'chat' ? (
            <ChatPanel
              entries={chat.entries}
              userId={userId}
              error={chat.error}
              onSend={chat.send}
              colorOf={colorOf}
            />
          ) : tab === 'queue' ? (
            <ScrollView
              contentContainerClassName="px-4 pb-6 pt-4"
              keyboardShouldPersistTaps="handled"
            >
              <PlaylistPanel
                roomId={details.id}
                items={playlist.data}
                isFirstLoad={playlist.isFirstLoad}
                loadFailed={!!playlist.error}
                currentItemId={playback.snapshot?.currentItemId ?? null}
                names={names}
                onChanged={playlist.reload}
                onBrowse={() => {
                  setVolumeOpen(false);
                  setBrowsing(true);
                }}
              />
            </ScrollView>
          ) : (
            <RoomInfoPanel
              details={details}
              userId={userId}
              onlineIds={channel.onlineIds}
              onInvite={invite}
            />
          )}
        </Screen>
      )}

      {browsing ? (
        // Por cima da sala (que segue montada); some na janelinha, que mostra só o vídeo.
        <View
          className="absolute inset-0"
          style={{ zIndex: 10, display: pip.active ? 'none' : 'flex' }}
        >
          <YouTubeBrowserScreen roomId={details.id} onClose={() => setBrowsing(false)} />
        </View>
      ) : null}
    </View>
  );
}

function Message({ text, action }: { text: string; action: ReactNode }) {
  return (
    <Screen padded={false}>
      <AppHeader title="Sala" />
      <View className="flex-1 justify-center gap-4 px-5">
        <Text className="text-center font-sans text-text">{text}</Text>
        {action}
      </View>
    </Screen>
  );
}
