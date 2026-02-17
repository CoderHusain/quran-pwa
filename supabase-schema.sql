-- Run this in Supabase SQL editor

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz default now()
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
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.read_logs enable row level security;

create policy if not exists profiles_select_own on public.profiles
for select using (auth.uid() = id);

create policy if not exists profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

create policy if not exists profiles_update_own on public.profiles
for update using (auth.uid() = id);

create policy if not exists read_logs_select_own on public.read_logs
for select using (auth.uid() = user_id);

create policy if not exists read_logs_insert_own on public.read_logs
for insert with check (auth.uid() = user_id);

-- Optional: create profile row after signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
