/** Mensagens para os códigos de erro da YouTube IFrame Player API. */
const MESSAGES: Record<number, string> = {
  2: 'Link ou ID de vídeo inválido.',
  5: 'Este vídeo não pode ser reproduzido no player HTML5.',
  100: 'Vídeo não encontrado (removido ou privado).',
  101: 'O dono do vídeo não permite reprodução fora do YouTube.',
  150: 'O dono do vídeo não permite reprodução fora do YouTube.',
  152: 'Origem do player inválida para o YouTube (erro 152).',
  153: 'O YouTube não identificou a origem do player (erro 153 — Referer ausente).',
};

export function describePlayerError(code: number): string {
  return MESSAGES[code] ?? `Erro desconhecido do player (código ${code}).`;
}

/** Erros em que o vídeo nunca vai tocar: a sala deve pular para o próximo item. */
export function isUnplayableError(code: number): boolean {
  return code === 100 || code === 101 || code === 150;
}
