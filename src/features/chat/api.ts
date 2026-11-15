import { supabase } from '@/lib/supabase/client';

/**
 * Envia pelo servidor: ele carimba quem enviou e repassa ao canal da sala (nada é salvo).
 * `clientId` liga a mensagem "enviando" à confirmação que volta pelo canal.
 */
export async function sendChatMessage(roomId: string, text: string, clientId: string) {
  const { error } = await supabase.rpc('send_chat_message', {
    p_room_id: roomId,
    p_text: text,
    p_client_id: clientId,
  });
  if (error) throw error;
}
