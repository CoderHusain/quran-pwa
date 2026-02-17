
-- =============================
-- Quran Tracker: full migration
-- =============================

-- extensions
create extension if not exists pgcrypto;

-- -----------------------------
-- tables
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  its text unique,
  email text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.read_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  juz_number int not null check (juz_number between 1 and 30),
  surah_number int check (surah_number between 1 and 114),
  read_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  location_accuracy_m double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_read_logs_user_id on public.read_logs(user_id);
create index if not exists idx_read_logs_read_at on public.read_logs(read_at desc);
create index if not exists idx_profiles_its on public.profiles(lower(its));

-- -----------------------------
-- migrations: add missing columns
-- -----------------------------
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
    alter table public.profiles add column email text unique;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name') then
    alter table public.profiles add column full_name text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'its') then
    alter table public.profiles add column its text unique;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin') then
    alter table public.profiles add column is_admin boolean not null default false;
  end if;
end $$;

-- backfill email from auth.users if needed
update public.profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id and p.email is null;

-- backfill its and full_name from metadata if needed
update public.profiles p
set 
  full_name = coalesce(p.full_name, u.raw_user_meta_data->>'full_name'),
  its = coalesce(p.its, lower(u.raw_user_meta_data->>'its'))
from auth.users u
where p.id = u.id and (p.full_name is null or p.its is null);

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.profiles enable row level security;
alter table public.read_logs enable row level security;

-- helper
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid and p.is_admin = true
  );
$$;

-- -----------------------------
-- policies (drop/recreate safe)
-- -----------------------------
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);

create policy profiles_select_admin on public.profiles
for select using (public.is_admin(auth.uid()));

create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update using (auth.uid() = id);

drop policy if exists read_logs_select_own on public.read_logs;
drop policy if exists read_logs_select_admin on public.read_logs;
drop policy if exists read_logs_insert_own on public.read_logs;

create policy read_logs_select_own on public.read_logs
for select using (auth.uid() = user_id);

create policy read_logs_select_admin on public.read_logs
for select using (public.is_admin(auth.uid()));

create policy read_logs_insert_own on public.read_logs
for insert with check (auth.uid() = user_id);

-- -----------------------------
-- trigger: keep profile synced from auth.users
-- -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, its, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    coalesce(lower(new.raw_user_meta_data->>'its'), null),
    lower(new.email)
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        its = excluded.its,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- -----------------------------
-- RPC: ITS -> email (for sign in)
-- -----------------------------
create or replace function public.get_email_by_its(p_its text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(p.its) = lower(trim(p_its))
  limit 1;
$$;

grant execute on function public.get_email_by_its(text) to anon, authenticated;

-- -----------------------------
-- RPC: admin dashboard logs
-- -----------------------------
drop function if exists public.get_all_read_logs_admin();

create or replace function public.get_all_read_logs_admin()
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  its text,
  email text,
  juz_number int,
  surah_number int,
  read_at timestamptz,
  lat double precision,
  lng double precision,
  location_accuracy_m double precision,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    rl.id,
    rl.user_id,
    p.full_name,
    p.its,
    p.email,
    rl.juz_number,
    rl.surah_number,
    rl.read_at,
    rl.lat,
    rl.lng,
    rl.location_accuracy_m,
    rl.created_at
  from public.read_logs rl
  join public.profiles p on p.id = rl.user_id
  where public.is_admin(auth.uid())
  order by rl.read_at desc;
$$;

grant execute on function public.get_all_read_logs_admin() to authenticated;

-- -----------------------------
-- backfill: create profiles for existing users
-- -----------------------------
insert into public.profiles (id, full_name, its, email)
select 
  u.id,
  u.raw_user_meta_data->>'full_name',
  lower(u.raw_user_meta_data->>'its'),
  lower(u.email)
from auth.users u
left join public.profiles p on u.id = p.id
where p.id is null
on conflict (id) do nothing;
