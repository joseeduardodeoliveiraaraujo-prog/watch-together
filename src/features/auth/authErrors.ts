import { isAuthError } from '@supabase/supabase-js';

/** Mensagens em português para os códigos de erro do Supabase Auth. */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  email_exists: 'Já existe uma conta com este e-mail.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.',
  email_address_invalid: 'E-mail inválido.',
  validation_failed: 'Confira os dados informados.',
  signup_disabled: 'Novos cadastros estão desativados no momento.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.',
  user_banned: 'Esta conta está bloqueada.',
  session_expired: 'Sua sessão expirou. Entre novamente.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  same_password: 'A nova senha precisa ser diferente da atual.',
};

export const NETWORK_ERROR_MESSAGE = 'Sem conexão com o servidor. Verifique sua internet.';
export const GENERIC_ERROR_MESSAGE = 'Algo deu errado. Tente novamente.';

export function describeAuthError(error: unknown): string {
  if (isAuthError(error)) {
    if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
    // AuthRetryableFetchError (sem resposta do servidor) chega com status 0.
    if (error.status === 0 || error.name === 'AuthRetryableFetchError')
      return NETWORK_ERROR_MESSAGE;
  }
  if (error instanceof TypeError && /network/i.test(error.message)) return NETWORK_ERROR_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
}
