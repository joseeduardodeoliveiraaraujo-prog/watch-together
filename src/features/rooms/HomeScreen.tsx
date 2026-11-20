import { useFocusEffect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { GradientView } from '@/components/ui/Decor';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useProfile } from '@/features/auth/useProfile';
import { useAsyncData } from '@/hooks/useAsyncData';
import { describeRpcError } from '@/lib/supabase/rpcErrors';

import { createRoom, joinRoom, listMyRooms, ROOM_CAPACITY, type RoomSummary } from './api';
import { memberColor } from './memberColors';
import { normalizeRoomCode, validateRoomCode } from './roomCode';

export function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const { profile } = useProfile();
  const rooms = useAsyncData(userId ? `rooms:${userId}` : null, listMyRooms);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [codeFocused, setCodeFocused] = useState(false);

  // Atualiza a lista ao voltar para a home (ex.: depois de sair de uma sala).
  useFocusEffect(rooms.reload);

  const openRoom = (roomId: string) => router.push(`/room/${roomId}`);

  const handleCreate = async () => {
    setActionError(null);
    setBusy('create');
    try {
      const room = await createRoom();
      openRoom(room.id);
    } catch (error) {
      setActionError(describeRpcError(error));
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async () => {
    const validation = validateRoomCode(code);
    setCodeError(validation);
    setActionError(null);
    if (validation) return;

    setBusy('join');
    try {
      const room = await joinRoom(normalizeRoomCode(code));
      setCode('');
      openRoom(room.id);
    } catch (error) {
      setActionError(describeRpcError(error));
    } finally {
      setBusy(null);
    }
  };

  const name = profile?.display_name;
  const codeBorder = codeError ? 'border-danger' : codeFocused ? 'border-primary' : 'border-border';

  return (
    <FormScreen contentClassName="gap-7 px-5 pb-8 pt-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text
            accessibilityRole="header"
            className="font-extrabold text-[26px] tracking-[-0.5px] text-text"
            numberOfLines={1}
          >
            {name ? `Olá, ${name}!` : 'Olá!'}
          </Text>
          <Text className="font-sans text-sm text-muted">O que vamos assistir hoje?</Text>
        </View>
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Perfil"
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised active:opacity-80"
        >
          <Text className="font-bold text-[17px] text-primary">
            {name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </Pressable>
      </View>

      <GradientView
        gradient={`linear-gradient(160deg, ${Colors['card-tint']}, ${Colors.surface})`}
        className="gap-[18px] rounded-3xl border border-primary/25 p-5"
      >
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5">
            <Text className="font-bold text-xl text-text">Nova sala</Text>
            <Text className="font-sans text-sm leading-5 text-accent-text">
              Crie uma sala e mande o código para até {ROOM_CAPACITY - 1} amigos.
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
            <Icon name="tv" size={24} color={Colors.accent} />
          </View>
        </View>
        <Button
          title="Criar sala"
          icon="plus"
          onPress={handleCreate}
          loading={busy === 'create'}
          disabled={busy !== null}
        />
      </GradientView>

      <View className="gap-3">
        <Text className="font-semibold text-[13px] text-muted">Entrar com código</Text>
        <View className="flex-row gap-2.5">
          <View
            className={`h-[52px] flex-1 flex-row items-center gap-2.5 rounded-[14px] border bg-surface px-4 ${codeBorder}`}
          >
            <Icon name="hash" size={18} color={Colors.muted} />
            <TextInput
              value={code}
              onChangeText={setCode}
              onFocus={() => setCodeFocused(true)}
              onBlur={() => setCodeFocused(false)}
              placeholder="K7M2QX"
              placeholderTextColor={Colors.faint}
              selectionColor={Colors.primary}
              accessibilityLabel="Entrar com código"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleJoin}
              className="h-full flex-1 font-mono text-[17px] tracking-[3px] text-text"
            />
          </View>
          <Pressable
            onPress={handleJoin}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Entrar na sala"
            className={`h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-border bg-surface-raised active:opacity-80 ${busy !== null && busy !== 'join' ? 'opacity-50' : ''}`}
          >
            {busy === 'join' ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Icon name="arrow-right" size={20} />
            )}
          </Pressable>
        </View>
        {codeError ? <Text className="font-sans text-sm text-danger">{codeError}</Text> : null}
      </View>

      {actionError ? <Text className="font-sans text-danger">{actionError}</Text> : null}

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-lg text-text">Suas salas</Text>
          {rooms.data?.length ? (
            <Text className="font-semibold text-sm text-muted">{rooms.data.length}</Text>
          ) : null}
        </View>
        <RoomList
          rooms={rooms.data}
          isFirstLoad={rooms.isFirstLoad}
          failed={!!rooms.error}
          userId={userId}
          onOpen={openRoom}
          onRetry={rooms.reload}
        />
      </View>
    </FormScreen>
  );
}

