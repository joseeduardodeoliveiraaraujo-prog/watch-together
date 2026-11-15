import { useEffect, useEffectEvent, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

export type ChannelStatus = 'connecting' | 'online' | 'error';

/** Quem está na presença. `name` é informado pelo próprio celular: usar só para avisos. */
export type PresencePerson = { id: string; name: string | null };

type RoomChannelHandlers = {
  /** Alguém entrou ou saiu (presença mudou). */
  onPresenceChange?: () => void;
  /** Novo estado de reprodução enviado pelo banco (linha crua de playback_state). */
  onPlaybackState?: (row: unknown) => void;
  /**
   * Presença mudou depois da carga inicial: quem abriu e quem fechou a sala (ids).
   * A primeira lista após (re)conectar não gera aviso.
   */
  onPresenceDiff?: (joined: PresencePerson[], left: PresencePerson[]) => void;
  /** A fila mudou. `change` = mensagem do trigger (operação e linha), para avisos no chat. */
  onPlaylistChange?: (change: { operation?: unknown; record?: unknown }) => void;
  /** Mensagem de chat (já carimbada pelo servidor; validar antes de usar). */
  onChat?: (payload: unknown) => void;
  /** Canal (re)conectado: bom momento para buscar o estado atual e não perder nada. */
  onConnected?: () => void;
};

/**
 * Canal privado `room:<id>` (só membros, autorizado por RLS): presença de quem está com a sala
 * aberta, estado de reprodução, fila e chat. Um único canal por sala.
 */
export function useRoomChannel(
  roomId: string,
  me: { userId: string | null; displayName: string | null },
  handlers: RoomChannelHandlers = {},
) {
  const { userId } = me;
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<ChannelStatus>('connecting');
  const onPresenceChange = useEffectEvent(() => handlers.onPresenceChange?.());
  const onPlaybackState = useEffectEvent((row: unknown) => handlers.onPlaybackState?.(row));
  const onPresenceDiff = useEffectEvent((joined: PresencePerson[], left: PresencePerson[]) =>
    handlers.onPresenceDiff?.(joined, left),
  );
  const myName = useEffectEvent(() => me.displayName);
  const onPlaylistChange = useEffectEvent((change: { operation?: unknown; record?: unknown }) =>
    handlers.onPlaylistChange?.(change),
  );
  const onChat = useEffectEvent((payload: unknown) => handlers.onChat?.(payload));
  const onConnected = useEffectEvent(() => handlers.onConnected?.());

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { private: true, presence: { key: userId } },
    });

    // Última presença conhecida (id → nome); null = próxima sincronização é a carga inicial.
    let known: Map<string, string | null> | null = null;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name?: unknown }>();
        const current = new Map<string, string | null>();
        for (const [id, metas] of Object.entries(state)) {
          const name = metas[0]?.name;
          current.set(id, typeof name === 'string' ? name.slice(0, 30) : null);
        }
        if (known) {
          const previous = known;
          const joined = [...current]
            .filter(([id]) => !previous.has(id) && id !== userId)
            .map(([id, name]) => ({ id, name }));
          const left = [...previous]
            .filter(([id]) => !current.has(id) && id !== userId)
            .map(([id, name]) => ({ id, name }));
          if (joined.length || left.length) onPresenceDiff(joined, left);
        }
        known = current;
        setOnlineIds(new Set(current.keys()));
        onPresenceChange();
      })
      // Enviado pelo trigger de playback_state (realtime.broadcast_changes).
      .on('broadcast', { event: 'playback_state' }, (message) => {
        const payload = message.payload as { record?: unknown } | undefined;
        onPlaybackState(payload?.record);
      })
      // Enviado pelo trigger de playlist_items.
      .on('broadcast', { event: 'playlist' }, (message) => {
        const payload = message.payload as { operation?: unknown; record?: unknown } | undefined;
        onPlaylistChange(payload ?? {});
      })
      // Enviado por send_chat_message (realtime.send).
      .on('broadcast', { event: 'chat' }, (message) => onChat(message.payload))
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          known = null;
          setStatus('online');
          void channel.track({ online_at: new Date().toISOString(), name: myName() });
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
