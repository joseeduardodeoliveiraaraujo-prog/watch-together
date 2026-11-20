import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { NavigationBar } from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/layout/AppHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { GradientView } from '@/components/ui/Decor';
import { useDialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PLAYER_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useProfile } from '@/features/auth/useProfile';
import { ChatOverlay, ChatPanel } from '@/features/chat/ChatPanel';
import { useRoomChat } from '@/features/chat/useRoomChat';
import { FullscreenControls } from '@/features/player/FullscreenControls';
import { PlayerControls } from '@/features/player/PlayerControls';
import { useCaptions } from '@/features/player/useCaptions';
import { useFullscreen } from '@/features/player/useFullscreen';
import { useRoomPlayback, type LastAction } from '@/features/player/useRoomPlayback';
import { listPlaylist } from '@/features/playlist/api';
import { PlaylistPanel } from '@/features/playlist/PlaylistPanel';
import { useAsyncData } from '@/hooks/useAsyncData';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import { describePlayerError } from '@/lib/youtube/errors';
import { YouTubePlayer, type YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

import { fetchRoom, leaveRoom, ROOM_CAPACITY, type RoomDetails } from './api';
import { memberColor, memberColorMap } from './memberColors';
import { useRoomChannel, type PresencePerson } from './useRoomChannel';

type Tab = 'chat' | 'queue' | 'room';

/** Composição da sala: player sincronizado, controles e abas de chat, fila e sala. */
export function RoomScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const room = useAsyncData(`room:${roomId}`, () => fetchRoom(roomId));
  const playlist = useAsyncData(`playlist:${roomId}`, () => listPlaylist(roomId));
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const playback = useRoomPlayback(roomId, userId, playerRef);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen();
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
    dialog.confirm({
      title: 'Sair da sala?',
      message: alone
        ? 'Você é a última pessoa aqui. A sala será apagada.'
        : 'Você deixa de ser membro. Para voltar, vai precisar do código.',
      confirmLabel: 'Sair',
      destructive: true,
      onConfirm: () => void leave(),
    });
  };

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

  const copyCode = async () => {
    await Clipboard.setStringAsync(details.code);
    dialog.toast({ message: `Código ${details.code} copiado`, icon: 'copy' });
  };

  const handlePlayerEvent: typeof playback.handlePlayerEvent = (event) => {
    captions.handleEvent(event);
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
            currentTime={playback.progress.currentTime}
            duration={playback.progress.duration}
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
            currentTime={playback.progress.currentTime}
            duration={playback.progress.duration}
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

          <TabBar
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
            <ScrollView contentContainerClassName="gap-[22px] px-4 pb-7 pt-4">
              <View className="flex-row items-center justify-between rounded-[18px] border border-border bg-surface p-4">
                <View className="gap-1">
                  <Text className="font-sans text-xs text-muted">Código da sala</Text>
                  <Text className="font-mono-bold text-2xl tracking-[4px] text-text">
                    {details.code}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={copyCode}
                    accessibilityRole="button"
                    accessibilityLabel="Copiar código"
                    className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-surface-raised active:opacity-80"
                  >
                    <Icon name="copy" size={18} />
                  </Pressable>
                  <Pressable
                    onPress={invite}
                    accessibilityRole="button"
                    accessibilityLabel="Convidar"
                    className="h-[42px] flex-row items-center gap-1.5 rounded-xl bg-primary px-3.5 active:opacity-80"
                  >
                    <Icon name="share-2" size={16} color={Colors['primary-foreground']} />
                    <Text className="font-bold text-sm text-primary-foreground">Convidar</Text>
                  </Pressable>
                </View>
              </View>

              <Participants details={details} userId={userId} onlineIds={channel.onlineIds} />

              {actionError ? <Text className="font-sans text-danger">{actionError}</Text> : null}

              <Button
                title="Sair da sala"
                icon="log-out"
                variant="danger"
                onPress={confirmLeave}
                loading={leaving}
              />
            </ScrollView>
          )}
        </Screen>
      )}
    </View>
  );
}

/** Mensagens de outras pessoas que chegaram depois da última vista. */
function countUnread(
  entries: ReturnType<typeof useRoomChat>['entries'],
  seenId: string | null,
  userId: string | null,
): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.id === seenId) break;
    if (entry.kind === 'user' && entry.userId !== userId) count++;
  }
  return count;
}

type TabBarProps = {
  tab: Tab;
  onChange: (tab: Tab) => void;
  unread: number;
  queueCount: number;
  online: number;
};

