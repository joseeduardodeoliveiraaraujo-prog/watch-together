import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { describeAuthError, GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE } from './authErrors';

describe('describeAuthError', () => {
  it('traduz códigos conhecidos', () => {
    expect(describeAuthError(new AuthApiError('Invalid login', 400, 'invalid_credentials'))).toBe(
      'E-mail ou senha incorretos.',
    );
    expect(describeAuthError(new AuthApiError('exists', 422, 'user_already_exists'))).toMatch(
      /Já existe uma conta/,
    );
  });

  it('reconhece falha de rede', () => {
    expect(describeAuthError(new AuthRetryableFetchError('Failed to fetch', 0))).toBe(
      NETWORK_ERROR_MESSAGE,
    );
    expect(describeAuthError(new TypeError('Network request failed'))).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('usa mensagem genérica para o resto', () => {
    expect(describeAuthError(new AuthApiError('???', 500, 'unexpected_failure'))).toBe(
      GENERIC_ERROR_MESSAGE,
    );
    expect(describeAuthError('qualquer coisa')).toBe(GENERIC_ERROR_MESSAGE);
  });
});
