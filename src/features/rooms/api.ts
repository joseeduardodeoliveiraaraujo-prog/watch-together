import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

/** Máximo de pessoas por sala (igual a private.room_capacity() no banco). */
export const ROOM_CAPACITY = 4;

export type Room = Database['public']['Tables']['rooms']['Row'];

export type RoomSummary = Pick<Room, 'id' | 'code' | 'owner_id' | 'last_activity_at'> & {
  memberCount: number;
  /** Membros na ordem de entrada (define a cor de cada um). */
  members: { userId: string; displayName: string }[];
  /** Vídeo atual da sala; null se nada foi colocado para tocar. */
  nowPlaying: { title: string | null; isPlaying: boolean } | null;
};

export type RoomMember = {
  userId: string;
  displayName: string;
  joinedAt: string;
};

export type RoomDetails = Pick<Room, 'id' | 'code' | 'owner_id'> & { members: RoomMember[] };

// Todas as escritas passam pelas funções do banco (RPC), que validam e travam a sala.

export async function createRoom(): Promise<Room> {
  const { data, error } = await supabase.rpc('create_room');
  if (error) throw error;
  return data;
}

export async function joinRoom(code: string): Promise<Room> {
  const { data, error } = await supabase.rpc('join_room', { p_code: code });
  if (error) throw error;
  return data;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_room', { p_room_id: roomId });
  if (error) throw error;
}

type MemberRow = { user_id: string; joined_at: string; profiles: { display_name: string } | null };

function toMembers(rows: MemberRow[]): RoomMember[] {
  return rows
    .map((m) => ({
      userId: m.user_id,
      displayName: m.profiles?.display_name ?? 'Participante',
      joinedAt: m.joined_at,
    }))
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

/** Salas de que o usuário participa (o RLS só devolve essas), mais recentes primeiro. */
export async function listMyRooms(): Promise<RoomSummary[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select(
      'id, code, owner_id, last_activity_at, room_members(user_id, joined_at, profiles(display_name)), playback_state(is_playing, video_id, playlist_items(title))',
    )
    .order('last_activity_at', { ascending: false });
  if (error) throw error;
  return data.map(({ room_members, playback_state, ...room }) => {
    const members = toMembers(room_members);
    // Relação 1:1 — dependendo da versão do PostgREST vem objeto ou lista.
    const state = Array.isArray(playback_state) ? playback_state[0] : playback_state;
    return {
      ...room,
      memberCount: members.length,
      members: members.map(({ userId, displayName }) => ({ userId, displayName })),
      nowPlaying: state?.video_id
        ? { title: state.playlist_items?.title ?? null, isPlaying: state.is_playing }
        : null,
    };
  });
}

/** Sala com membros e apelidos. null se não existe ou o usuário não é membro. */
export async function fetchRoom(roomId: string): Promise<RoomDetails | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, code, owner_id, room_members(user_id, joined_at, profiles(display_name))')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { room_members, ...room } = data;
  return { ...room, members: toMembers(room_members) };
}
