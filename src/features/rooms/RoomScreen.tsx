import * as Linking from 'expo-linking';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { PLAYER_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { PlayerControls } from '@/features/player/PlayerControls';
import { useFullscreen } from '@/features/player/useFullscreen';
import { useRoomPlayback, type LastAction } from '@/features/player/useRoomPlayback';
import { listPlaylist } from '@/features/playlist/api';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { useAsyncData } from '@/hooks/useAsyncData';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import { describePlayerError } from '@/lib/youtube/errors';
import { YouTubePlayer, type YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

import { fetchRoom, leaveRoom, ROOM_CAPACITY, type RoomDetails } from './api';
import { useRoomChannel, type ChannelStatus } from './useRoomChannel';

/** Composição da sala: player sincronizado, controles, convite e participantes. */
export function RoomScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const room = useAsyncData(`room:${roomId}`, () => fetchRoom(roomId));
  const playlist = useAsyncData(`playlist:${roomId}`, () => listPlaylist(roomId));
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const playback = useRoomPlayback(roomId, userId, playerRef);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen();
  const channel = useRoomChannel(roomId, userId, {
    // Alguém entrou ou saiu: recarrega a lista de membros (apelidos vêm do banco).
    onPresenceChange: room.reload,
    onPlaybackState: playback.handleRemoteRow,
    onPlaylistChange: playlist.reload,
    // (Re)conectou: busca o estado atual para não perder mudanças feitas enquanto estava fora.
    onConnected: () => {
      void playback.refresh();
      playlist.reload();
    },
  });
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const invite = async () => {
    const link = Linking.createURL(`/join/${details.code}`);
    await Share.share({
      message: `Vem assistir comigo no Watch Together!\nCódigo da sala: ${details.code}\n${link}`,
    });
  };

  const leave = async () => {
    setLeaving(true);
    setActionError(null);
    try {
      await leaveRoom(details.id);
      router.replace('/');
    } catch (error) {
      setActionError(describeRpcError(error));
      setLeaving(false);
    }
  };

  const confirmLeave = () => {
    const alone = details.members.length <= 1;
    Alert.alert(
      'Sair da sala?',
      alone
        ? 'Você é a última pessoa aqui. A sala será apagada.'
        : 'Você deixa de ser membro. Para voltar, vai precisar do código.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: leave },
      ],
    );
  };

  const hasVideo = !!playback.snapshot?.videoId;
  const names = new Map(details.members.map((m) => [m.userId, m.displayName]));
  const controls = (
    <PlayerControls
      isPlaying={!!playback.snapshot?.isPlaying}
      currentTime={playback.progress.currentTime}
      duration={playback.progress.duration}
      disabled={!hasVideo}
      fullscreen={fullscreen}
      onPlay={playback.play}
      onPause={playback.pause}
      onSeekBy={playback.seekBy}
      onSeekTo={playback.seekTo}
      onToggleFullscreen={toggleFullscreen}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: !fullscreen }} />
      <StatusBar hidden={fullscreen} style="light" />
      <NavigationBar hidden={fullscreen} />

      {/* O player fica sempre no mesmo lugar da árvore: alternar a tela cheia não recarrega o vídeo. */}
      <View className={fullscreen ? 'flex-1 bg-black' : ''}>
        {PLAYER_URL ? (
          <YouTubePlayer
            ref={playerRef}
            playerUrl={PLAYER_URL}
            fill={fullscreen}
            onEvent={playback.handlePlayerEvent}
          />
        ) : (
          <View className="aspect-video w-full items-center justify-center bg-surface p-4">
            <Text className="text-center text-muted">
              Player não configurado: defina EXPO_PUBLIC_PLAYER_URL no .env.local.
            </Text>
          </View>
        )}
        {fullscreen ? <View className="absolute bottom-0 left-0 right-0">{controls}</View> : null}
      </View>

      {fullscreen ? null : (
        <Screen padded={false} topInset={false}>
          {controls}
          <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
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

            <PlaylistPanel
              roomId={details.id}
              items={playlist.data}
              isFirstLoad={playlist.isFirstLoad}
              loadFailed={!!playlist.error}
              currentItemId={playback.snapshot?.currentItemId ?? null}
              names={names}
              onChanged={playlist.reload}
            />

            <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface p-4">
              <View>
                <Text className="text-xs text-muted">Código da sala</Text>
                <Text className="font-mono text-2xl font-bold tracking-widest text-text">
                  {details.code}
                </Text>
              </View>
              <Button title="Convidar" onPress={invite} />
            </View>

            <Participants
              details={details}
              userId={userId}
              onlineIds={channel.onlineIds}
              status={channel.status}
            />

            {actionError ? <Text className="text-danger">{actionError}</Text> : null}

            <Button
              title="Sair da sala"
              variant="danger"
              onPress={confirmLeave}
              loading={leaving}
            />
          </ScrollView>
        </Screen>
      )}
    </View>
  );
}

