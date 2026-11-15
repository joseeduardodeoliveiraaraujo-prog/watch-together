/** Última ação registrada no banco (playback_state.last_action). */
export type PlaybackAction =
  'none' | 'play' | 'pause' | 'seek' | 'load' | 'play_item' | 'next' | 'skip_error' | 'stop';

const ACTIONS: readonly PlaybackAction[] = [
  'none',
  'play',
  'pause',
  'seek',
  'load',
  'play_item',
  'next',
  'skip_error',
  'stop',
];

/** Estado de reprodução da sala, como vem do banco (linha de public.playback_state). */
export type PlaybackSnapshot = {
  version: number;
  videoId: string | null;
  /** Item da fila que está tocando (null = vídeo avulso ou nada). */
  currentItemId: string | null;
  lastAction: PlaybackAction;
  isPlaying: boolean;
  /** Posição (s) no instante `positionUpdatedAt`. */
  position: number;
  /** Instante (ms, relógio do servidor) em que `position` valia. */
  positionUpdatedAt: number;
  updatedBy: string | null;
  lastCommandId: string | null;
};

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Converte uma linha do banco (via RPC ou broadcast) em snapshot.
 * Valida tudo: o broadcast chega como JSON genérico.
 */
export function parsePlaybackRow(row: unknown): PlaybackSnapshot | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const version = Number(r.version);
  const position = Number(r.position_seconds);
  const updatedAt =
    typeof r.position_updated_at === 'string' ? Date.parse(r.position_updated_at) : NaN;
  if (!Number.isFinite(version) || !Number.isFinite(position) || !Number.isFinite(updatedAt))
    return null;
  if (typeof r.is_playing !== 'boolean') return null;
  const videoId = typeof r.video_id === 'string' && VIDEO_ID.test(r.video_id) ? r.video_id : null;
  return {
    version,
    videoId,
    currentItemId: typeof r.current_item_id === 'string' ? r.current_item_id : null,
    lastAction: ACTIONS.includes(r.last_action as PlaybackAction)
      ? (r.last_action as PlaybackAction)
      : 'none',
    isPlaying: r.is_playing && videoId !== null,
    position: Math.max(0, position),
    positionUpdatedAt: updatedAt,
    updatedBy: typeof r.updated_by === 'string' ? r.updated_by : null,
    lastCommandId: typeof r.last_command_id === 'string' ? r.last_command_id : null,
  };
}

/** Posição (s) em que todos deveriam estar no instante `serverNowMs`. */
export function expectedPosition(snapshot: PlaybackSnapshot, serverNowMs: number): number {
  if (!snapshot.isPlaying) return snapshot.position;
  return Math.max(0, snapshot.position + (serverNowMs - snapshot.positionUpdatedAt) / 1000);
}

/** Só aceita estados mais novos (o broadcast e a resposta da RPC podem chegar fora de ordem). */
export function isNewer(next: PlaybackSnapshot, current: PlaybackSnapshot | null): boolean {
  return !current || next.version > current.version;
}
