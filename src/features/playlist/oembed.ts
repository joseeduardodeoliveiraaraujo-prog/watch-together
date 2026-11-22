/**
 * Título do vídeo pelo oEmbed público do YouTube (sem chave de API).
 * O oEmbed também denuncia vídeos que não podem ser incorporados (401/403) ou que não existem.
 */
export type VideoInfo =
  | { status: 'ok'; title: string | null; author: string | null }
  | { status: 'blocked' }
  | { status: 'not_found' }
  /** Falha de rede ou resposta inesperada: deixa adicionar mesmo assim, sem título. */
  | { status: 'unknown' };

export function oembedUrl(videoId: string): string {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`;
}

export function parseOembedResponse(status: number, body: unknown): VideoInfo {
  if (status === 401 || status === 403) return { status: 'blocked' };
  if (status === 400 || status === 404) return { status: 'not_found' };
  if (status !== 200) return { status: 'unknown' };
  const title = readText(body, 'title');
  const author = readText(body, 'author_name');
  return { status: 'ok', title, author };
}

function readText(body: unknown, field: string): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as Record<string, unknown>)[field];
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, 200) || null;
}

export async function fetchVideoInfo(videoId: string, timeoutMs = 5000): Promise<VideoInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(oembedUrl(videoId), { signal: controller.signal });
    const body: unknown = response.ok ? await response.json().catch(() => null) : null;
    return parseOembedResponse(response.status, body);
  } catch {
    return { status: 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}

/** Miniatura pública do YouTube (320×180). */
export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
