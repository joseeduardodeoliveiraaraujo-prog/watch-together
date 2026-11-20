import { commandToScript, parsePlayerEvent, playerStateFromCode } from './bridge';

describe('playerStateFromCode', () => {
  it.each([
    [-1, 'unstarted'],
    [0, 'ended'],
    [1, 'playing'],
    [2, 'paused'],
    [3, 'buffering'],
    [5, 'cued'],
  ])('mapeia %d → %s', (code, state) => {
    expect(playerStateFromCode(code)).toBe(state);
  });

  it.each([[4], [99], ['1'], [null], [undefined]])('rejeita %p', (code) => {
    expect(playerStateFromCode(code)).toBeNull();
  });
});

describe('parsePlayerEvent', () => {
  it('aceita ready', () => {
    expect(parsePlayerEvent('{"type":"ready"}')).toEqual({ type: 'ready' });
  });

  it('aceita status completo', () => {
    const raw = JSON.stringify({
      type: 'status',
      state: 1,
      currentTime: 12.5,
      duration: 200,
      muted: false,
      at: 1000,
    });
    expect(parsePlayerEvent(raw)).toEqual({
      type: 'status',
      state: 'playing',
      currentTime: 12.5,
      duration: 200,
      muted: false,
      at: 1000,
    });
  });

  it('aceita stateChange', () => {
    const raw = JSON.stringify({ type: 'stateChange', state: 2, currentTime: 3, at: 5 });
    expect(parsePlayerEvent(raw)).toEqual({
      type: 'stateChange',
      state: 'paused',
      currentTime: 3,
      at: 5,
    });
  });

  it('aceita error com código numérico', () => {
    expect(parsePlayerEvent('{"type":"error","code":150}')).toEqual({ type: 'error', code: 150 });
  });

  it('aceita captions com tradução e descarta itens inválidos', () => {
    const raw = JSON.stringify({
      type: 'captions',
      tracks: [
        { id: 'a.en', label: 'English (auto-generated)', auto: true },
        { id: 'pt', label: '' },
        { label: 'sem id' },
        null,
      ],
      translations: [{ code: 'pt', label: 'Português' }, { label: 'sem código' }],
      active: { id: 'a.en', translateTo: 'pt' },
    });
    expect(parsePlayerEvent(raw)).toEqual({
      type: 'captions',
      tracks: [
        { id: 'a.en', label: 'English (auto-generated)', auto: true },
        { id: 'pt', label: 'pt', auto: false },
      ],
      translations: [{ code: 'pt', label: 'Português' }],
      active: { id: 'a.en', translateTo: 'pt' },
    });
  });

  it('captions: faixa ativa fora da lista vira desligada; tradução desconhecida é ignorada', () => {
    const off = JSON.stringify({ type: 'captions', tracks: [], active: { id: 'en' } });
    expect(parsePlayerEvent(off)).toEqual({
      type: 'captions',
      tracks: [],
      translations: [],
      active: null,
    });
    const unknown = JSON.stringify({
      type: 'captions',
      tracks: [{ id: 'en', label: 'English' }],
      active: { id: 'en', translateTo: 'xx' },
    });
    expect(parsePlayerEvent(unknown)).toMatchObject({ active: { id: 'en', translateTo: null } });
  });

  it('trunca logs longos', () => {
    const event = parsePlayerEvent(JSON.stringify({ type: 'log', message: 'x'.repeat(2000) }));
    expect(event?.type === 'log' && event.message.length).toBe(500);
  });

  it.each([
    ['não é json'],
    ['null'],
    ['42'],
    ['{"type":"desconhecido"}'],
    ['{"type":"status","state":1,"currentTime":"10","duration":1,"at":1}'],
    ['{"type":"status","state":7,"currentTime":1,"duration":1,"at":1}'],
    ['{"type":"stateChange","state":1,"currentTime":null,"at":1}'],
    ['{"type":"error","code":"150"}'],
    ['{"type":"log","message":{}}'],
  ])('rejeita %s', (raw) => {
    expect(parsePlayerEvent(raw)).toBeNull();
  });
});

describe('commandToScript', () => {
  it('gera chamada segura para window.__wt.handle', () => {
    expect(commandToScript({ type: 'seek', seconds: 42 })).toBe(
      'window.__wt && window.__wt.handle({"type":"seek","seconds":42}); true;',
    );
  });

  it('escapa conteúdo como JSON', () => {
    const script = commandToScript({ type: 'load', videoId: '"); alert(1); ("', autoplay: true });
    expect(script).toContain('\\"); alert(1); (\\"');
  });
});
