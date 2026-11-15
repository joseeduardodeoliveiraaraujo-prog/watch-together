import { useEffect, useEffectEvent, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

export type ChannelStatus = 'connecting' | 'online' | 'error';

type RoomChannelHandlers = {
  /** Alguém entrou ou saiu (presença mudou). */
  onPresenceChange?: () => void;
  /** Novo estado de reprodução enviado pelo banco (linha crua de playback_state). */
  onPlaybackState?: (row: unknown) => void;
  /** A fila mudou (alguém adicionou, removeu, reordenou ou o vídeo avançou). */
  onPlaylistChange?: () => void;
  /** Canal (re)conectado: bom momento para buscar o estado atual e não perder nada. */
  onConnected?: () => void;
};

/**
 * Canal privado `room:<id>` (só membros, autorizado por RLS): presença de quem está com a sala
 * aberta e mudanças do estado de reprodução. Um único canal por sala.
 */
export function useRoomChannel(
  roomId: string,
  userId: string | null,
  handlers: RoomChannelHandlers = {},
) {
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<ChannelStatus>('connecting');
  const onPresenceChange = useEffectEvent(() => handlers.onPresenceChange?.());
  const onPlaybackState = useEffectEvent((row: unknown) => handlers.onPlaybackState?.(row));
  const onPlaylistChange = useEffectEvent(() => handlers.onPlaylistChange?.());
  const onConnected = useEffectEvent(() => handlers.onConnected?.());

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { private: true, presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
        onPresenceChange();
      })
      // Enviado pelo trigger de playback_state (realtime.broadcast_changes).
      .on('broadcast', { event: 'playback_state' }, (message) => {
        const payload = message.payload as { record?: unknown } | undefined;
        onPlaybackState(payload?.record);
      })
      // Enviado pelo trigger de playlist_items.
      .on('broadcast', { event: 'playlist' }, () => onPlaylistChange())
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          setStatus('online');
          void channel.track({ online_at: new Date().toISOString() });
          onConnected();
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          // O cliente tenta reconectar sozinho; mostramos o estado enquanto isso.
          setStatus('error');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  return { onlineIds, status };
}
