import type { PlayerCommand, PlayerState } from '@/lib/youtube/bridge';

import type { PlaybackSnapshot } from './playbackState';

/** Abaixo disso a diferença é ignorada. */
export const DRIFT_IGNORE_SECONDS = 0.5;
/** Tocando: só corrige com seek acima disso (seek causa um pequeno travamento). */
export const DRIFT_CORRECT_SECONDS = 1.5;
/** Depois de uma correção, espera o player assentar antes de corrigir de novo. */
export const CORRECTION_COOLDOWN_MS = 2500;

export type LocalPlayer = {
  /** Vídeo que mandamos carregar no player (null = nenhum). */
  loadedVideoId: string | null;
  state: PlayerState;
  currentTime: number;
  duration: number;
};

/**
 * Decide os comandos para o player local ficar igual ao estado da sala.
 * `expected` = posição esperada agora (ver expectedPosition).
 */
export function decideSync(
  snapshot: PlaybackSnapshot,
  local: LocalPlayer,
  expected: number,
  msSinceLastCorrection: number,
): PlayerCommand[] {
  if (!snapshot.videoId) {
    return local.state === 'playing' ? [{ type: 'pause' }] : [];
  }

  if (local.loadedVideoId !== snapshot.videoId) {
    return [
      {
        type: 'load',
        videoId: snapshot.videoId,
        startSeconds: expected,
        autoplay: snapshot.isPlaying,
      },
    ];
  }

  // Player ainda carregando ou travado buscando dados: não insistir.
  if (local.state === 'buffering' || msSinceLastCorrection < CORRECTION_COOLDOWN_MS) return [];

  // Vídeo acabou aqui: fica parado (avançar na fila é da Etapa 6).
  if (local.state === 'ended') return [];

  const target = local.duration > 0 ? Math.min(expected, local.duration) : expected;
  const drift = Math.abs(local.currentTime - target);

  if (snapshot.isPlaying) {
    if (local.state !== 'playing') {
      return drift > DRIFT_IGNORE_SECONDS
        ? [{ type: 'seek', seconds: target }, { type: 'play' }]
        : [{ type: 'play' }];
    }
    return drift > DRIFT_CORRECT_SECONDS ? [{ type: 'seek', seconds: target }] : [];
  }

  // Vídeo carregado parado ("cued") já começa no ponto pedido no load; não reportar posição ainda.
  if (local.state === 'cued') return [];

  const commands: PlayerCommand[] = [];
  if (local.state === 'playing') commands.push({ type: 'pause' });
  if (drift > DRIFT_IGNORE_SECONDS) commands.push({ type: 'seek', seconds: target });
  return commands;
}
