/** Mensagens em português para os erros das funções de sala (supabase/migrations). */
const MESSAGES: Record<string, string> = {
  room_not_found: 'Sala não encontrada. Confira o código e tente de novo.',
  room_full: 'Esta sala já está cheia (máximo de 4 pessoas).',
  too_many_rooms: 'Você já participa de 20 salas. Saia de alguma antes de entrar em outra.',
  not_authenticated: 'Sua sessão expirou. Entre novamente.',
};

export const ROOM_NETWORK_ERROR = 'Sem conexão com o servidor. Verifique sua internet.';
export const ROOM_GENERIC_ERROR = 'Algo deu errado. Tente novamente.';

type ErrorLike = { message?: unknown; code?: unknown };

export function describeRoomError(error: unknown): string {
  if (error && typeof error === 'object') {
    const { message } = error as ErrorLike;
    if (typeof message === 'string') {
      if (MESSAGES[message]) return MESSAGES[message];
      if (/network request failed|failed to fetch|fetch failed/i.test(message)) {
        return ROOM_NETWORK_ERROR;
      }
    }
  }
  return ROOM_GENERIC_ERROR;
}
