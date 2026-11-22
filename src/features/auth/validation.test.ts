import {
  normalizeDisplayName,
  normalizeEmail,
  normalizeRecoveryCode,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validatePassword,
  validateRecoveryCode,
} from './validation';

describe('validateEmail', () => {
  it('aceita e-mail válido com espaços e maiúsculas', () => {
    expect(validateEmail('  Ana@Exemplo.com ')).toBeNull();
    expect(normalizeEmail('  Ana@Exemplo.com ')).toBe('ana@exemplo.com');
  });

  it('recusa vazio e formato inválido', () => {
    expect(validateEmail('   ')).toBe('Informe seu e-mail.');
    expect(validateEmail('ana@')).toBe('E-mail inválido.');
    expect(validateEmail('ana exemplo.com')).toBe('E-mail inválido.');
  });
});

describe('validatePassword', () => {
  it('exige pelo menos 8 caracteres', () => {
    expect(validatePassword('')).toBe('Informe sua senha.');
    expect(validatePassword('1234567')).toMatch(/pelo menos 8/);
    expect(validatePassword('12345678')).toBeNull();
  });
});

describe('validateNewPassword', () => {
  it('valida a senha e depois a confirmação', () => {
    expect(validateNewPassword('123', '123')).toEqual({
      password: expect.stringMatching(/pelo menos 8/),
      confirmation: null,
    });
    expect(validateNewPassword('12345678', '1234567x')).toEqual({
      password: null,
      confirmation: 'As senhas não conferem.',
    });
    expect(validateNewPassword('12345678', '12345678')).toEqual({
      password: null,
      confirmation: null,
    });
  });
});

describe('validateRecoveryCode', () => {
  it('aceita 6 a 8 dígitos, ignorando espaços e traços', () => {
    expect(normalizeRecoveryCode(' 123-456 ')).toBe('123456');
    expect(validateRecoveryCode('123 456')).toBeNull();
    expect(validateRecoveryCode('12345678')).toBeNull();
  });

  it('recusa vazio e tamanho errado', () => {
    expect(validateRecoveryCode('')).toMatch(/Informe o código/);
    expect(validateRecoveryCode('12345')).toBe('Código incompleto. Confira o e-mail.');
    expect(validateRecoveryCode('123456789')).toBe('Código incompleto. Confira o e-mail.');
  });
});

describe('validateDisplayName', () => {
  it('normaliza espaços', () => {
    expect(normalizeDisplayName('  Ana   Maria ')).toBe('Ana Maria');
  });

  it('recusa vazio e mais de 30 caracteres', () => {
    expect(validateDisplayName('   ')).toBe('Informe um apelido.');
    expect(validateDisplayName('a'.repeat(31))).toMatch(/no máximo 30/);
    expect(validateDisplayName('a'.repeat(30))).toBeNull();
  });
});
