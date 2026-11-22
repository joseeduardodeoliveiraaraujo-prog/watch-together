import { clampVolume, DEFAULT_VOLUME, parseSavedVolume, volumeIcon } from './volume';

describe('parseSavedVolume', () => {
  it('lê volume e mudo salvos', () => {
    expect(parseSavedVolume('{"volume":35,"muted":true}')).toEqual({ volume: 35, muted: true });
  });

  it('limita e arredonda o volume', () => {
    expect(parseSavedVolume('{"volume":140}')).toEqual({ volume: 100, muted: false });
    expect(parseSavedVolume('{"volume":-3}')).toEqual({ volume: 0, muted: false });
    expect(parseSavedVolume('{"volume":42.6}').volume).toBe(43);
  });

  it.each([null, '', 'não é json', 'null', '[1]', '{"volume":"alto"}'])(
    'valor inválido %p volta ao padrão',
    (raw) => {
      expect(parseSavedVolume(raw).volume).toBe(DEFAULT_VOLUME.volume);
    },
  );
});

describe('clampVolume', () => {
  it('trata números inválidos', () => {
    expect(clampVolume(Number.NaN)).toBe(100);
    expect(clampVolume(55.2)).toBe(55);
  });
});

describe('volumeIcon', () => {
  it('mudo, baixo e alto', () => {
    expect(volumeIcon({ volume: 80, muted: true })).toBe('volume-x');
    expect(volumeIcon({ volume: 0, muted: false })).toBe('volume-x');
    expect(volumeIcon({ volume: 30, muted: false })).toBe('volume-1');
    expect(volumeIcon({ volume: 80, muted: false })).toBe('volume-2');
  });
});
