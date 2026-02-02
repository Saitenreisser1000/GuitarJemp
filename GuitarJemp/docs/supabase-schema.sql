-- Supabase Schema für GuitarJemp (Accounts + Library + Sharing + Rollen)
-- Ausführen im Supabase SQL Editor (oder via Migration, falls du supabase-cli nutzt).

-- Benötigt für gen_random_uuid()
create extension if not exists pgcrypto;

-- 1) Profile / Rollen
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);

-- Öffentliches Directory (minimal), damit User andere finden/adden können.
-- Wichtig: Rollen sollen nicht öffentlich auslesbar sein -> daher separate Tabelle.
create table if not exists public.profile_directory (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profile_directory enable row level security;

-- Profile automatisch bei Signup anlegen.
-- Das ist wichtig, wenn Email-Confirmation aktiv ist (dann gibt es beim Signup evtl. noch keine Session).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, null, 'student')
  on conflict (id) do nothing;

  insert into public.profile_directory (id, display_name)
  values (new.id, null)
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- display_name aus profiles in profile_directory spiegeln
create or replace function public.sync_profile_directory()
returns trigger as $$
begin
  insert into public.profile_directory (id, display_name)
  values (new.id, new.display_name)
  on conflict (id) do update set display_name = excluded.display_name;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profiles_upsert_sync_directory on public.profiles;
create trigger on_profiles_upsert_sync_directory
after insert or update of display_name on public.profiles
for each row execute procedure public.sync_profile_directory();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Re-run safety: Policies vor erneutem Erstellen entfernen (löscht keine Tabellen-Daten).
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "profile_directory_select_authenticated" on public.profile_directory;
drop policy if exists "profile_directory_upsert_own" on public.profile_directory;
drop policy if exists "profile_directory_update_own" on public.profile_directory;

drop policy if exists "connections_select_participants" on public.connections;
drop policy if exists "connections_insert_requester" on public.connections;
drop policy if exists "connections_update_participants" on public.connections;

drop policy if exists "library_items_owner_select" on public.library_items;
drop policy if exists "library_items_owner_insert" on public.library_items;
drop policy if exists "library_items_owner_update" on public.library_items;
drop policy if exists "library_items_owner_delete" on public.library_items;
drop policy if exists "library_items_public_select" on public.library_items;
drop policy if exists "library_items_connections_select" on public.library_items;
drop policy if exists "library_items_shared_select" on public.library_items;

drop policy if exists "library_item_shares_owner_insert" on public.library_item_shares;
drop policy if exists "library_item_shares_owner_delete" on public.library_item_shares;
drop policy if exists "library_item_shares_participants_select" on public.library_item_shares;

-- Nutzer darf eigenes Profil lesen/updaten
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Directory: jeder authentifizierte User darf suchen/lesen
create policy "profile_directory_select_authenticated"
  on public.profile_directory for select
  using (auth.role() = 'authenticated');

-- Directory: User darf eigenen Eintrag setzen/ändern (optional, trigger macht's ohnehin)
create policy "profile_directory_upsert_own"
  on public.profile_directory for insert
  with check (auth.uid() = id);

create policy "profile_directory_update_own"
  on public.profile_directory for update
  using (auth.uid() = id);

-- Optional: andere Profile lesen, aber nur minimale Daten (für Suche/Connections)
-- (wenn du das willst, kannst du ein View statt policy verwenden).

-- 2) Verbindungen (Connections) zwischen Accounts
create table if not exists public.connections (
  id bigint generated by default as identity primary key,
  requester_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- Falls die Tabelle schon existiert: Default nachziehen.
alter table public.connections alter column requester_id set default auth.uid();

create index if not exists connections_requester_idx on public.connections(requester_id);
create index if not exists connections_addressee_idx on public.connections(addressee_id);

alter table public.connections enable row level security;

create policy "connections_select_participants"
  on public.connections for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "connections_insert_requester"
  on public.connections for insert
  with check (auth.uid() = requester_id);

create policy "connections_update_participants"
  on public.connections for update
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Helper View: akzeptierte Connections (symmetrisch verwendbar)
create or replace view public.accepted_connections as
select
  case when requester_id < addressee_id then requester_id else addressee_id end as user_a,
  case when requester_id < addressee_id then addressee_id else requester_id end as user_b
from public.connections
where status = 'accepted';

-- 3) Library Items: Songs/Übungen als JSON (skalierbar, schema-evolvable)
create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('song', 'exercise')),
  title text not null,
  category text,
  visibility text not null default 'private' check (visibility in ('private', 'connections', 'public')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Falls die Tabelle schon existiert: Default nachziehen.
alter table public.library_items alter column owner_id set default auth.uid();

create index if not exists library_items_owner_idx on public.library_items(owner_id);
create index if not exists library_items_visibility_idx on public.library_items(visibility);

alter table public.library_items enable row level security;

-- updated_at automatisch
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_library_items_updated_at on public.library_items;
create trigger set_library_items_updated_at
before update on public.library_items
for each row execute function public.set_updated_at();

-- Owner darf alles
create policy "library_items_owner_select"
  on public.library_items for select
  using (auth.uid() = owner_id);

create policy "library_items_owner_insert"
  on public.library_items for insert
  with check (auth.uid() = owner_id);

create policy "library_items_owner_update"
  on public.library_items for update
  using (auth.uid() = owner_id);

create policy "library_items_owner_delete"
  on public.library_items for delete
  using (auth.uid() = owner_id);

-- Public: jeder authentifizierte User darf public sehen
create policy "library_items_public_select"
  on public.library_items for select
  using (visibility = 'public' and auth.role() = 'authenticated');

-- Connections: sichtbar, wenn accepted connection zwischen viewer und owner existiert
create policy "library_items_connections_select"
  on public.library_items for select
  using (
    visibility = 'connections'
    and exists (
      select 1
      from public.accepted_connections ac
      where (ac.user_a = auth.uid() and ac.user_b = owner_id)
         or (ac.user_b = auth.uid() and ac.user_a = owner_id)
    )
  );

-- 4) Optional: explizites Teilen (z.B. Lehrer -> Schüler), granularer als visibility
create table if not exists public.library_item_shares (
  id bigint generated by default as identity primary key,
  library_item_id uuid not null references public.library_items(id) on delete cascade,
  shared_with_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (library_item_id, shared_with_id)
);

create index if not exists library_item_shares_item_idx on public.library_item_shares(library_item_id);
create index if not exists library_item_shares_user_idx on public.library_item_shares(shared_with_id);

alter table public.library_item_shares enable row level security;

create policy "library_item_shares_owner_insert"
  on public.library_item_shares for insert
  with check (
    exists (
      select 1 from public.library_items li
      where li.id = library_item_id and li.owner_id = auth.uid()
    )
  );

create policy "library_item_shares_owner_delete"
  on public.library_item_shares for delete
  using (
    exists (
      select 1 from public.library_items li
      where li.id = library_item_id and li.owner_id = auth.uid()
    )
  );

create policy "library_item_shares_participants_select"
  on public.library_item_shares for select
  using (
    auth.uid() = shared_with_id
    or exists (
      select 1 from public.library_items li
      where li.id = library_item_id and li.owner_id = auth.uid()
    )
  );

-- Items via share sichtbar
create policy "library_items_shared_select"
  on public.library_items for select
  using (
    exists (
      select 1 from public.library_item_shares s
      where s.library_item_id = public.library_items.id and s.shared_with_id = auth.uid()
    )
  );
