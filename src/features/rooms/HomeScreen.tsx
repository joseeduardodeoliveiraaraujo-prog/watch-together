import { useFocusEffect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useProfile } from '@/features/auth/useProfile';
import { useAsyncData } from '@/hooks/useAsyncData';

import { createRoom, joinRoom, listMyRooms, ROOM_CAPACITY, type RoomSummary } from './api';
import { normalizeRoomCode, validateRoomCode } from './roomCode';
import { describeRpcError } from '@/lib/supabase/rpcErrors';

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

  return (
    <FormScreen centered={false} topInset={false}>
      <View className="gap-1">
        <Text className="text-2xl font-bold text-text">
          {profile ? `Olá, ${profile.display_name}!` : 'Olá!'}
        </Text>
        <Text className="text-muted">Assista vídeos do YouTube junto com até 4 pessoas.</Text>
      </View>

      <Button
        title="Criar sala"
        onPress={handleCreate}
        loading={busy === 'create'}
        disabled={busy !== null}
      />

      <View className="gap-2 rounded-xl border border-border bg-surface p-3">
        <TextField
          label="Entrar com código"
          value={code}
          onChangeText={setCode}
          error={codeError}
          placeholder="Ex.: K7M2QX"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleJoin}
        />
        <Button
          title="Entrar na sala"
          variant="secondary"
          onPress={handleJoin}
          loading={busy === 'join'}
          disabled={busy !== null}
        />
      </View>

      {actionError ? <Text className="text-danger">{actionError}</Text> : null}

      <View className="gap-2">
        <Text className="text-lg font-semibold text-text">Suas salas</Text>
        <RoomList
          rooms={rooms.data}
          isFirstLoad={rooms.isFirstLoad}
          failed={!!rooms.error}
          userId={userId}
          onOpen={openRoom}
          onRetry={rooms.reload}
        />
      </View>

      <View className="mt-4 gap-2">
        <Button title="Perfil" variant="secondary" onPress={() => router.push('/profile')} />
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
        <Text className="text-danger">Não foi possível carregar suas salas.</Text>
        <Button title="Tentar de novo" variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <Text className="text-muted">
        Você ainda não está em nenhuma sala. Crie uma ou entre com um código.
      </Text>
    );
  }

  return (
    <View className="gap-2">
      {rooms.map((room) => (
        <Pressable
          key={room.id}
          onPress={() => onOpen(room.id)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir sala ${room.code}`}
          className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 active:opacity-80"
        >
          <View>
            <Text className="font-mono text-lg font-bold tracking-widest text-text">
              {room.code}
            </Text>
            {room.owner_id === userId ? (
              <Text className="text-xs text-primary">Você é o dono</Text>
            ) : null}
          </View>
          <Text className="text-muted">
            {room.memberCount}/{ROOM_CAPACITY} pessoas
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
