-- Etapa 3 — schema inicial: perfis, salas, membros, playlist e estado de reprodução.
--
-- Regras de segurança (ver docs/adr/0005-supabase-schema-e-rls.md):
--  * RLS ligado em todas as tabelas; o app usa só a chave publishable.
--  * O projeto NÃO expõe tabelas novas automaticamente: cada GRANT aqui é intencional.
--  * O app só LÊ salas/membros/playlist/reprodução. Escritas virão por funções (RPC) nas
--    Etapas 4–6, com trava e validação. A única escrita direta é o próprio apelido.
--  * Funções auxiliares ficam no schema `private`, que não é exposto pela Data API.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Utilitário: updated_at
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: 1 linha por usuário, criada por trigger no cadastro
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 30 and display_name = btrim(display_name)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Cria o perfil a partir do apelido enviado no signUp (options.data.display_name).
-- Se vier vazio, usa a parte do e-mail antes do @. Nunca pode falhar: bloquearia o cadastro.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 30);
  if v_name = '' then
    v_name := left(coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Usuário'), 30);
  end if;
  insert into public.profiles (id, display_name) values (new.id, btrim(v_name));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  -- 6 caracteres sem ambíguos (sem 0/O, 1/I/L).
  code text not null unique check (code ~ '^[A-HJKMNP-Z2-9]{6}$'),
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index rooms_owner_id_idx on public.rooms (owner_id);

-- ---------------------------------------------------------------------------
-- room_members (limite de 4 por sala garantido pela RPC join_room, Etapa 4)
-- ---------------------------------------------------------------------------
create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index room_members_user_id_idx on public.room_members (user_id);

-- ---------------------------------------------------------------------------
-- playlist_items
-- ---------------------------------------------------------------------------
create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text check (char_length(title) <= 200),
  added_by uuid references public.profiles (id) on delete set null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now()
);

create index playlist_items_room_position_idx on public.playlist_items (room_id, position);

-- ---------------------------------------------------------------------------
-- playback_state: fonte da verdade da reprodução (1 linha por sala).
-- Posição atual = position_seconds + (agora − position_updated_at) se is_playing.
-- ---------------------------------------------------------------------------
create table public.playback_state (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  current_item_id uuid references public.playlist_items (id) on delete set null,
  video_id text check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  is_playing boolean not null default false,
  position_seconds double precision not null default 0 check (position_seconds >= 0),
  position_updated_at timestamptz not null default now(),
  version bigint not null default 0,
  last_command_id uuid,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index playback_state_current_item_idx on public.playback_state (current_item_id);
create index playback_state_updated_by_idx on public.playback_state (updated_by);
create index playlist_items_added_by_idx on public.playlist_items (added_by);

-- ---------------------------------------------------------------------------
-- Funções auxiliares de RLS (security definer evita recursão em room_members)
-- ---------------------------------------------------------------------------
create function private.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room_id and m.user_id = (select auth.uid())
  );
$$;

-- O usuário atual está em alguma sala junto com p_user_id?
create function private.shares_room_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members mine
    join public.room_members theirs on theirs.room_id = mine.room_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.is_room_member(uuid) from public;
revoke all on function private.shares_room_with(uuid) from public;
grant execute on function private.is_room_member(uuid) to authenticated;
grant execute on function private.shares_room_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.playlist_items enable row level security;
alter table public.playback_state enable row level security;

create policy "perfil: ver o próprio e o de quem divide sala"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_room_with(id));

create policy "perfil: editar o próprio"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "salas: membros veem"
  on public.rooms for select to authenticated
  using (private.is_room_member(id));

create policy "membros: membros da sala veem"
  on public.room_members for select to authenticated
  using (private.is_room_member(room_id));

create policy "playlist: membros da sala veem"
  on public.playlist_items for select to authenticated
  using (private.is_room_member(room_id));

create policy "reprodução: membros da sala veem"
  on public.playback_state for select to authenticated
  using (private.is_room_member(room_id));

-- ---------------------------------------------------------------------------
-- GRANTs (explícitos: "Automatically expose new tables" está desligado)
-- ---------------------------------------------------------------------------
revoke all on table
  public.profiles, public.rooms, public.room_members, public.playlist_items, public.playback_state
  from anon, authenticated;

grant select on table
  public.profiles, public.rooms, public.room_members, public.playlist_items, public.playback_state
  to authenticated;

-- Só o apelido é editável pelo app.
grant update (display_name) on table public.profiles to authenticated;

grant all on table
  public.profiles, public.rooms, public.room_members, public.playlist_items, public.playback_state
  to service_role;
