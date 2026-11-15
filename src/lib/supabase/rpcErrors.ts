/** Mensagens em português para os erros das funções do banco (RPC; ver supabase/migrations). */
const MESSAGES: Record<string, string> = {
  room_not_found: 'Sala não encontrada. Confira o código e tente de novo.',
  room_full: 'Esta sala já está cheia (máximo de 4 pessoas).',
  too_many_rooms: 'Você já participa de 20 salas. Saia de alguma antes de entrar em outra.',
  not_authenticated: 'Sua sessão expirou. Entre novamente.',
  not_member: 'Você não participa mais desta sala.',
  no_video: 'Coloque um vídeo antes de dar play.',
  invalid_video: 'Link do YouTube inválido.',
  playlist_full: 'A fila já tem 50 vídeos. Remova algum antes de adicionar.',
  item_not_found: 'Este vídeo não está mais na fila.',
  invalid_message: 'A mensagem precisa ter entre 1 e 500 caracteres.',
  rate_limited: 'Calma! Espere alguns segundos antes de mandar mais mensagens.',
};

export const RPC_NETWORK_ERROR = 'Sem conexão com o servidor. Verifique sua internet.';
export const RPC_GENERIC_ERROR = 'Algo deu errado. Tente novamente.';

type ErrorLike = { message?: unknown; code?: unknown };

export function describeRpcError(error: unknown): string {
  if (error && typeof error === 'object') {
    const { message } = error as ErrorLike;
    if (typeof message === 'string') {
      if (MESSAGES[message]) return MESSAGES[message];
      if (/network request failed|failed to fetch|fetch failed/i.test(message)) {
        return RPC_NETWORK_ERROR;
      }
    }
  }
  return RPC_GENERIC_ERROR;
}
