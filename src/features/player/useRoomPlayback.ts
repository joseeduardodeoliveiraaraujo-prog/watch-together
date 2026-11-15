import { useEffect, useRef, useState, type RefObject } from 'react';
import { AppState } from 'react-native';

import { describeRpcError } from '@/lib/supabase/rpcErrors';
import type { PlayerEvent, PlayerState } from '@/lib/youtube/bridge';
import type { YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

import { fetchPlayback, measureClockOffset, sendPlaybackCommand, type PlaybackAction } from './api';
import { decideSync, type LocalPlayer } from './sync/decideSync';
import {
  describeChange,
  expectedPosition,
  isNewer,
  parsePlaybackRow,
  type PlaybackChange,
  type PlaybackSnapshot,
} from './sync/playbackState';

export type LastAction = { userId: string | null; change: PlaybackChange };

export type PlayerProgress = { state: PlayerState; currentTime: number; duration: number };

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

  const [snapshot, setSnapshot] = useState<PlaybackSnapshot | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>({
    state: 'unstarted',
    currentTime: 0,
    duration: 0,
  });
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
    if (previous) setLastAction({ userId: next.updatedBy, change: describeChange(previous, next) });
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
        setProgress({
          state: event.state,
          currentTime: event.currentTime,
          duration: event.duration,
        });
        runSync();
        return;
      case 'stateChange':
        Object.assign(local, { state: event.state, currentTime: event.currentTime, at: event.at });
        runSync();
        return;
      case 'error':
        setPlayerErrorCode(event.code);
        return;
      case 'apiLoadError':
        setPlayerErrorCode(-1);
        return;
    }
  };

  /** Comando do usuário: aplica a previsão na hora e confirma no servidor. */
  const command = async (
    action: PlaybackAction,
    predicted: PlaybackSnapshot,
    options: { position?: number; videoId?: string },
  ) => {
    snapshotRef.current = predicted;
    setSnapshot(predicted);
    setLastAction({ userId, change: action });
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

  const loadVideo = (videoId: string) => {
    const base: PlaybackSnapshot = snapshotRef.current ?? {
      version: 0,
      videoId: null,
      isPlaying: false,
      position: 0,
      positionUpdatedAt: 0,
      updatedBy: null,
      lastCommandId: null,
    };
    void command(
      'load',
      { ...base, videoId, isPlaying: true, position: 0, positionUpdatedAt: serverNow() },
      { videoId },
    );
  };

  return {
    snapshot,
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
    loadVideo,
  };
}
