import { useState, type RefObject } from 'react';

import type {
  CaptionLanguage,
  CaptionSelection,
  CaptionTrack,
  PlayerEvent,
} from '@/lib/youtube/bridge';
import type { YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

export type CaptionsState = {
  tracks: CaptionTrack[];
  /** Idiomas para os quais o YouTube traduz automaticamente. */
  translations: CaptionLanguage[];
  /** Legenda ativa; `null` = desligada. */
  active: CaptionSelection | null;
};

const EMPTY: CaptionsState = { tracks: [], translations: [], active: null };

/**
 * Legendas do vídeo atual, só neste aparelho (não vai para a sala). Cada vídeo abre no padrão
 * do YouTube; a escolha não é lembrada entre vídeos.
 */
export function useCaptions(
  playerRef: RefObject<YouTubePlayerHandle | null>,
  videoId: string | null,
) {
  const [captions, setCaptions] = useState<CaptionsState>(EMPTY);
  const [forVideo, setForVideo] = useState(videoId);

  // Trocou o vídeo: a lista antiga não vale mais (a página manda a nova quando carregar).
  if (forVideo !== videoId) {
    setForVideo(videoId);
    setCaptions(EMPTY);
  }

  const handleEvent = (event: PlayerEvent) => {
    if (event.type === 'captions') {
      setCaptions({
        tracks: event.tracks,
        translations: event.translations,
        active: event.active,
      });
    } else if (event.type === 'ready') {
      setCaptions(EMPTY);
    }
  };

  return {
    captions,
    handleEvent,
    /** Pede a lista atualizada à página (ao abrir o seletor). */
    refresh: () => playerRef.current?.send({ type: 'getCaptions' }),
    select: (selection: CaptionSelection | null) => {
      setCaptions((current) => ({ ...current, active: selection }));
      playerRef.current?.send({ type: 'setCaption', selection });
    },
  };
}
