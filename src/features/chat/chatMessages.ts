/** Mensagens do chat ao vivo (nada é salvo: a lista só existe enquanto a sala está aberta). */

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_MESSAGES_KEPT = 100;
/** Igual ao limite do servidor (send_chat_message). */
export const RATE_LIMIT_COUNT = 5;
export const RATE_LIMIT_WINDOW_MS = 5000;

export type UserMessage = {
  kind: 'user';
  /** id do servidor, ou o client_id enquanto a mensagem ainda está sendo enviada. */
  id: string;
  clientId: string | null;
  userId: string;
  displayName: string;
  text: string;
  sentAt: number;
  pending: boolean;
};

export type SystemNotice = { kind: 'system'; id: string; text: string; sentAt: number };

export type ChatEntry = UserMessage | SystemNotice;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida a mensagem recebida pelo canal (vem como JSON genérico). */
export function parseChatPayload(payload: unknown): UserMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.id !== 'string' || !UUID.test(p.id)) return null;
  if (typeof p.user_id !== 'string' || !UUID.test(p.user_id)) return null;
  if (typeof p.text !== 'string' || p.text.trim().length === 0) return null;
  const sentAt = typeof p.sent_at === 'string' ? Date.parse(p.sent_at) : NaN;
  return {
    kind: 'user',
    id: p.id,
    clientId: typeof p.client_id === 'string' ? p.client_id : null,
    userId: p.user_id,
    displayName:
      typeof p.display_name === 'string' && p.display_name.trim()
        ? p.display_name.trim().slice(0, 30)
        : 'Participante',
    text: p.text.slice(0, MAX_MESSAGE_LENGTH),
    sentAt: Number.isFinite(sentAt) ? sentAt : Date.now(),
    pending: false,
  };
}

/**
 * Acrescenta uma entrada (mais nova primeiro, para lista invertida). Ignora duplicadas e,
 * quando chega a confirmação do servidor, substitui a versão "enviando" (mesmo client_id).
 */
export function addEntry(list: readonly ChatEntry[], entry: ChatEntry): ChatEntry[] {
  if (list.some((e) => e.id === entry.id)) return [...list];
  if (entry.kind === 'user' && entry.clientId) {
    const pendingIndex = list.findIndex(
      (e) => e.kind === 'user' && e.pending && e.clientId === entry.clientId,
    );
    if (pendingIndex >= 0) {
      const next = [...list];
      next[pendingIndex] = entry;
      return next;
    }
  }
  return [entry, ...list].slice(0, MAX_MESSAGES_KEPT);
}

export function removeEntry(list: readonly ChatEntry[], id: string): ChatEntry[] {
  return list.filter((e) => e.id !== id);
}

/** Envios recentes ainda dentro da janela do anti-spam. */
export function recentSends(sentTimes: readonly number[], now: number): number[] {
  return sentTimes.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
}

export function validateMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Digite uma mensagem.';
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `A mensagem pode ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`;
  }
  return null;
}
