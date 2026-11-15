/** Validação dos formulários de conta. Retorna a mensagem de erro ou null. */

export const DISPLAY_NAME_MAX = 30;
export const PASSWORD_MIN = 8;

// Validação simples de formato; o Supabase faz a validação definitiva.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateEmail(email: string): string | null {
  const value = normalizeEmail(email);
  if (!value) return 'Informe seu e-mail.';
  if (!EMAIL_PATTERN.test(value)) return 'E-mail inválido.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Informe sua senha.';
  if (password.length < PASSWORD_MIN)
    return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  return null;
}

export function validateDisplayName(name: string): string | null {
  const value = normalizeDisplayName(name);
  if (!value) return 'Informe um apelido.';
  if (value.length > DISPLAY_NAME_MAX)
    return `O apelido pode ter no máximo ${DISPLAY_NAME_MAX} caracteres.`;
  return null;
}
