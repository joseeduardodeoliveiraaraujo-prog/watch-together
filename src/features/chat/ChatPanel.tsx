import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

import { MAX_MESSAGE_LENGTH, type ChatEntry } from './chatMessages';

type ChatPanelProps = {
  entries: ChatEntry[];
  userId: string | null;
  error: string | null;
  onSend: (text: string) => Promise<boolean>;
  /** Cor de cada pessoa (nome e avatar). */
  colorOf?: (userId: string) => string;
};

const defaultColor = () => Colors.primary;

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Chat ao vivo: a lista é invertida (mais novas embaixo, junto do campo de texto). */
export function ChatPanel({
  entries,
  userId,
  error,
  onSend,
  colorOf = defaultColor,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const canSend = !!draft.trim();

  const submit = async () => {
    const text = draft;
    if (!text.trim()) return;
    setDraft('');
    const sent = await onSend(text);
    // Não enviou (anti-spam, rede): devolve o texto para tentar de novo.
    if (!sent) setDraft((current) => current || text);
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      {entries.length === 0 ? (
        // Fora da FlatList: a lista é invertida e o comportamento do componente vazio nesse modo
        // muda entre versões do React Native (já apareceu de cabeça para baixo).
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Icon name="message-circle" size={24} color={Colors.subtle} />
          <Text className="text-center font-sans text-[13px] leading-5 text-muted">
            Nenhuma mensagem ainda.{'\n'}As mensagens não ficam salvas: quem entrar depois não vê o
            que foi dito antes.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          inverted
          keyExtractor={(entry) => entry.id}
          contentContainerClassName="gap-2.5 px-4 py-2.5"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Entry
              entry={item}
              mine={item.kind === 'user' && item.userId === userId}
              colorOf={colorOf}
            />
          )}
        />
      )}

      {error ? <Text className="px-4 pb-1 font-sans text-sm text-danger">{error}</Text> : null}

      <View className="flex-row items-end gap-2.5 border-t border-border bg-background px-4 py-2.5">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Mensagem"
          placeholderTextColor={Colors.subtle}
          selectionColor={Colors.primary}
          maxLength={MAX_MESSAGE_LENGTH}
          multiline
          accessibilityLabel="Mensagem"
          className="max-h-28 min-h-[46px] flex-1 rounded-[23px] border border-border bg-surface px-[18px] py-3 font-sans text-[15px] text-text"
        />
        <Pressable
          onPress={submit}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityState={{ disabled: !canSend }}
          className={`h-[46px] w-[46px] items-center justify-center rounded-full bg-primary active:opacity-80 ${canSend ? '' : 'opacity-40'}`}
        >
          <Icon name="send" size={19} color={Colors['primary-foreground']} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Entry({
  entry,
  mine,
  colorOf,
}: {
  entry: ChatEntry;
  mine: boolean;
  colorOf: (userId: string) => string;
}) {
  if (entry.kind === 'system') {
    return (
      <Text className="px-6 py-0.5 text-center font-sans text-xs text-subtle">{entry.text}</Text>
    );
  }

  const time = entry.pending ? 'enviando…' : timeFormat.format(entry.sentAt);

  if (mine) {
    return (
      <View className={`max-w-[80%] self-end ${entry.pending ? 'opacity-60' : ''}`}>
        <View className="gap-0.5 rounded-[18px] rounded-br-[4px] bg-primary px-[13px] py-[9px]">
          <Text className="font-sans text-sm leading-5 text-primary-foreground" selectable>
            {entry.text}
          </Text>
          <Text className="self-end font-sans text-[10px] text-white/70">{time}</Text>
        </View>
      </View>
    );
  }

  const color = colorOf(entry.userId);
  return (
    <View className="max-w-[85%] flex-row items-end gap-2 self-start">
      <Avatar name={entry.displayName} color={color} size={28} />
      <View className="shrink gap-0.5 rounded-[18px] rounded-bl-[4px] bg-surface-raised px-[13px] py-[9px]">
        <Text className="font-bold text-xs" style={{ color }}>
          {entry.displayName}
        </Text>
        <Text className="font-sans text-sm leading-5 text-text" selectable>
          {entry.text}
        </Text>
        <Text className="self-end font-sans text-[10px] text-subtle">{time}</Text>
      </View>
    </View>
  );
}

export const OVERLAY_MS = 6000;

/** Em tela cheia: as últimas mensagens por cima do vídeo, só por alguns segundos. */
export function ChatOverlay({
  entries,
  userId,
  colorOf = defaultColor,
}: {
  entries: ChatEntry[];
  userId: string | null;
  colorOf?: (userId: string) => string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const newest = entries.find((e) => e.kind === 'user');
  const active = !!newest && now - newest.sentAt < OVERLAY_MS;

  // Relógio só enquanto há mensagem recente na tela (para ela sumir sozinha).
  useEffect(() => {
    if (!newest) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const stop = setTimeout(() => clearInterval(timer), OVERLAY_MS + 1000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [newest]);

  if (!active) return null;
  const visible = entries
    .filter((e) => e.kind === 'user' && now - e.sentAt < OVERLAY_MS)
    .slice(0, 3)
    .reverse();

  return (
    <View pointerEvents="none" className="absolute left-6 top-5 w-[300px] max-w-[45%] gap-1.5">
      {visible.map((e) => {
        if (e.kind !== 'user') return null;
        const mine = e.userId === userId;
        return (
          <View key={e.id} className="self-start rounded-[10px] bg-black/50 px-2.5 py-[5px]">
            <Text className="font-sans text-[13px] text-white">
              <Text
                className="font-bold"
                style={{ color: mine ? Colors.accent : colorOf(e.userId) }}
              >
                {mine ? 'Você' : e.displayName}:{' '}
              </Text>
              {e.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
