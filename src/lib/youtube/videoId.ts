const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/** Prefixos de caminho em que o ID vem logo em seguida: /embed/ID, /shorts/ID, /live/ID, /v/ID. */
const PATH_PREFIXES = ['embed', 'shorts', 'live', 'v'];

/**
 * scheme opcional, host, path opcional, query opcional, hash opcional.
 * Não usamos `URL`: a implementação do React Native é incompleta (hostname/searchParams).
 */
const URL_PATTERN = /^(?:https?:\/\/)?([^/?#]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i;

export function isValidVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

function getQueryParam(query: string | undefined, name: string): string | null {
  if (!query) return null;
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key === name) return value;
  }
  return null;
}

/**
 * Extrai o ID (11 caracteres) de um link do YouTube ou de um ID puro.
 * Retorna `null` para entradas inválidas ou de outros domínios.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (isValidVideoId(value)) return value;

  const match = URL_PATTERN.exec(value);
  if (!match) return null;

  const [, rawHost, path = '', query] = match;
  const host = rawHost.toLowerCase();
  const segments = path.split('/').filter(Boolean);

  let candidate: string | null | undefined = null;
  if (host === 'youtu.be') {
    candidate = segments[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (segments[0] === 'watch') {
      candidate = getQueryParam(query, 'v');
    } else if (segments.length >= 2 && PATH_PREFIXES.includes(segments[0])) {
      candidate = segments[1];
    }
  }

  return candidate && isValidVideoId(candidate) ? candidate : null;
}
