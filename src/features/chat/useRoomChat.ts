import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';

import { describeRpcError } from '@/lib/supabase/rpcErrors';

import { sendChatMessage } from './api';
import {
  addEntry,
  parseChatPayload,
  RATE_LIMIT_COUNT,
  recentSends,
  removeEntry,
  validateMessage,
  type ChatEntry,
} from './chatMessages';

type Me = { userId: string | null; displayName: string };

/** Estado do chat ao vivo da sala. Mensagens chegam pelo canal; avisos são locais. */
export function useRoomChat(roomId: string, me: Me) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sentTimesRef = useRef<number[]>([]);

  /** Mensagem vinda do canal (evento "chat"). */
  const receive = (payload: unknown) => {
    const message = parseChatPayload(payload);
    if (message) setEntries((list) => addEntry(list, message));
  };

  /** Aviso local, ex.: "Ana entrou". */
  const notice = (text: string) => {
    setEntries((list) =>
      addEntry(list, { kind: 'system', id: randomUUID(), text, sentAt: Date.now() }),
    );
  };

  /** Envia; devolve false se não deu para enviar (o texto fica no campo). */
  const send = async (text: string): Promise<boolean> => {
    const invalid = validateMessage(text);
    if (invalid) {
      setError(invalid);
      return false;
    }
    const now = Date.now();
    const recent = recentSends(sentTimesRef.current, now);
    if (recent.length >= RATE_LIMIT_COUNT || !me.userId) {
      setError(describeRpcError({ message: me.userId ? 'rate_limited' : 'not_authenticated' }));
      return false;
    }
    sentTimesRef.current = [...recent, now];
    setError(null);

    const clientId = randomUUID();
    const trimmed = text.trim();
    // Aparece na hora como "enviando"; a confirmação do canal substitui.
    setEntries((list) =>
      addEntry(list, {
        kind: 'user',
        id: clientId,
        clientId,
        userId: me.userId as string,
        displayName: me.displayName,
        text: trimmed,
        sentAt: now,
        pending: true,
      }),
    );
    try {
      await sendChatMessage(roomId, trimmed, clientId);
      return true;
    } catch (e) {
      setEntries((list) => removeEntry(list, clientId));
      setError(describeRpcError(e));
      return false;
    }
  };

  return { entries, error, receive, notice, send, clearError: () => setError(null) };
}
