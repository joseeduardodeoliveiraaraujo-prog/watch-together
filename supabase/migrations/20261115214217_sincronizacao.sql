-- Etapa 5 — sincronização da reprodução.
--
-- O estado em public.playback_state é a fonte da verdade. Todo comando passa por
-- playback_command, que trava a linha, calcula a posição atual no relógio do servidor e grava um
-- estado ABSOLUTO ("tocando a partir de X em T"). Cada mudança é enviada aos membros pelo canal
-- privado room:<id> (evento de broadcast "playback_state").
--
-- version: cresce a cada comando; o app ignora estados com versão menor que a que já aplicou.
-- last_command_id: o mesmo comando repetido (retentativa de rede) não é aplicado duas vezes.

-- Relógio do servidor, para o app calcular a diferença para o relógio do celular.
create function public.server_now()
returns timestamptz
language sql
volatile
set search_path = ''
as $$
  select clock_timestamp();
$$;

create function public.playback_command(
  p_room_id uuid,
  p_command_id uuid,
  p_action text,
  p_position double precision default null,
  p_video_id text default null
)
returns public.playback_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_state public.playback_state;
  v_now timestamptz;
  v_current double precision;
  v_position double precision;
begin
  if not private.is_room_member(p_room_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  select * into v_state from public.playback_state where room_id = p_room_id for update;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;

  if p_command_id is not null and v_state.last_command_id = p_command_id then
    return v_state;
  end if;

  -- Hora lida depois da trava: comandos concorrentes ficam em ordem.
  v_now := clock_timestamp();
  v_current := v_state.position_seconds + case
    when v_state.is_playing then extract(epoch from (v_now - v_state.position_updated_at))
    else 0
  end;
  -- Até 24 h; posição além da duração do vídeo é tratada pelo player.
  v_position := greatest(0, least(coalesce(p_position, v_current), 86400));

  case p_action
    when 'play' then
      if v_state.video_id is null then
        raise exception 'no_video' using errcode = 'P0001';
      end if;
      v_state.is_playing := true;
    when 'pause' then
      v_state.is_playing := false;
    when 'seek' then
      if p_position is null then
        raise exception 'invalid_command' using errcode = 'P0001';
      end if;
    when 'load' then
      if p_video_id is null or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
        raise exception 'invalid_video' using errcode = 'P0001';
      end if;
      v_state.video_id := p_video_id;
      v_state.current_item_id := null;
      v_state.is_playing := true;
      v_position := greatest(0, least(coalesce(p_position, 0), 86400));
    else
      raise exception 'invalid_command' using errcode = 'P0001';
  end case;

  update public.playback_state
  set
    video_id = v_state.video_id,
    current_item_id = v_state.current_item_id,
    is_playing = v_state.is_playing,
    position_seconds = v_position,
    position_updated_at = v_now,
    version = version + 1,
    last_command_id = p_command_id,
    updated_by = v_uid,
    updated_at = v_now
  where room_id = p_room_id
  returning * into v_state;

  update public.rooms set last_activity_at = v_now where id = p_room_id;
  return v_state;
end;
$$;

revoke all on function public.server_now() from public, anon;
revoke all on function public.playback_command(uuid, uuid, text, double precision, text)
  from public, anon;
grant execute on function public.server_now() to authenticated;
grant execute on function public.playback_command(uuid, uuid, text, double precision, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Envia cada mudança do estado aos membros conectados no canal room:<id>.
-- ---------------------------------------------------------------------------
create function private.broadcast_playback_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'room:' || new.room_id::text,
    'playback_state',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

revoke all on function private.broadcast_playback_state() from public;

create trigger playback_state_broadcast
  after update on public.playback_state
  for each row execute function private.broadcast_playback_state();
