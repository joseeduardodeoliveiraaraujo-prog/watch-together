import { useSyncExternalStore } from 'react';

import type { PlayerState } from '@/lib/youtube/bridge';

export type PlayerProgress = { state: PlayerState; currentTime: number; duration: number };

export type ProgressStore = {
  get: () => PlayerProgress;
  set: (next: PlayerProgress) => void;
  subscribe: (listener: () => void) => () => void;
};

/** Diferença de tempo abaixo da qual não vale redesenhar (a barra e o relógio não mudam). */
export const PROGRESS_STEP_SECONDS = 0.25;

const INITIAL: PlayerProgress = { state: 'unstarted', currentTime: 0, duration: 0 };

export function sameProgress(a: PlayerProgress, b: PlayerProgress): boolean {
  return (
    a.state === b.state &&
    Math.abs(a.duration - b.duration) < 0.01 &&
    Math.abs(a.currentTime - b.currentTime) < PROGRESS_STEP_SECONDS
  );
}

/**
 * Posição do player fora do estado do React. O player avisa a cada ~500 ms; guardar isso num
 * `useState` da sala redesenhava a tela inteira (chat, fila, abas) duas vezes por segundo, até com
 * o vídeo pausado. Aqui só quem usa `usePlayerProgress` (barra e relógio) redesenha, e só quando o
 * valor muda de verdade.
 */
export function createProgressStore(): ProgressStore {
  let value = INITIAL;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (sameProgress(value, next)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function usePlayerProgress(store: ProgressStore): PlayerProgress {
  return useSyncExternalStore(store.subscribe, store.get);
}
