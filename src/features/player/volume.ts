import type { IconName } from '@/components/ui/Icon';

/** Volume e mudo deste aparelho (não vão para a sala). */
export type VolumeState = { volume: number; muted: boolean };

export const DEFAULT_VOLUME: VolumeState = { volume: 100, muted: false };

/** Chave no localStorage (SQLite) — o mesmo armazenamento da sessão do Supabase. */
export const VOLUME_STORAGE_KEY = 'wt.player.volume';

export function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : 100;
}

/** Lê o que foi salvo; qualquer coisa inválida volta ao padrão. */
export function parseSavedVolume(raw: string | null): VolumeState {
  if (!raw) return DEFAULT_VOLUME;
  try {
    const data = JSON.parse(raw) as Partial<VolumeState> | null;
    if (!data || typeof data !== 'object') return DEFAULT_VOLUME;
    return {
      volume: typeof data.volume === 'number' ? clampVolume(data.volume) : 100,
      muted: data.muted === true,
    };
  } catch {
    return DEFAULT_VOLUME;
  }
}

/** Ícone do alto-falante como no YouTube: mudo, baixo, alto. */
export function volumeIcon({ volume, muted }: VolumeState): IconName {
  if (muted || volume === 0) return 'volume-x';
  return volume < 50 ? 'volume-1' : 'volume-2';
}
