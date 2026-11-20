import { supabase } from '@/lib/supabase/client';

/** Máximo de vídeos na fila (igual a private.playlist_capacity() no banco). */
export const PLAYLIST_CAPACITY = 50;

export type PlaylistItem = {
  id: string;
  videoId: string;
  title: string | null;
  addedBy: string | null;
  position: number;
};

/** Fila da sala, na ordem de reprodução. */
export async function listPlaylist(roomId: string): Promise<PlaylistItem[]> {
  const { data, error } = await supabase
    .from('playlist_items')
    .select('id, video_id, title, added_by, position')
    .eq('room_id', roomId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    videoId: row.video_id,
    title: row.title,
    addedBy: row.added_by,
    position: row.position,
  }));
}

// Escritas pelas funções do banco: travam a sala e avisam todos pelo canal.

/** Adiciona ao fim da fila e devolve o id do item criado. */
export async function addToPlaylist(
  roomId: string,
  videoId: string,
  title: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('add_to_playlist', {
    p_room_id: roomId,
    p_video_id: videoId,
    p_title: title ?? undefined,
  });
  if (error) throw error;
  return data.id;
}

export async function removeFromPlaylist(roomId: string, itemId: string) {
  const { error } = await supabase.rpc('remove_from_playlist', {
    p_room_id: roomId,
    p_item_id: itemId,
  });
  if (error) throw error;
}

export async function moveInPlaylist(roomId: string, itemId: string, direction: -1 | 1) {
  const { error } = await supabase.rpc('move_playlist_item', {
    p_room_id: roomId,
    p_item_id: itemId,
    p_direction: direction,
  });
  if (error) throw error;
}

export async function playPlaylistItem(roomId: string, itemId: string) {
  const { error } = await supabase.rpc('play_item', { p_room_id: roomId, p_item_id: itemId });
  if (error) throw error;
}
