import {
  expectedPosition,
  isNewer,
  parsePlaybackRow,
  type PlaybackSnapshot,
} from './playbackState';

const row = {
  room_id: 'r1',
  version: 3,
  video_id: 'aqz-KE-bpKQ',
  is_playing: true,
  position_seconds: 10,
  position_updated_at: '2026-11-15T12:00:00.000+00:00',
  updated_by: 'u1',
  last_command_id: 'c1',
  current_item_id: 'i1',
  last_action: 'play_item',
};

describe('parsePlaybackRow', () => {
  it('converte uma linha válida', () => {
    expect(parsePlaybackRow(row)).toEqual({
      version: 3,
      videoId: 'aqz-KE-bpKQ',
      currentItemId: 'i1',
      lastAction: 'play_item',
      isPlaying: true,
      position: 10,
      positionUpdatedAt: Date.parse('2026-11-15T12:00:00Z'),
      updatedBy: 'u1',
      lastCommandId: 'c1',
    });
  });

  it('recusa lixo e campos inválidos', () => {
    expect(parsePlaybackRow(null)).toBeNull();
    expect(parsePlaybackRow({ ...row, version: 'x' })).toBeNull();
    expect(parsePlaybackRow({ ...row, position_updated_at: 'ontem' })).toBeNull();
    expect(parsePlaybackRow({ ...row, is_playing: 'true' })).toBeNull();
  });

  it('ação desconhecida vira "none"', () => {
    expect(parsePlaybackRow({ ...row, last_action: 'hackear' })?.lastAction).toBe('none');
  });

  it('sem vídeo válido nunca está tocando', () => {
    const parsed = parsePlaybackRow({ ...row, video_id: '<script>' });
    expect(parsed?.videoId).toBeNull();
    expect(parsed?.isPlaying).toBe(false);
  });
});

describe('expectedPosition', () => {
  const base = parsePlaybackRow(row) as PlaybackSnapshot;

  it('avança com o tempo quando está tocando', () => {
    expect(expectedPosition(base, base.positionUpdatedAt + 5000)).toBe(15);
  });

  it('fica parado quando pausado', () => {
    expect(expectedPosition({ ...base, isPlaying: false }, base.positionUpdatedAt + 5000)).toBe(10);
  });
});

describe('isNewer', () => {
  const base = parsePlaybackRow(row) as PlaybackSnapshot;
  it('só aceita versão maior', () => {
    expect(isNewer(base, null)).toBe(true);
    expect(isNewer({ ...base, version: 4 }, base)).toBe(true);
    expect(isNewer(base, base)).toBe(false);
    expect(isNewer({ ...base, version: 2 }, base)).toBe(false);
  });
});
