import { CORRECTION_COOLDOWN_MS, decideSync, type LocalPlayer } from './decideSync';
import type { PlaybackSnapshot } from './playbackState';

const VIDEO = 'aqz-KE-bpKQ';
const playing: PlaybackSnapshot = {
  version: 1,
  videoId: VIDEO,
  isPlaying: true,
  position: 0,
  positionUpdatedAt: 0,
  updatedBy: null,
  lastCommandId: null,
};
const paused = { ...playing, isPlaying: false };
const local = (patch: Partial<LocalPlayer>): LocalPlayer => ({
  loadedVideoId: VIDEO,
  state: 'playing',
  currentTime: 30,
  duration: 600,
  ...patch,
});
const IDLE = CORRECTION_COOLDOWN_MS + 1;

describe('decideSync', () => {
  it('carrega o vídeo da sala no ponto certo', () => {
    expect(
      decideSync(playing, local({ loadedVideoId: null, state: 'unstarted' }), 42, IDLE),
    ).toEqual([{ type: 'load', videoId: VIDEO, startSeconds: 42, autoplay: true }]);
    expect(decideSync(paused, local({ loadedVideoId: 'outroVideo1' }), 7, IDLE)).toEqual([
      { type: 'load', videoId: VIDEO, startSeconds: 7, autoplay: false },
    ]);
  });

  it('tocando: ignora diferença pequena e corrige diferença grande', () => {
    expect(decideSync(playing, local({ currentTime: 30.4 }), 30, IDLE)).toEqual([]);
    expect(decideSync(playing, local({ currentTime: 31.2 }), 30, IDLE)).toEqual([]);
    expect(decideSync(playing, local({ currentTime: 32 }), 30, IDLE)).toEqual([
      { type: 'seek', seconds: 30 },
    ]);
  });

  it('sala tocando e player parado: dá play (e ajusta se precisar)', () => {
    expect(decideSync(playing, local({ state: 'paused', currentTime: 30.2 }), 30, IDLE)).toEqual([
      { type: 'play' },
    ]);
    expect(decideSync(playing, local({ state: 'paused', currentTime: 10 }), 30, IDLE)).toEqual([
      { type: 'seek', seconds: 30 },
      { type: 'play' },
    ]);
  });

  it('sala pausada: pausa e para no ponto exato', () => {
    expect(decideSync(paused, local({ currentTime: 30.2 }), 30, IDLE)).toEqual([{ type: 'pause' }]);
    expect(decideSync(paused, local({ currentTime: 33 }), 30, IDLE)).toEqual([
      { type: 'pause' },
      { type: 'seek', seconds: 30 },
    ]);
    expect(decideSync(paused, local({ state: 'paused', currentTime: 30.1 }), 30, IDLE)).toEqual([]);
  });

  it('não corrige durante buffering, logo após outra correção, ou com vídeo pronto parado', () => {
    expect(decideSync(playing, local({ state: 'buffering', currentTime: 0 }), 30, IDLE)).toEqual(
      [],
    );
    expect(decideSync(playing, local({ currentTime: 0 }), 30, 100)).toEqual([]);
    expect(decideSync(paused, local({ state: 'cued', currentTime: 0 }), 30, IDLE)).toEqual([]);
  });

  it('vídeo terminou: fica parado; posição esperada além do fim é limitada à duração', () => {
    expect(decideSync(playing, local({ state: 'ended', currentTime: 600 }), 620, IDLE)).toEqual([]);
    expect(decideSync(playing, local({ currentTime: 599.5 }), 700, IDLE)).toEqual([]);
  });

  it('sala sem vídeo: pausa se estiver tocando', () => {
    const empty = { ...paused, videoId: null };
    expect(decideSync(empty, local({}), 0, IDLE)).toEqual([{ type: 'pause' }]);
    expect(decideSync(empty, local({ state: 'paused' }), 0, IDLE)).toEqual([]);
  });
});
