import { API_LOAD_ERROR_CODE, isUnplayableError, pageLoadIssue, playerErrorIssue } from './errors';

describe('playerErrorIssue', () => {
  it('vídeo proibido fora do YouTube: pular ou abrir no YouTube', () => {
    for (const code of [101, 150]) {
      expect(playerErrorIssue(code)).toMatchObject({
        title: 'Este vídeo não pode tocar aqui',
        code: String(code),
        tone: 'danger',
        actions: ['skip', 'openYouTube'],
      });
    }
  });

  it('script do YouTube que não carregou vira problema de conexão, com código legível', () => {
    expect(playerErrorIssue(API_LOAD_ERROR_CODE)).toMatchObject({
      code: 'youtube_api_load_failed',
      tone: 'connection',
      actions: ['retry'],
    });
  });

  it('código desconhecido: mensagem genérica, tentar de novo e o número', () => {
    expect(playerErrorIssue(999)).toMatchObject({
      title: 'Problema na reprodução',
      code: '999',
      actions: ['retry'],
    });
  });

  it('nenhuma mensagem fala em termos técnicos', () => {
    for (const code of [API_LOAD_ERROR_CODE, 2, 5, 100, 101, 150, 152, 153, 999]) {
      const { title, message } = playerErrorIssue(code);
      expect(`${title} ${message}`).not.toMatch(/referer|html5|iframe|c[óo]digo/i);
    }
  });
});

describe('pageLoadIssue', () => {
  it('sem resposta do servidor: verifique a internet', () => {
    expect(pageLoadIssue()).toMatchObject({ code: 'player_load_failed', actions: ['retry'] });
    expect(pageLoadIssue().message).toMatch(/internet/);
  });

  it('erro do servidor: código com o status', () => {
    expect(pageLoadIssue(503)).toMatchObject({ code: 'player_http_503' });
    expect(pageLoadIssue(503).message).toMatch(/servidor/);
    expect(pageLoadIssue(404).message).toMatch(/internet/);
  });
});

describe('isUnplayableError', () => {
  it('só removido/privado e proibido', () => {
    expect([100, 101, 150].every(isUnplayableError)).toBe(true);
    expect([2, 5, 152, 153, API_LOAD_ERROR_CODE].some(isUnplayableError)).toBe(false);
  });
});
