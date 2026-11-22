import { useState, type RefObject } from 'react';

import type { PlayerEvent } from '@/lib/youtube/bridge';
import type { YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

import { clampVolume, parseSavedVolume, VOLUME_STORAGE_KEY, type VolumeState } from './volume';

function readSaved(): VolumeState {
  try {
    return parseSavedVolume(globalThis.localStorage?.getItem(VOLUME_STORAGE_KEY) ?? null);
  } catch {
    return parseSavedVolume(null);
  }
}

function save(state: VolumeState) {
  try {
    globalThis.localStorage?.setItem(VOLUME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sem armazenamento o volume só não é lembrado na próxima vez.
  }
}

/**
 * Volume do vídeo neste aparelho, como no YouTube: barra de 0 a 100 e mudo. Fica salvo no
 * celular e é reaplicado sempre que a página do player (re)carrega.
 */
export function useVolume(playerRef: RefObject<YouTubePlayerHandle | null>) {
  const [state, setState] = useState<VolumeState>(readSaved);

  const apply = (next: VolumeState) => {
    playerRef.current?.send({ type: 'volume', volume: next.volume });
    playerRef.current?.send({ type: 'mute', muted: next.muted });
  };

  const update = (next: VolumeState, persist: boolean) => {
    setState(next);
    apply(next);
    if (persist) save(next);
  };

  return {
    volume: state,
    /** Player pronto: aplica o volume salvo (o player começa sempre em 100% com som). */
    handleEvent: (event: PlayerEvent) => {
      if (event.type === 'ready') apply(state);
    },
    /**
     * Muda o volume. `persist: false` durante o arraste (só aplica); salva ao soltar.
     * Subir o volume tira do mudo, como no YouTube.
     */
    setVolume: (value: number, persist = true) => {
      const volume = clampVolume(value);
      update({ volume, muted: volume === 0 ? state.muted : false }, persist);
    },
    toggleMute: () => {
      // Desmutar com volume 0 volta para um nível audível.
      if (state.muted || state.volume === 0) {
        update({ volume: state.volume === 0 ? 50 : state.volume, muted: false }, true);
      } else {
        update({ ...state, muted: true }, true);
      }
    },
  };
}

export type VolumeControls = ReturnType<typeof useVolume>;
