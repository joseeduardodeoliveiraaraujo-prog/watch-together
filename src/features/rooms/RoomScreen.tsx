import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useAsyncData } from '@/hooks/useAsyncData';

import { fetchRoom, leaveRoom, ROOM_CAPACITY, type RoomDetails } from './api';
import { describeRoomError } from './roomErrors';
import { useRoomPresence, type PresenceStatus } from './useRoomPresence';

export function RoomScreen({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const room = useAsyncData(`room:${roomId}`, () => fetchRoom(roomId));
  // Alguém entrou ou saiu: recarrega a lista de membros (apelidos vêm do banco).
  const presence = useRoomPresence(roomId, userId, room.reload);
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
        text={describeRoomError(room.error)}
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
      setActionError(describeRoomError(error));
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

  return (
    <Screen padded={false} topInset={false}>
      <View className="aspect-video w-full items-center justify-center bg-surface">
        <Text className="text-muted">O player entra aqui na Etapa 5</Text>
      </View>

      <ScrollView contentContainerClassName="gap-4 p-4">
        <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface p-4">
          <View>
            <Text className="text-xs text-muted">Código da sala</Text>
            <Text className="font-mono text-2xl font-bold tracking-widest text-text">
              {details.code}
            </Text>
          </View>
          <Button title="Convidar" onPress={invite} />
        </View>

        <Participants details={details} userId={userId} presence={presence} />

        {actionError ? <Text className="text-danger">{actionError}</Text> : null}

        <Button title="Sair da sala" variant="danger" onPress={confirmLeave} loading={leaving} />
      </ScrollView>
    </Screen>
  );
}

type ParticipantsProps = {
  details: RoomDetails;
  userId: string | null;
  presence: { onlineIds: ReadonlySet<string>; status: PresenceStatus };
};

function Participants({ details, userId, presence }: ParticipantsProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-text">
          Participantes ({details.members.length}/{ROOM_CAPACITY})
        </Text>
        {presence.status !== 'online' ? (
          <Text className="text-xs text-muted">
            {presence.status === 'connecting' ? 'Conectando…' : 'Reconectando…'}
          </Text>
        ) : null}
      </View>

      {details.members.map((member) => {
        const online = presence.onlineIds.has(member.userId);
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
