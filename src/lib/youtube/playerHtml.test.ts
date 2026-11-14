import { PLAYER_HTML } from './playerHtml';

// A sincronia com web/player/index.html é verificada por `npm run check:player` (script Node).

describe('PLAYER_HTML', () => {
  it('expõe a ponte esperada pelo app', () => {
    expect(PLAYER_HTML).toContain('window.__wt');
    expect(PLAYER_HTML).toContain('window.ReactNativeWebView.postMessage');
    expect(PLAYER_HTML).toContain('https://www.youtube.com/iframe_api');
  });

  it('mantém o Referer necessário para o YouTube identificar a origem', () => {
    expect(PLAYER_HTML).toContain('content="strict-origin-when-cross-origin"');
    expect(PLAYER_HTML).toContain('playerVars.origin = window.location.origin');
  });
});
