import { isValidRoomCode, normalizeRoomCode, validateRoomCode } from './roomCode';

describe('normalizeRoomCode', () => {
  it('limpa espaços, hífen e minúsculas', () => {
    expect(normalizeRoomCode(' k7m-2qx ')).toBe('K7M2QX');
    expect(normalizeRoomCode('K7M 2QX')).toBe('K7M2QX');
  });

  it('extrai o código de links de convite', () => {
    expect(normalizeRoomCode('watchtogether://join/K7M2QX')).toBe('K7M2QX');
    expect(normalizeRoomCode('exp://192.168.0.10:8081/--/join/k7m2qx?x=1')).toBe('K7M2QX');
    expect(normalizeRoomCode('Entre na sala!\nwatchtogether://join/K7M2QX')).toBe('K7M2QX');
  });
});

describe('validateRoomCode', () => {
  it('aceita códigos válidos', () => {
    expect(isValidRoomCode('K7M2QX')).toBe(true);
    expect(validateRoomCode('k7m2qx')).toBeNull();
  });

  it('recusa vazio, tamanho errado e caracteres ambíguos', () => {
    expect(validateRoomCode('  ')).toBe('Digite o código da sala.');
    expect(validateRoomCode('K7M2Q')).toMatch(/6 letras/);
    expect(validateRoomCode('K7M2QXA')).toMatch(/6 letras/);
    expect(validateRoomCode('O0I1L2')).toMatch(/6 letras/);
  });
});