/** Texto da última ação. `withName`: começa com o nome de quem fez ("Ana pausou"). */
const ACTION_TEXT: Record<LastAction['action'], { text: string; withName: boolean } | null> = {
  none: null,
  play: { text: 'deu play', withName: true },
  pause: { text: 'pausou', withName: true },
  seek: { text: 'mudou a posição', withName: true },
  load: { text: 'colocou um vídeo', withName: true },
  play_item: { text: 'escolheu um vídeo da fila', withName: true },
  next: { text: 'Próximo vídeo da fila', withName: false },
  skip_error: { text: 'Um vídeo indisponível foi pulado', withName: false },
  stop: { text: 'A fila acabou', withName: false },
};

type PlaybackStatusProps = {
  lastAction: LastAction | null;
  members: RoomDetails['members'];
  userId: string | null;
  hasVideo: boolean;
  error: string | null;
};

function PlaybackStatus({ lastAction, members, userId, hasVideo, error }: PlaybackStatusProps) {
  if (error) return <Text className="text-danger">{error}</Text>;
  const described = lastAction ? ACTION_TEXT[lastAction.action] : null;
  if (described && lastAction) {
    if (!described.withName) return <Text className="text-muted">{described.text}</Text>;
    const who =
      lastAction.userId === userId
        ? 'Você'
        : (members.find((m) => m.userId === lastAction.userId)?.displayName ?? 'Alguém');
    return (
      <Text className="text-muted">
        {who} {described.text}
      </Text>
    );
  }
  if (!hasVideo) {
    return <Text className="text-muted">Nenhum vídeo tocando. Adicione um à fila abaixo.</Text>;
  }
  return null;
}

type ParticipantsProps = {
  details: RoomDetails;
  userId: string | null;
  onlineIds: ReadonlySet<string>;
  status: ChannelStatus;
};

function Participants({ details, userId, onlineIds, status }: ParticipantsProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-text">
          Participantes ({details.members.length}/{ROOM_CAPACITY})
        </Text>
        {status !== 'online' ? (
          <Text className="text-xs text-muted">
            {status === 'connecting' ? 'Conectando…' : 'Reconectando…'}
          </Text>
        ) : null}
      </View>

      {details.members.map((member) => {
        const online = onlineIds.has(member.userId);
        return (
          <View
            key={member.userId}
            className="flex-row items-center gap-3 rounded-xl bg-surface px-4 py-3"
            accessibilityLabel={`${member.displayName}, ${online ? 'online' : 'offline'}`}
          >
            <View className={`h-3 w-3 rounded-full ${online ? 'bg-success' : 'bg-border'}`} />
            <Text className="flex-1 text-text">
              {member.displayName}
              {member.userId === userId ? ' (você)' : ''}
            </Text>
            {member.userId === details.owner_id ? (
              <Text className="text-xs text-primary">dono</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Message({ text, action }: { text: string; action: ReactNode }) {
  return (
    <Screen topInset={false}>
      <View className="flex-1 justify-center gap-4">
        <Text className="text-center text-text">{text}</Text>
        {action}
      </View>
    </Screen>
  );
}
