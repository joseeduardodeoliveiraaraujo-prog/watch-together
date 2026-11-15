import { useEffect, useEffectEvent, useState } from 'react';

import { supabase } from '@/lib/supabase/client';

export type PresenceStatus = 'connecting' | 'online' | 'error';

/**
 * Presença em tempo real no canal privado `room:<id>` (autorizado por RLS: só membros).
 * Devolve quem está com a sala aberta agora. `onChange` roda a cada mudança (entrada/saída).
 */
export function useRoomPresence(roomId: string, userId: string | null, onChange?: () => void) {
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<PresenceStatus>('connecting');
  const notifyChange = useEffectEvent(() => onChange?.());

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`room:${roomId}`, {
      config: { private: true, presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
        notifyChange();
      })
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          setStatus('online');
          void channel.track({ online_at: new Date().toISOString() });
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
