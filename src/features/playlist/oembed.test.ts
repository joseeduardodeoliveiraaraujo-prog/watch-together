import { fetchVideoInfo, oembedUrl, parseOembedResponse } from './oembed';

describe('parseOembedResponse', () => {
  it('lê o título e o canal', () => {
    expect(
      parseOembedResponse(200, { title: '  Big Buck Bunny  ', author_name: ' Blender ' }),
    ).toEqual({
      status: 'ok',
      title: 'Big Buck Bunny',
      author: 'Blender',
    });
    expect(parseOembedResponse(200, { title: 42 })).toEqual({
      status: 'ok',
      title: null,
      author: null,
    });
  });

  it('identifica vídeo bloqueado e inexistente', () => {
    expect(parseOembedResponse(401, null)).toEqual({ status: 'blocked' });
    expect(parseOembedResponse(403, null)).toEqual({ status: 'blocked' });
    expect(parseOembedResponse(404, null)).toEqual({ status: 'not_found' });
    expect(parseOembedResponse(400, null)).toEqual({ status: 'not_found' });
  });

  it('qualquer outra resposta é desconhecida', () => {
    expect(parseOembedResponse(500, null)).toEqual({ status: 'unknown' });
  });

  it('limita o título a 200 caracteres', () => {
    const info = parseOembedResponse(200, { title: 'a'.repeat(300) });
    expect(info.status === 'ok' && info.title?.length).toBe(200);
  });
});

describe('fetchVideoInfo', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('monta a URL do oEmbed', () => {
    expect(oembedUrl('aqz-KE-bpKQ')).toBe(
      'https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Daqz-KE-bpKQ',
    );
  });

  it('falha de rede vira "unknown" (não impede adicionar)', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchVideoInfo('aqz-KE-bpKQ')).resolves.toEqual({ status: 'unknown' });
  });

  it('usa a resposta do servidor', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ title: 'Oi' }) });
    await expect(fetchVideoInfo('aqz-KE-bpKQ')).resolves.toEqual({
      status: 'ok',
      title: 'Oi',
      author: null,
    });
  });
});
