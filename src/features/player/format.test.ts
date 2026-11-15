import { formatTime } from './format';

describe('formatTime', () => {
  it('formata minutos e horas', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75.9)).toBe('1:15');
    expect(formatTime(3725)).toBe('1:02:05');
  });

  it('trata valores inválidos como zero', () => {
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });
});
