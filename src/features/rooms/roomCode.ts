/** Códigos de sala: 6 caracteres, sem os ambíguos 0/O e 1/I/L (igual ao banco). */

export const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{6}$/;

/**
 * Aceita o código digitado (com espaços, hífen, minúsculas) ou o link de convite inteiro.
 * Não usa a classe URL (incompleta no React Native).
 */
export function normalizeRoomCode(input: string): string {
  const trimmed = input.trim();
  const fromLink = /\/join\/([^/?#\s]+)/i.exec(trimmed);
  const raw = fromLink ? fromLink[1] : trimmed;
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_PATTERN.test(code);
}

export function validateRoomCode(input: string): string | null {
  const code = normalizeRoomCode(input);
  if (!code) return 'Digite o código da sala.';
  if (!isValidRoomCode(code)) return 'O código tem 6 letras e números, como K7M2QX.';
  return null;
}
