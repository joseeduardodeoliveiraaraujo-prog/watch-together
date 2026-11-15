import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

/** Máximo de pessoas por sala (igual a private.room_capacity() no banco). */
export const ROOM_CAPACITY = 4;

export type Room = Database['public']['Tables']['rooms']['Row'];

export type RoomSummary = Pick<Room, 'id' | 'code' | 'owner_id' | 'last_activity_at'> & {
  memberCount: number;
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

/** Salas de que o usuário participa (o RLS só devolve essas), mais recentes primeiro. */
export async function listMyRooms(): Promise<RoomSummary[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, code, owner_id, last_activity_at, room_members(count)')
    .order('last_activity_at', { ascending: false });
  if (error) throw error;
  return data.map(({ room_members, ...room }) => ({
    ...room,
    memberCount: room_members[0]?.count ?? 0,
  }));
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
  return {
    ...room,
    members: room_members
      .map((m) => ({
        userId: m.user_id,
        displayName: m.profiles?.display_name ?? 'Participante',
        joinedAt: m.joined_at,
      }))
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
  };
}
