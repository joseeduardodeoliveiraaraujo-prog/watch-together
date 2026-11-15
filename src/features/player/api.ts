import { randomUUID } from 'expo-crypto';

import { supabase } from '@/lib/supabase/client';

import { bestOffset, type ClockSample } from './sync/clock';
import { parsePlaybackRow, type PlaybackSnapshot } from './sync/playbackState';

export type PlaybackAction = 'play' | 'pause' | 'seek' | 'load';

export async function fetchPlayback(roomId: string): Promise<PlaybackSnapshot | null> {
  const { data, error } = await supabase
    .from('playback_state')
    .select('*')
    .eq('room_id', roomId)
    .maybeSingle();
  if (error) throw error;
  return parsePlaybackRow(data);
}

/** Envia um comando à sala. O `commandId` evita aplicar duas vezes numa retentativa. */
export async function sendPlaybackCommand(
  roomId: string,
  action: PlaybackAction,
  options: { position?: number; videoId?: string } = {},
): Promise<PlaybackSnapshot | null> {
  const { data, error } = await supabase.rpc('playback_command', {
    p_room_id: roomId,
    p_command_id: randomUUID(),
    p_action: action,
    p_position: options.position,
    p_video_id: options.videoId,
  });
  if (error) throw error;
  return parsePlaybackRow(data);
}

/** Diferença (ms) entre o relógio do servidor e o do celular: servidor ≈ Date.now() + offset. */
export async function measureClockOffset(samples = 3): Promise<number | null> {
  const results: ClockSample[] = [];
  for (let i = 0; i < samples; i++) {
    const sentAt = Date.now();
    const { data, error } = await supabase.rpc('server_now');
    const receivedAt = Date.now();
    if (error || typeof data !== 'string') continue;
    const serverTime = Date.parse(data);
    if (Number.isFinite(serverTime)) results.push({ sentAt, serverTime, receivedAt });
  }
  return bestOffset(results);
}
