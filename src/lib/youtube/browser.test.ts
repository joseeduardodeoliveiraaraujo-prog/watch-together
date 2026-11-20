import {
  BROWSER_SCRIPT,
  browserSearchUrl,
  isBrowserUrl,
  parseBrowserMessage,
  videoIdFromBrowserUrl,
} from './browser';

describe('isBrowserUrl', () => {
  it.each([
    'https://m.youtube.com/',
    'https://m.youtube.com/results?search_query=a',
    'https://www.youtube.com/@canal',
    'https://consent.youtube.com/m?continue=x',
  ])('permite %s', (url) => {
    expect(isBrowserUrl(url)).toBe(true);
  });

  it.each([
    'http://m.youtube.com/',
    'https://accounts.google.com/signin',
    'https://m.youtube.com.evil.com/',
    'https://evil.com/?u=https://m.youtube.com/',
    'intent://m.youtube.com/#Intent;end',
    'vnd.youtube:abc',
  ])('bloqueia %s', (url) => {
    expect(isBrowserUrl(url)).toBe(false);
  });
});

describe('videoIdFromBrowserUrl', () => {
  it.each([
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&pp=abc', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('%s → %s', (url, id) => {
    expect(videoIdFromBrowserUrl(url)).toBe(id);
  });

  it.each([
    'https://m.youtube.com/',
    'https://m.youtube.com/results?search_query=dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'http://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=curto',
  ])('não é vídeo: %s', (url) => {
    expect(videoIdFromBrowserUrl(url)).toBeNull();
  });
});

describe('parseBrowserMessage', () => {
  it('aceita videoLink e url', () => {
    const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(parseBrowserMessage(JSON.stringify({ type: 'videoLink', url }))).toEqual({
      type: 'videoLink',
      url,
    });
    expect(parseBrowserMessage(JSON.stringify({ type: 'url', url }))).toEqual({ type: 'url', url });
  });

  it.each([
    'não é json',
    '{"type":"videoLink"}',
    '{"type":"outro","url":"https://m.youtube.com/"}',
    '{"type":"url","url":"javascript:alert(1)"}',
    JSON.stringify({ type: 'url', url: `https://m.youtube.com/${'a'.repeat(3000)}` }),
  ])('rejeita %s', (raw) => {
    expect(parseBrowserMessage(raw)).toBeNull();
  });
});

describe('browserSearchUrl', () => {
  it('codifica a busca', () => {
    expect(browserSearchUrl('  lo-fi & chill ')).toBe(
      'https://m.youtube.com/results?search_query=lo-fi%20%26%20chill',
    );
  });
});

describe('BROWSER_SCRIPT', () => {
  it('é JavaScript válido', () => {
    expect(() => new Function(BROWSER_SCRIPT)).not.toThrow();
  });

  it('o padrão de link de vídeo do script reconhece os mesmos formatos', () => {
    const source = /var VIDEO_LINK = (\/.+\/i);/.exec(BROWSER_SCRIPT)?.[1];
    expect(source).toBeDefined();
    const pattern = new Function(`return ${source}`)() as RegExp;
    expect(pattern.test('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(pattern.test('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    expect(pattern.test('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(pattern.test('https://m.youtube.com/@canal')).toBe(false);
    expect(pattern.test('https://m.youtube.com/results?search_query=x')).toBe(false);
  });
});
