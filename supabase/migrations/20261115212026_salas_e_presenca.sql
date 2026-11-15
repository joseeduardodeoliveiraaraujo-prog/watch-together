-- Etapa 4 — salas: criar, entrar por código, sair; autorização do canal em tempo real.
--
-- Erros de negócio saem como exceção com código P0001 e mensagem curta (ex.: 'room_full'),
-- traduzidos no app em src/features/rooms/roomErrors.ts.

-- Máximo de pessoas por sala e de salas por pessoa.
create function private.room_capacity() returns integer language sql immutable as $$ select 4 $$;
create function private.max_rooms_per_user() returns integer language sql immutable as $$ select 20 $$;

-- ---------------------------------------------------------------------------
-- Código de convite: 6 caracteres sem ambíguos (sem 0/O, 1/I/L), aleatoriedade criptográfica
-- (gen_random_uuid). O código é o "segredo" para entrar: 31^6 ≈ 887 milhões de combinações.
-- ---------------------------------------------------------------------------
create function private.generate_room_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := uuid_send(gen_random_uuid());
  result text := '';
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_room: cria a sala, coloca o criador como membro e dono, e o estado de reprodução.
-- ---------------------------------------------------------------------------
create function public.create_room()
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_room public.rooms;
begin
  if (select count(*) from public.room_members where user_id = v_uid) >= private.max_rooms_per_user() then
    raise exception 'too_many_rooms' using errcode = 'P0001';
  end if;

  -- Colisão de código é raríssima; tenta de novo algumas vezes.
  for attempt in 1..5 loop
    begin
      insert into public.rooms (code, owner_id)
      values (private.generate_room_code(), v_uid)
      returning * into v_room;
      exit;
    exception when unique_violation then
      if attempt = 5 then
        raise;
      end if;
    end;
  end loop;

  insert into public.room_members (room_id, user_id) values (v_room.id, v_uid);
  insert into public.playback_state (room_id) values (v_room.id);
  return v_room;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_room: entra pelo código. Idempotente para quem já é membro.
-- A trava (for update) na sala impede que duas entradas simultâneas passem do limite.
-- ---------------------------------------------------------------------------
create function public.join_room(p_code text)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_room public.rooms;
begin
  select * into v_room from public.rooms where code = v_code for update;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = v_uid) then
    update public.rooms set last_activity_at = now() where id = v_room.id returning * into v_room;
    return v_room;
  end if;

  if (select count(*) from public.room_members where room_id = v_room.id) >= private.room_capacity() then
    raise exception 'room_full' using errcode = 'P0001';
  end if;

  if (select count(*) from public.room_members where user_id = v_uid) >= private.max_rooms_per_user() then
    raise exception 'too_many_rooms' using errcode = 'P0001';
  end if;

  insert into public.room_members (room_id, user_id) values (v_room.id, v_uid);
  update public.rooms set last_activity_at = now() where id = v_room.id returning * into v_room;
  return v_room;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_room: sai da sala. Sala vazia é apagada; se o dono sai, passa para o membro mais antigo.
-- Idempotente: sair de uma sala em que não está não dá erro.
-- ---------------------------------------------------------------------------
create function public.leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_room public.rooms;
  v_next_owner uuid;
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    return;
  end if;

  delete from public.room_members where room_id = p_room_id and user_id = v_uid;
  if not found then
    return;
  end if;

  select user_id into v_next_owner
  from public.room_members
  where room_id = p_room_id
  order by joined_at, user_id
  limit 1;

  if v_next_owner is null then
    delete from public.rooms where id = p_room_id;
  elsif v_room.owner_id is null or v_room.owner_id = v_uid then
    update public.rooms set owner_id = v_next_owner, last_activity_at = now() where id = p_room_id;
  else
    update public.rooms set last_activity_at = now() where id = p_room_id;
  end if;
end;
$$;

-- Funções criadas recebem EXECUTE para PUBLIC por padrão no Postgres: fechar e liberar só o necessário.
revoke all on function private.room_capacity() from public;
revoke all on function private.max_rooms_per_user() from public;
revoke all on function private.generate_room_code() from public;
revoke all on function private.require_user() from public;
revoke all on function public.create_room() from public, anon;
revoke all on function public.join_room(text) from public, anon;
revoke all on function public.leave_room(uuid) from public, anon;
grant execute on function public.create_room() to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: canal privado "room:<uuid>" só para membros da sala (presença e broadcast).
-- Exige "Allow public access" DESLIGADO nas configurações de Realtime do projeto.
-- ---------------------------------------------------------------------------
create function private.can_access_room_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_topic is null or p_topic !~ '^room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.is_room_member(substr(p_topic, 6)::uuid);
end;
$$;

revoke all on function private.can_access_room_topic(text) from public;
grant execute on function private.can_access_room_topic(text) to authenticated;

create policy "sala: membros recebem presença e mensagens"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('presence', 'broadcast')
    and (select private.can_access_room_topic(realtime.topic()))
  );

create policy "sala: membros enviam presença e mensagens"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('presence', 'broadcast')
    and (select private.can_access_room_topic(realtime.topic()))
  );
