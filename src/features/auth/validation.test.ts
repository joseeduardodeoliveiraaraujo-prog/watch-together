import {
  normalizeDisplayName,
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
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
