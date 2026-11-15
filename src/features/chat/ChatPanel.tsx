import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';

import { MAX_MESSAGE_LENGTH, type ChatEntry } from './chatMessages';

type ChatPanelProps = {
  entries: ChatEntry[];
  userId: string | null;
  error: string | null;
  onSend: (text: string) => Promise<boolean>;
};

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Chat ao vivo: a lista é invertida (mais novas embaixo, junto do campo de texto). */
export function ChatPanel({ entries, userId, error, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');

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
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-muted">
            Nenhuma mensagem ainda.{'\n'}As mensagens não ficam salvas: quem entrar depois não vê o
            que foi dito antes.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          inverted
          keyExtractor={(entry) => entry.id}
          contentContainerClassName="gap-2 px-4 py-3"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Entry entry={item} mine={item.kind === 'user' && item.userId === userId} />
          )}
        />
      )}

      {error ? <Text className="px-4 pb-1 text-sm text-danger">{error}</Text> : null}

      <View className="flex-row items-end gap-2 border-t border-border bg-surface px-3 py-2">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Mensagem"
          placeholderTextColor={Colors.muted}
          maxLength={MAX_MESSAGE_LENGTH}
          multiline
          accessibilityLabel="Mensagem"
          className="max-h-24 min-h-10 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-base text-text"
        />
        <Pressable
          onPress={submit}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          className={`h-10 items-center justify-center rounded-xl bg-primary px-4 active:opacity-80 ${draft.trim() ? '' : 'opacity-40'}`}
        >
          <Text className="font-semibold text-primary-foreground">Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Entry({ entry, mine }: { entry: ChatEntry; mine: boolean }) {
  if (entry.kind === 'system') {
    return <Text className="text-center text-xs text-muted">{entry.text}</Text>;
  }
  return (
    <View
      className={`max-w-[85%] gap-0.5 rounded-2xl px-3 py-2 ${mine ? 'self-end bg-primary/30' : 'self-start bg-surface-raised'} ${entry.pending ? 'opacity-60' : ''}`}
    >
      {mine ? null : (
        <Text className="text-xs font-semibold text-primary">{entry.displayName}</Text>
      )}
      <Text className="text-base text-text" selectable>
        {entry.text}
      </Text>
      <Text className="self-end text-[10px] text-muted">
        {entry.pending ? 'enviando…' : timeFormat.format(entry.sentAt)}
      </Text>
    </View>
  );
}

export const OVERLAY_MS = 6000;

/** Em tela cheia: as últimas mensagens por cima do vídeo, só por alguns segundos. */
export function ChatOverlay({ entries }: { entries: ChatEntry[] }) {
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
    <View pointerEvents="none" className="absolute left-3 top-3 max-w-[50%] gap-1">
      {visible.map((e) =>
        e.kind === 'user' ? (
          <Text key={e.id} className="rounded-lg bg-black/60 px-2 py-1 text-sm text-text">
            <Text className="font-semibold text-primary">{e.displayName}: </Text>
            {e.text}
          </Text>
        ) : null,
      )}
    </View>
  );
}
