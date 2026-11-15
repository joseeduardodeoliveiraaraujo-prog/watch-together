-- Etapa 6 — playlist compartilhada.
--
-- Modelo: playlist_items guarda o vídeo atual (playback_state.current_item_id) e os próximos.
-- O vídeo que TERMINA sai da fila; tocar outro pelo botão não remove o atual.
-- "Próximo" = item de menor position, sem contar o atual.
-- Toda operação trava a linha de playback_state da sala (mesma trava de playback_command), então
-- fila e reprodução nunca mudam ao mesmo tempo.

-- Última ação, para o app mostrar "Ana pausou" / "vídeo bloqueado foi pulado".
alter table public.playback_state
  add column last_action text not null default 'none'
    check (last_action in ('none', 'play', 'pause', 'seek', 'load', 'play_item', 'next', 'skip_error', 'stop'));

create function private.playlist_capacity() returns integer language sql immutable as $$ select 50 $$;
revoke all on function private.playlist_capacity() from public;

-- Trava a sala para operações de fila e reprodução. Exige que o usuário seja membro.
create function private.lock_room_playback(p_room_id uuid)
returns public.playback_state
language plpgsql
set search_path = ''
as $$
declare
  v_state public.playback_state;
begin
  perform private.require_user();
  if not private.is_room_member(p_room_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  select * into v_state from public.playback_state where room_id = p_room_id for update;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;
  return v_state;
end;
$$;
revoke all on function private.lock_room_playback(uuid) from public;

-- Grava um novo estado de reprodução (sempre incrementa version e registra quem/o quê).
create function private.set_playback(
  p_room_id uuid,
  p_item_id uuid,
  p_video_id text,
  p_is_playing boolean,
  p_position double precision,
  p_action text,
  p_command_id uuid default null
)
returns public.playback_state
language plpgsql
set search_path = ''
as $$
declare
  v_state public.playback_state;
  v_now timestamptz := clock_timestamp();
begin
  update public.playback_state
  set
    current_item_id = p_item_id,
    video_id = p_video_id,
    is_playing = p_is_playing and p_video_id is not null,
    position_seconds = greatest(0, least(coalesce(p_position, 0), 86400)),
    position_updated_at = v_now,
    version = version + 1,
    last_command_id = p_command_id,
    last_action = p_action,
    updated_by = auth.uid(),
    updated_at = v_now
  where room_id = p_room_id
  returning * into v_state;

  update public.rooms set last_activity_at = v_now where id = p_room_id;
  return v_state;
end;
$$;
revoke all on function private.set_playback(uuid, uuid, text, boolean, double precision, text, uuid)
  from public;

-- Próximo da fila (sem contar o atual) ou null.
create function private.next_item(p_room_id uuid, p_exclude uuid)
returns public.playlist_items
language sql
stable
set search_path = ''
as $$
  select * from public.playlist_items
  where room_id = p_room_id and id is distinct from p_exclude
  order by position, created_at
  limit 1;
$$;
revoke all on function private.next_item(uuid, uuid) from public;

-- ---------------------------------------------------------------------------
-- playback_command: igual à Etapa 5, agora registrando last_action.
-- ---------------------------------------------------------------------------
create or replace function public.playback_command(
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
  v_state public.playback_state := private.lock_room_playback(p_room_id);
  v_current double precision;
  v_position double precision;
begin
  if p_command_id is not null and v_state.last_command_id = p_command_id then
    return v_state;
  end if;

  v_current := v_state.position_seconds + case
    when v_state.is_playing then extract(epoch from (clock_timestamp() - v_state.position_updated_at))
    else 0
  end;
  v_position := coalesce(p_position, v_current);

  case p_action
    when 'play' then
      if v_state.video_id is null then
        raise exception 'no_video' using errcode = 'P0001';
      end if;
      return private.set_playback(p_room_id, v_state.current_item_id, v_state.video_id, true,
        v_position, 'play', p_command_id);
    when 'pause' then
      return private.set_playback(p_room_id, v_state.current_item_id, v_state.video_id, false,
        v_position, 'pause', p_command_id);
    when 'seek' then
      if p_position is null then
        raise exception 'invalid_command' using errcode = 'P0001';
      end if;
      return private.set_playback(p_room_id, v_state.current_item_id, v_state.video_id,
        v_state.is_playing, v_position, 'seek', p_command_id);
    when 'load' then
      if p_video_id is null or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
        raise exception 'invalid_video' using errcode = 'P0001';
      end if;
      return private.set_playback(p_room_id, null, p_video_id, true, coalesce(p_position, 0),
        'load', p_command_id);
    else
      raise exception 'invalid_command' using errcode = 'P0001';
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_to_playlist: adiciona ao fim. Com nada tocando, começa a tocar na hora.
-- ---------------------------------------------------------------------------
create function public.add_to_playlist(p_room_id uuid, p_video_id text, p_title text default null)
returns public.playlist_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.playback_state := private.lock_room_playback(p_room_id);
  v_item public.playlist_items;
begin
  if p_video_id is null or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception 'invalid_video' using errcode = 'P0001';
  end if;
  if (select count(*) from public.playlist_items where room_id = p_room_id) >= private.playlist_capacity() then
    raise exception 'playlist_full' using errcode = 'P0001';
  end if;

  insert into public.playlist_items (room_id, video_id, title, added_by, position)
  values (
    p_room_id,
    p_video_id,
    nullif(left(btrim(coalesce(p_title, '')), 200), ''),
    auth.uid(),
    coalesce((select max(position) + 1 from public.playlist_items where room_id = p_room_id), 0)
  )
  returning * into v_item;

  if v_state.current_item_id is null and not v_state.is_playing then
    perform private.set_playback(p_room_id, v_item.id, v_item.video_id, true, 0, 'play_item');
  end if;
  return v_item;
end;
$$;

-- ---------------------------------------------------------------------------
-- play_item: toca um item da fila agora (o atual continua na fila).
-- ---------------------------------------------------------------------------
create function public.play_item(p_room_id uuid, p_item_id uuid)
returns public.playback_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.playback_state := private.lock_room_playback(p_room_id);
  v_item public.playlist_items;
begin
  select * into v_item from public.playlist_items where id = p_item_id and room_id = p_room_id;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0001';
  end if;
  return private.set_playback(p_room_id, v_item.id, v_item.video_id, true, 0, 'play_item');
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_from_playlist: tira da fila. Se era o atual, passa para o próximo.
-- ---------------------------------------------------------------------------
create function public.remove_from_playlist(p_room_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.playback_state := private.lock_room_playback(p_room_id);
  v_next public.playlist_items;
begin
  delete from public.playlist_items where id = p_item_id and room_id = p_room_id;
  if not found then
    return;
  end if;

  if v_state.current_item_id = p_item_id then
    v_next := private.next_item(p_room_id, null);
    if v_next.id is null then
      perform private.set_playback(p_room_id, null, null, false, 0, 'stop');
    else
      perform private.set_playback(p_room_id, v_next.id, v_next.video_id, v_state.is_playing, 0, 'next');
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- move_playlist_item: troca de lugar com o vizinho de cima (-1) ou de baixo (+1),
-- considerando só os próximos (o atual não entra na ordem de "a seguir").
-- ---------------------------------------------------------------------------
create function public.move_playlist_item(p_room_id uuid, p_item_id uuid, p_direction integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.playback_state := private.lock_room_playback(p_room_id);
  v_item public.playlist_items;
  v_other public.playlist_items;
begin
  if p_direction not in (-1, 1) then
    raise exception 'invalid_command' using errcode = 'P0001';
  end if;
  select * into v_item from public.playlist_items where id = p_item_id and room_id = p_room_id;
  if not found then
    raise exception 'item_not_found' using errcode = 'P0001';
  end if;

  select * into v_other
  from public.playlist_items
  where room_id = p_room_id
    and id <> p_item_id
    and id is distinct from v_state.current_item_id
    and case when p_direction < 0
      then (position, created_at) < (v_item.position, v_item.created_at)
      else (position, created_at) > (v_item.position, v_item.created_at)
    end
  order by
    case when p_direction < 0 then position end desc,
    case when p_direction < 0 then created_at end desc,
    case when p_direction > 0 then position end asc,
    case when p_direction > 0 then created_at end asc
  limit 1;

  if v_other.id is null then
    return; -- já está na ponta
  end if;

  -- Posições iguais (não deveria acontecer) ainda trocam de ordem pelo desempate.
  update public.playlist_items set position = v_other.position where id = v_item.id;
  update public.playlist_items set position = v_item.position where id = v_other.id;
  if v_item.position = v_other.position then
    update public.playlist_items set position = position + p_direction where id = v_item.id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- advance_to_next: o vídeo atual terminou (ou não pode tocar). Idempotente: todos os membros
-- avisam, mas só o primeiro aviso para o item atual avança; os outros não fazem nada.
-- ---------------------------------------------------------------------------
create function public.advance_to_next(p_room_id uuid, p_from_item_id uuid, p_reason text default 'ended')
returns public.playback_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state public.playback_state := private.lock_room_playback(p_room_id);
  v_next public.playlist_items;
begin
  if p_reason not in ('ended', 'error') then
    raise exception 'invalid_command' using errcode = 'P0001';
  end if;
  if p_from_item_id is null or v_state.current_item_id is distinct from p_from_item_id then
    return v_state; -- já avançou (ou o atual não é mais esse item)
  end if;

  delete from public.playlist_items where id = p_from_item_id;
  v_next := private.next_item(p_room_id, null);

  if v_next.id is null then
    return private.set_playback(p_room_id, null, null, false, 0,
      case when p_reason = 'error' then 'skip_error' else 'stop' end);
  end if;
  return private.set_playback(p_room_id, v_next.id, v_next.video_id, true, 0,
    case when p_reason = 'error' then 'skip_error' else 'next' end);
end;
$$;

revoke all on function public.add_to_playlist(uuid, text, text) from public, anon;
revoke all on function public.play_item(uuid, uuid) from public, anon;
revoke all on function public.remove_from_playlist(uuid, uuid) from public, anon;
revoke all on function public.move_playlist_item(uuid, uuid, integer) from public, anon;
revoke all on function public.advance_to_next(uuid, uuid, text) from public, anon;
grant execute on function public.add_to_playlist(uuid, text, text) to authenticated;
grant execute on function public.play_item(uuid, uuid) to authenticated;
grant execute on function public.remove_from_playlist(uuid, uuid) to authenticated;
grant execute on function public.move_playlist_item(uuid, uuid, integer) to authenticated;
grant execute on function public.advance_to_next(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Mudanças na fila também vão pelo canal da sala (o app recarrega a lista ao receber).
-- ---------------------------------------------------------------------------
create function private.broadcast_playlist_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'room:' || coalesce(new.room_id, old.room_id)::text,
    'playlist',
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;
revoke all on function private.broadcast_playlist_change() from public;

create trigger playlist_items_broadcast
  after insert or update or delete on public.playlist_items
  for each row execute function private.broadcast_playlist_change();