type RoomListProps = {
  rooms: RoomSummary[] | null;
  isFirstLoad: boolean;
  failed: boolean;
  userId: string | null;
  onOpen: (roomId: string) => void;
  onRetry: () => void;
};

function RoomList({ rooms, isFirstLoad, failed, userId, onOpen, onRetry }: RoomListProps) {
  if (isFirstLoad) return <ActivityIndicator color={Colors.primary} />;

  if (failed && !rooms) {
    return (
      <View className="gap-2">
        <Text className="font-sans text-danger">Não foi possível carregar suas salas.</Text>
        <Button title="Tentar de novo" variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <View className="items-center gap-2 rounded-[18px] border border-dashed border-border px-6 py-8">
        <Icon name="film" size={22} color={Colors.muted} />
        <Text className="text-center font-sans text-sm leading-5 text-muted">
          Você ainda não está em nenhuma sala. Crie uma ou entre com um código.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isOwner={room.owner_id === userId}
          onPress={() => onOpen(room.id)}
        />
      ))}
    </View>
  );
}

function describeNowPlaying(nowPlaying: RoomSummary['nowPlaying']): string {
  if (!nowPlaying) return 'Nenhum vídeo tocando';
  const title = nowPlaying.title ?? 'vídeo do YouTube';
  return `${nowPlaying.isPlaying ? 'Tocando' : 'Pausado'}: ${title}`;
}

function RoomCard({
  room,
  isOwner,
  onPress,
}: {
  room: RoomSummary;
  isOwner: boolean;
  onPress: () => void;
}) {
  const status = describeNowPlaying(room.nowPlaying);
  const playing = !!room.nowPlaying?.isPlaying;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir sala ${room.code}. ${status}. ${room.memberCount} de ${ROOM_CAPACITY} pessoas.`}
      className="gap-3.5 rounded-[18px] border border-border bg-surface p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <Text className="font-mono-bold text-lg tracking-[3px] text-text">{room.code}</Text>
          {isOwner ? (
            <View className="rounded-lg bg-primary/15 px-2 py-[3px]">
              <Text className="font-bold text-[11px] text-accent">Dono</Text>
            </View>
          ) : null}
        </View>
        <Icon name="chevron-right" size={18} color={Colors.muted} />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-2">
          <View className={`h-[7px] w-[7px] rounded-full ${playing ? 'bg-success' : 'bg-faint'}`} />
          <Text className="flex-1 font-sans text-[13px] text-muted" numberOfLines={1}>
            {status}
          </Text>
        </View>
        <View className="flex-row items-center">
          {room.members.map((member, index) => (
            <View key={member.userId} className={index > 0 ? '-ml-2' : ''}>
              <Avatar
                name={member.displayName}
                color={memberColor(index)}
                size={26}
                ringColor={Colors.surface}
              />
            </View>
          ))}
        </View>
        <Text className="font-semibold text-xs text-muted">
          {room.memberCount}/{ROOM_CAPACITY}
        </Text>
      </View>
    </Pressable>
  );
}
