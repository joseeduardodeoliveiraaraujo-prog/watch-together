import { useEffect, useRef, useState, type RefObject } from 'react';
import { AppState } from 'react-native';

import { describeRpcError } from '@/lib/supabase/rpcErrors';
import type { PlayerEvent } from '@/lib/youtube/bridge';
import { isUnplayableError } from '@/lib/youtube/errors';
import type { YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

import {
  advanceToNext,
  fetchPlayback,
  measureClockOffset,
  sendPlaybackCommand,
  type PlaybackCommand,
} from './api';
import { createProgressStore } from './progressStore';
import { decideSync, type LocalPlayer } from './sync/decideSync';
import {
  expectedPosition,
  isNewer,
  parsePlaybackRow,
  type PlaybackAction,
  type PlaybackSnapshot,
} from './sync/playbackState';

export type LastAction = { userId: string | null; action: PlaybackAction };

type LocalStatus = LocalPlayer & {
  /** Date.now() em que currentTime foi lido (para extrapolar enquanto toca). */
  at: number;
};

/**
 * Sincroniza o player local com o estado da sala.
 *
 * - O estado confirmado vem do banco (RPC, broadcast ou busca). Só versões mais novas entram.
 * - Comandos do usuário são aplicados na hora (previsão otimista) e confirmados pela RPC; em caso
 *   de erro, volta ao último estado confirmado.
 * - A cada status do player (~500 ms) compara a posição local com a esperada e corrige.
 */
export function useRoomPlayback(
  roomId: string,
  userId: string | null,
  playerRef: RefObject<YouTubePlayerHandle | null>,
) {
  /** Estado em vigor (confirmado ou previsto após um comando local). */
  const snapshotRef = useRef<PlaybackSnapshot | null>(null);
  /** Último estado vindo do servidor. */
  const confirmedRef = useRef<PlaybackSnapshot | null>(null);
  /** servidor ≈ Date.now() + offset (ms). */
  const offsetRef = useRef(0);
  const readyRef = useRef(false);
  const localRef = useRef<LocalStatus>({
    loadedVideoId: null,
    state: 'unstarted',
    currentTime: 0,
    duration: 0,
    at: 0,
  });
  const lastCorrectionRef = useRef(0);
  /** Item para o qual já pedimos "próximo" (evita pedir de novo a cada status). */
  const advancedItemRef = useRef<string | null>(null);

  const [snapshot, setSnapshot] = useState<PlaybackSnapshot | null>(null);
  /** Posição do player fora do estado da sala (ver progressStore.ts). */
  const [progress] = useState(createProgressStore);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerErrorCode, setPlayerErrorCode] = useState<number | null>(null);

  const serverNow = () => Date.now() + offsetRef.current;

  /** Posição atual do player local, extrapolada desde a última leitura. */
  const localPosition = () => {
    const local = localRef.current;
    return local.state === 'playing'
      ? local.currentTime + (Date.now() - local.at) / 1000
      : local.currentTime;
  };

  const runSync = () => {
    const snap = snapshotRef.current;
    const player = playerRef.current;
    if (!snap || !player || !readyRef.current) return;

    const now = Date.now();
    const commands = decideSync(
      snap,
      { ...localRef.current, currentTime: localPosition() },
      expectedPosition(snap, serverNow()),
      now - lastCorrectionRef.current,
    );
    if (commands.length === 0) return;

    lastCorrectionRef.current = now;
    for (const command of commands) {
      if (command.type === 'load') {
        localRef.current.loadedVideoId = command.videoId;
        setPlayerErrorCode(null);
      }
      player.send(command);
    }
  };

  /** Aplica um estado vindo do servidor (ignora se não for mais novo). */
  const applyConfirmed = (next: PlaybackSnapshot | null) => {
    if (!next || !isNewer(next, confirmedRef.current)) return;
    const previous = confirmedRef.current;
    confirmedRef.current = next;
    snapshotRef.current = next;
    setSnapshot(next);
    // Só mostra ações que aconteceram com a sala aberta (não o estado antigo ao entrar).
    if (previous) setLastAction({ userId: next.updatedBy, action: next.lastAction });
    lastCorrectionRef.current = 0;
    runSync();
  };

  const refresh = async () => {
    try {
      applyConfirmed(await fetchPlayback(roomId));
      setError(null);
    } catch (e) {
      setError(describeRpcError(e));
    }
  };

  const syncClock = async () => {
    const offset = await measureClockOffset().catch(() => null);
    if (offset !== null) offsetRef.current = offset;
  };

  // Ao abrir a sala e ao voltar do segundo plano: acerta o relógio e busca o estado atual.
  useEffect(() => {
    const resync = () => {
      void syncClock().then(refresh);
    };
    resync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') resync();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /**
   * O vídeo atual da fila acabou ou não pode tocar aqui: pede o próximo.
   * Só para o vídeo que a sala está tocando e uma vez por item.
   */
  const requestAdvance = (reason: 'ended' | 'error') => {
    const snap = snapshotRef.current;
    const itemId = snap?.currentItemId;
    if (!snap || !itemId || advancedItemRef.current === itemId) return;
    if (localRef.current.loadedVideoId !== snap.videoId) return;
    if (reason === 'ended' && !snap.isPlaying) return;
    advancedItemRef.current = itemId;
    advanceToNext(roomId, itemId, reason).then(applyConfirmed, (e: unknown) => {
      advancedItemRef.current = null;
      setError(describeRpcError(e));
    });
  };

  /** Eventos do player (WebView). */
  const handlePlayerEvent = (event: PlayerEvent) => {
    const local = localRef.current;
    switch (event.type) {
      case 'ready':
        // Página (re)carregada: nenhum vídeo no player.
        readyRef.current = true;
        local.loadedVideoId = null;
        lastCorrectionRef.current = 0;
        runSync();
        return;
      case 'status':
        Object.assign(local, {
          state: event.state,
          currentTime: event.currentTime,
          duration: event.duration,
          at: event.at,
        });
        progress.set({
          state: event.state,
          currentTime: event.currentTime,
          duration: event.duration,
        });
        if (event.state === 'ended') requestAdvance('ended');
        runSync();
        return;
      case 'stateChange':
        Object.assign(local, { state: event.state, currentTime: event.currentTime, at: event.at });
        if (event.state === 'ended') requestAdvance('ended');
        runSync();
        return;
      case 'error':
        setPlayerErrorCode(event.code);
        // Vídeo que nunca vai tocar (removido, privado, incorporação proibida): pula.
        if (isUnplayableError(event.code)) requestAdvance('error');
        return;
      case 'apiLoadError':
        setPlayerErrorCode(-1);
        return;
    }
  };

  /** Comando do usuário: aplica a previsão na hora e confirma no servidor. */
  const command = async (
    action: PlaybackCommand,
    predicted: PlaybackSnapshot,
    options: { position?: number; videoId?: string },
  ) => {
    snapshotRef.current = predicted;
    setSnapshot(predicted);
    setLastAction({ userId, action });
    setError(null);
    lastCorrectionRef.current = 0;
    runSync();
    try {
      applyConfirmed(await sendPlaybackCommand(roomId, action, options));
    } catch (e) {
      snapshotRef.current = confirmedRef.current;
      setSnapshot(confirmedRef.current);
      lastCorrectionRef.current = 0;
      runSync();
      setError(describeRpcError(e));
    }
  };

  const play = () => {
    const snap = snapshotRef.current;
    if (!snap?.videoId) return;
    const position = localPosition();
    void command(
      'play',
      { ...snap, isPlaying: true, position, positionUpdatedAt: serverNow() },
      { position },
    );
  };

  const pause = () => {
    const snap = snapshotRef.current;
    if (!snap?.videoId) return;
    const position = localPosition();
    void command(
      'pause',
      { ...snap, isPlaying: false, position, positionUpdatedAt: serverNow() },
      { position },
    );
  };

  const seekTo = (seconds: number) => {
    const snap = snapshotRef.current;
    if (!snap?.videoId) return;
    const duration = localRef.current.duration;
    const position = Math.max(0, duration > 0 ? Math.min(seconds, duration - 1) : seconds);
    void command('seek', { ...snap, position, positionUpdatedAt: serverNow() }, { position });
  };

  const seekBy = (delta: number) => seekTo(localPosition() + delta);

  return {
    snapshot,
    /** Posição do player: use com `usePlayerProgress` / `ProgressSeekBar` / `ProgressTime`. */
    progress,
    lastAction,
    error,
    playerErrorCode,
    handlePlayerEvent,
    /** Para o canal da sala: estado novo vindo do banco (linha crua). */
    handleRemoteRow: (row: unknown) => applyConfirmed(parsePlaybackRow(row)),
    refresh,
    play,
    pause,
    seekBy,
    seekTo,
  };
}
