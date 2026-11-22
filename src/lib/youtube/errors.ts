/**
 * Problemas do player mostrados sobre o vídeo: título e mensagem para gente, código para suporte
 * e quais ações oferecer. Desenho: prancha "Erros e carregamento" no design/watch-together.pen.
 */

export type PlayerAction = 'skip' | 'openYouTube' | 'retry';

export type PlayerIssue = {
  title: string;
  message: string;
  /** Mostrado pequeno embaixo ("código 150"), para saber o que houve quando alguém reclamar. */
  code: string;
  /** `danger`: o vídeo não vai tocar. `connection`: costuma se resolver tentando de novo. */
  tone: 'danger' | 'connection';
  actions: PlayerAction[];
};

/** Código interno: o script da IFrame API do YouTube não carregou. */
export const API_LOAD_ERROR_CODE = -1;

const NOT_ALLOWED: Omit<PlayerIssue, 'code'> = {
  title: 'Este vídeo não pode tocar aqui',
  message: 'O dono do vídeo não permite que ele toque fora do YouTube.',
  tone: 'danger',
  actions: ['skip', 'openYouTube'],
};

const BY_CODE: Record<number, Omit<PlayerIssue, 'code'>> = {
  [API_LOAD_ERROR_CODE]: {
    title: 'Não foi possível carregar o player',
    message: 'Verifique sua internet e tente de novo.',
    tone: 'connection',
    actions: ['retry'],
  },
  2: {
    title: 'Link de vídeo inválido',
    message: 'O link deste vídeo não funciona. Tente outro vídeo.',
    tone: 'danger',
    actions: ['skip'],
  },
  5: {
    title: 'Este vídeo não toca no app',
    message: 'O player não conseguiu reproduzir este vídeo.',
    tone: 'danger',
    actions: ['skip', 'openYouTube'],
  },
  100: {
    title: 'Vídeo não encontrado',
    message: 'Ele foi removido ou é privado.',
    tone: 'danger',
    actions: ['skip'],
  },
  101: NOT_ALLOWED,
  150: NOT_ALLOWED,
  152: {
    title: 'O YouTube recusou o player',
    message: 'Tente de novo em instantes.',
    tone: 'connection',
    actions: ['retry'],
  },
  153: {
    title: 'O YouTube recusou o player',
    message: 'Tente de novo em instantes.',
    tone: 'connection',
    actions: ['retry'],
  },
};

/** Erro informado pela IFrame API do YouTube (ou `API_LOAD_ERROR_CODE`). */
export function playerErrorIssue(code: number): PlayerIssue {
  const known = BY_CODE[code];
  const label = code === API_LOAD_ERROR_CODE ? 'youtube_api_load_failed' : String(code);
  return known
    ? { ...known, code: label }
    : {
        title: 'Problema na reprodução',
        message: 'Algo deu errado com este vídeo. Tente de novo.',
        code: label,
        tone: 'connection',
        actions: ['retry'],
      };
}

/**
 * A página do player (Vercel) não carregou: sem internet (`detail` = descrição da WebView) ou
 * resposta de erro do servidor (`httpStatus`).
 */
export function pageLoadIssue(httpStatus?: number): PlayerIssue {
  return {
    title: 'Não foi possível carregar o player',
    message:
      httpStatus && httpStatus >= 500
        ? 'O servidor do player está com problemas. Tente de novo em instantes.'
        : 'Verifique sua internet e tente de novo.',
    code: httpStatus ? `player_http_${httpStatus}` : 'player_load_failed',
    tone: 'connection',
    actions: ['retry'],
  };
}

/** Texto curto (linha de status): título do problema. */
export function describePlayerError(code: number): string {
  return playerErrorIssue(code).title;
}

/** Erros em que o vídeo nunca vai tocar: a sala deve pular para o próximo item. */
export function isUnplayableError(code: number): boolean {
  return code === 100 || code === 101 || code === 150;
}
