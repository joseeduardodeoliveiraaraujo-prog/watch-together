-- Etapa 7 — chat ao vivo.
--
-- Sem tabela de mensagens: send_chat_message valida, carimba quem enviou (auth.uid() e apelido
-- do perfil, impossível falsificar) e repassa ao canal privado room:<id> (evento "chat").
-- Quem entra depois não vê mensagens antigas. Observação: realtime.send passa por uma tabela
-- interna do Supabase Realtime (realtime.messages), que o próprio Supabase apaga em até 3 dias;
-- o app não lê essa tabela.

-- Anti-spam: até 5 mensagens a cada 5 segundos por pessoa. Guarda só contadores, não mensagens.
create table private.chat_rate_limit (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null,
  message_count integer not null
);

create function public.send_chat_message(p_room_id uuid, p_text text, p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_text text := btrim(coalesce(p_text, ''));
  v_name text;
  v_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if not private.is_room_member(p_room_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if char_length(v_text) = 0 or char_length(v_text) > 500 then
    raise exception 'invalid_message' using errcode = 'P0001';
  end if;

  insert into private.chat_rate_limit as r (user_id, window_start, message_count)
  values (v_uid, v_now, 1)
  on conflict (user_id) do update set
    window_start = case when r.window_start < v_now - interval '5 seconds' then v_now else r.window_start end,
    message_count = case when r.window_start < v_now - interval '5 seconds' then 1 else r.message_count + 1 end
  returning message_count into v_count;

  if v_count > 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select display_name into v_name from public.profiles where id = v_uid;

  perform realtime.send(
    jsonb_build_object(
      'id', gen_random_uuid(),
      'client_id', p_client_id,
      'user_id', v_uid,
      'display_name', coalesce(v_name, 'Participante'),
      'text', v_text,
      'sent_at', v_now
    ),
    'chat',
    'room:' || p_room_id::text,
    true
  );
end;
$$;

revoke all on function public.send_chat_message(uuid, text, uuid) from public, anon;
grant execute on function public.send_chat_message(uuid, text, uuid) to authenticated;
