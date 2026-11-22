import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import { describeRpcError } from '@/lib/supabase/rpcErrors';

import { leaveRoom, ROOM_CAPACITY, type RoomDetails } from './api';
import { memberColor } from './memberColors';

type RoomInfoPanelProps = {
  details: RoomDetails;
  userId: string | null;
  onlineIds: ReadonlySet<string>;
  onInvite: () => void;
};

/** Aba "Sala": código (copiar/convidar), participantes e sair da sala. */
export function RoomInfoPanel({ details, userId, onlineIds, onInvite }: RoomInfoPanelProps) {
  const router = useRouter();
  const dialog = useDialog();
  const [leaving, setLeaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const copyCode = async () => {
    await Clipboard.setStringAsync(details.code);
    dialog.toast({ message: `Código ${details.code} copiado`, icon: 'copy' });
  };

  return (
    <ScrollView contentContainerClassName="gap-[22px] px-4 pb-7 pt-4">
      <View className="flex-row items-center justify-between rounded-[18px] border border-border bg-surface p-4">
        <View className="gap-1">
          <Text className="font-sans text-xs text-muted">Código da sala</Text>
          <Text className="font-mono-bold text-2xl tracking-[4px] text-text">{details.code}</Text>
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
            onPress={onInvite}
            accessibilityRole="button"
            accessibilityLabel="Convidar"
            className="h-[42px] flex-row items-center gap-1.5 rounded-xl bg-primary px-3.5 active:opacity-80"
          >
            <Icon name="share-2" size={16} color={Colors['primary-foreground']} />
            <Text className="font-bold text-sm text-primary-foreground">Convidar</Text>
          </Pressable>
        </View>
      </View>

      <Participants details={details} userId={userId} onlineIds={onlineIds} />

      {actionError ? <Text className="font-sans text-danger">{actionError}</Text> : null}

      <Button
        title="Sair da sala"
        icon="log-out"
        variant="danger"
        onPress={confirmLeave}
        loading={leaving}
      />
    </ScrollView>
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
