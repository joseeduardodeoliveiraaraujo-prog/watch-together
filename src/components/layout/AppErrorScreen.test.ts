import { errorCode } from './AppErrorScreen';

describe('errorCode', () => {
  it('tipo e primeira linha da mensagem, limitada', () => {
    expect(errorCode(new TypeError('undefined is not a function\n  at x'))).toBe(
      'TypeError: undefined is not a function',
    );
    expect(errorCode(new Error('a'.repeat(200))).length).toBeLessThanOrEqual(87);
  });

  it('erro sem mensagem ou que não é Error', () => {
    expect(errorCode(new RangeError(''))).toBe('RangeError');
    expect(errorCode('texto solto')).toBe('erro desconhecido');
  });
});