function TabBar({ tab, onChange, unread, queueCount, online }: TabBarProps) {
  const tabs: { id: Tab; label: string; a11y: string; badge?: number }[] = [
    { id: 'chat', label: 'Chat', a11y: 'Chat', badge: unread },
    { id: 'queue', label: `Fila · ${queueCount}`, a11y: `Fila, ${queueCount} vídeos` },
    { id: 'room', label: `Sala · ${online} on`, a11y: `Sala, ${online} online` },
  ];
  return (
    <View className="h-12 flex-row border-b border-border bg-surface" accessibilityRole="tablist">
      {tabs.map((t) => {
        const active = t.id === tab;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.badge ? `${t.a11y}, ${t.badge} novas` : t.a11y}
            className={`flex-1 flex-row items-center justify-center gap-1.5 ${active ? 'border-b-2 border-primary' : ''}`}
          >
            <Text
              className={`text-sm ${active ? 'font-bold text-text' : 'font-medium text-muted'}`}
            >
              {t.label}
            </Text>
            {t.badge ? (
              <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5">
                <Text className="font-extrabold text-[11px] text-primary-foreground">
                  {t.badge > 99 ? '99+' : t.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Texto da última ação. `withName`: começa com o nome de quem fez ("Ana pausou"). */
const ACTION_TEXT: Record<
  LastAction['action'],
  { text: string; withName: boolean; icon: IconName } | null
> = {
  none: null,
  play: { text: 'deu play', withName: true, icon: 'play' },
  pause: { text: 'pausou', withName: true, icon: 'pause' },
  seek: { text: 'mudou a posição', withName: true, icon: 'fast-forward' },
  load: { text: 'colocou um vídeo', withName: true, icon: 'film' },
  play_item: { text: 'escolheu um vídeo da fila', withName: true, icon: 'list' },
  next: { text: 'Próximo vídeo da fila', withName: false, icon: 'skip-forward' },
  skip_error: { text: 'Um vídeo indisponível foi pulado', withName: false, icon: 'skip-forward' },
  stop: { text: 'A fila acabou', withName: false, icon: 'square' },
};

type PlaybackStatusProps = {
  lastAction: LastAction | null;
  members: RoomDetails['members'];
  userId: string | null;
  hasVideo: boolean;
  error: string | null;
};

/** Linha abaixo dos controles: última ação de alguém (ou erro do player). */
function PlaybackStatus({ lastAction, members, userId, hasVideo, error }: PlaybackStatusProps) {
  let icon: IconName = 'refresh-cw';
  let color: string = Colors.success;
  let text: string | null = null;

  const described = lastAction ? ACTION_TEXT[lastAction.action] : null;
  if (error) {
    icon = 'alert-circle';
    color = Colors.danger;
    text = error;
  } else if (described && lastAction) {
    icon = described.icon;
    if (described.withName) {
      const who =
        lastAction.userId === userId
          ? 'Você'
          : (members.find((m) => m.userId === lastAction.userId)?.displayName ?? 'Alguém');
      text = `${who} ${described.text}`;
    } else {
      text = described.text;
    }
  } else if (!hasVideo) {
    icon = 'info';
    color = Colors.muted;
    text = 'Nenhum vídeo tocando. Adicione um na aba Fila.';
  }

  return (
    <View
      className="min-h-[31px] flex-row items-center gap-2 bg-surface px-5 pb-3 pt-1"
      accessibilityLiveRegion="polite"
    >
      {text ? (
        <>
          <Icon name={icon} size={13} color={color} />
          <Text
            className={`flex-1 font-sans text-xs ${error ? 'text-danger' : 'text-muted'}`}
            numberOfLines={2}
          >
            {text}
          </Text>
        </>
      ) : null}
    </View>
  );
}

type ParticipantsProps = {
  details: RoomDetails;
  userId: string | null;
  onlineIds: ReadonlySet<string>;
};

function Participants({ details, userId, onlineIds }: ParticipantsProps) {
  const free = Math.max(0, ROOM_CAPACITY - details.members.length);
  return (
    <View className="gap-1">
      <View className="flex-row justify-between pb-1.5">
        <Text className="font-bold text-[13px] text-muted">Participantes</Text>
        <Text className="font-semibold text-[13px] text-muted">
          {details.members.length}/{ROOM_CAPACITY}
        </Text>
      </View>

      {details.members.map((member, index) => {
        const online = onlineIds.has(member.userId);
        const isMe = member.userId === userId;
        const isOwner = member.userId === details.owner_id;
        const sub = isMe
          ? isOwner
            ? 'Você · Dono'
            : 'Você'
          : [online ? 'Assistindo' : 'Offline', isOwner ? 'Dono' : null]
              .filter(Boolean)
              .join(' · ');
        return (
          <View
            key={member.userId}
            className="flex-row items-center gap-3 py-2"
            accessible
            accessibilityLabel={`${member.displayName}, ${sub}, ${online ? 'online' : 'offline'}`}
          >
            <View className="h-10 w-10">
              <Avatar
                name={member.displayName}
                color={memberColor(index)}
                size={40}
                dimmed={!online}
              />
              <View
                className={`absolute left-7 top-7 h-3 w-3 rounded-full border-2 border-background ${online ? 'bg-success' : 'bg-faint'}`}
              />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className={`font-semibold text-[15px] ${online ? 'text-text' : 'text-muted'}`}>
                {member.displayName}
              </Text>
              <Text className="font-sans text-xs text-muted">{sub}</Text>
            </View>
          </View>
        );
      })}

      {free > 0 ? (
        <View className="flex-row items-center gap-3 py-2">
          <View className="h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-border">
            <Icon name="plus" size={16} color={Colors.muted} />
          </View>
          <Text className="font-sans text-sm text-muted">
            {free === 1 ? '1 vaga livre' : `${free} vagas livres`} — mande o código
          </Text>
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
