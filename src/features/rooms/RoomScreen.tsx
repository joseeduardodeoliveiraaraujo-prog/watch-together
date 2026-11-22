import { NavigationBar } from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { GradientView } from '@/components/ui/Decor';
import { Icon } from '@/components/ui/Icon';
import { PLAYER_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useProfile } from '@/features/auth/useProfile';
import { ChatOverlay, ChatPanel } from '@/features/chat/ChatPanel';
import { useRoomChat } from '@/features/chat/useRoomChat';
import { FullscreenControls } from '@/features/player/FullscreenControls';
import { PlayerControls } from '@/features/player/PlayerControls';
import { useCaptions } from '@/features/player/useCaptions';
import { useVolume } from '@/features/player/useVolume';
import { useFullscreen } from '@/features/player/useFullscreen';
import { useRoomPlayback } from '@/features/player/useRoomPlayback';
import { listPlaylist } from '@/features/playlist/api';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { useAsyncData } from '@/hooks/useAsyncData';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import { describePlayerError } from '@/lib/youtube/errors';
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
  const volume = useVolume(playerRef);
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

  const handlePlayerEvent: typeof playback.handlePlayerEvent = (event) => {
    captions.handleEvent(event);
    volume.handleEvent(event);
    playback.handlePlayerEvent(event);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: fullscreen ? 0 : insets.top }}>
      <StatusBar hidden={fullscreen} style="light" />
      <NavigationBar hidden={fullscreen} />

      {fullscreen ? null : (
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

      {/* O player fica sempre no mesmo lugar da árvore: alternar a tela cheia não recarrega o vídeo. */}
      <View className={fullscreen ? 'flex-1 bg-black' : ''}>
        {PLAYER_URL ? (
          <YouTubePlayer
            ref={playerRef}
            playerUrl={PLAYER_URL}
            fill={fullscreen}
            onEvent={handlePlayerEvent}
          />
        ) : (
          <View className="aspect-video w-full items-center justify-center bg-surface p-4">
            <Text className="text-center font-sans text-muted">
              Player não configurado: defina EXPO_PUBLIC_PLAYER_URL no .env.local.
            </Text>
          </View>
        )}
        {fullscreen ? (
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
            onExit={toggleFullscreen}
            onRequestCaptions={captions.refresh}
            onSelectCaption={captions.select}
            overlay={<ChatOverlay entries={chat.entries} userId={userId} colorOf={colorOf} />}
          />
        ) : (
          <>
            {/* Bloqueia toques no vídeo: o play do YouTube tocaria só aqui e a sincronia pausaria. */}
            <View className="absolute inset-0" onStartShouldSetResponder={() => true} />
            {currentTitle ? (
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
          </>
        )}
      </View>

      {fullscreen ? null : (
        <Screen padded={false} topInset={false}>
          <PlayerControls
            isPlaying={!!playback.snapshot?.isPlaying}
            progress={playback.progress}
            volume={volume}
            disabled={!hasVideo}
            onPlay={playback.play}
            onPause={playback.pause}
            onSeekBy={playback.seekBy}
            onSeekTo={playback.seekTo}
            onToggleFullscreen={toggleFullscreen}
          />
          <PlaybackStatus
            lastAction={playback.lastAction}
            members={details.members}
            userId={userId}
            hasVideo={hasVideo}
            error={
              playback.error ??
              (playback.playerErrorCode !== null
                ? describePlayerError(playback.playerErrorCode)
                : null)
            }
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
