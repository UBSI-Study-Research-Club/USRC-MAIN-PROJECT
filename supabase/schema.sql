-- ========================================================
-- USRC Web — Supabase Schema & RLS Setup (SPEC.md v1.1)
-- Project: wagvbmkimpswiidnenwx
-- ========================================================

-- 1. ENUMS & TYPES
create type role_t as enum ('anggota', 'sekre', 'admin');
create type att_status as enum ('pending', 'approved');

-- 2. TABLES

-- PROFILES (Linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  nim text unique,
  prodi text not null check (prodi in ('Informatika', 'Sistem Informasi', 'SI Akuntansi')),
  role role_t not null default 'anggota',
  created_at timestamptz default now()
);

-- REGISTRATIONS (Public Application Queue)
create table registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  nim text not null,
  prodi text not null check (prodi in ('Informatika', 'Sistem Informasi', 'SI Akuntansi')),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  constraint registrations_email_nim_key unique (email, nim)
);

-- MEETINGS (Sessions & Events)
create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recap_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ATTENDANCES (Attendance Log)
create table attendances (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status att_status not null default 'pending',
  checked_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);

-- PROJECTS (Fase 2)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  repo_url text,
  live_url text,
  category text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz default now()
);

-- 3. HELPER FUNCTIONS

-- Check if current time is within meeting attendance window
create or replace function public.is_within_window(p_meeting_id uuid)
returns boolean as $$
declare
  v_starts timestamptz;
  v_ends timestamptz;
begin
  select starts_at, ends_at into v_starts, v_ends
  from public.meetings
  where id = p_meeting_id;
  
  if not found then
    return false;
  end if;
  
  return (now() >= (v_starts - interval '30 minutes') and now() <= v_ends);
end;
$$ language plpgsql security definer;

-- Helper to check user role from profiles
create or replace function public.get_my_role()
returns role_t as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- 4. ROW LEVEL SECURITY (RLS)

alter table profiles enable row level security;
alter table registrations enable row level security;
alter table meetings enable row level security;
alter table attendances enable row level security;
alter table projects enable row level security;

-- PROFILES POLICIES
create policy "Read own profile or sekre/admin read all"
  on profiles for select
  using (auth.uid() = id or get_my_role() in ('sekre', 'admin'));

create policy "Update own name or admin update all"
  on profiles for update
  using (auth.uid() = id or get_my_role() = 'admin');

-- REGISTRATIONS POLICIES
create policy "Public insert registration"
  on registrations for insert
  with check (true);

create policy "Sekre and Admin read registrations"
  on registrations for select
  using (get_my_role() in ('sekre', 'admin'));

create policy "Sekre and Admin update registrations"
  on registrations for update
  using (get_my_role() in ('sekre', 'admin'));

-- MEETINGS POLICIES
create policy "Anon read past meetings, Members read all"
  on meetings for select
  using (
    (auth.role() = 'anon' and ends_at < now()) or
    (auth.role() = 'authenticated')
  );

create policy "Sekre and Admin CUD meetings"
  on meetings for all
  using (get_my_role() in ('sekre', 'admin'));

-- ATTENDANCES POLICIES
create policy "Read own attendance or sekre/admin read all"
  on attendances for select
  using (auth.uid() = user_id or get_my_role() in ('sekre', 'admin'));

create policy "Insert attendance only within window"
  on attendances for insert
  with check (
    auth.uid() = user_id and
    is_within_window(meeting_id) and
    status = 'pending'
  );

create policy "Sekre and Admin update/delete attendance"
  on attendances for all
  using (get_my_role() in ('sekre', 'admin'));

-- PROJECTS POLICIES (Fase 2)
create policy "Public read approved projects, owner/admin read all"
  on projects for select
  using (status = 'approved' or auth.uid() = user_id or get_my_role() = 'admin');

create policy "Member insert own project"
  on projects for insert
  with check (auth.uid() = user_id and status = 'pending');

create policy "Owner or Admin update/delete project"
  on projects for all
  using (auth.uid() = user_id or get_my_role() = 'admin');

-- 5. REALTIME PUBLICATION
alter publication supabase_realtime add table attendances;
alter publication supabase_realtime add table registrations;

-- 6. RPC & TRIGGERS FOR MEMBER REGISTRATION & PROFILE CREATION

-- Trigger to auto-create profile when an approved registrant signs in via OTP for the first time
create or replace function public.handle_new_user_profile()
returns trigger as $$
declare
  reg record;
begin
  select * into reg from public.registrations
  where lower(email) = lower(new.email) and status = 'approved'
  limit 1;

  if found then
    insert into public.profiles (id, full_name, nim, prodi, role)
    values (new.id, reg.full_name, reg.nim, reg.prodi, 'anggota')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- RPC for Sekre/Admin to approve registration and sync profile
create or replace function public.approve_registration(reg_id uuid)
returns void as $$
declare
  reg record;
  u_id uuid;
begin
  if public.get_my_role() not in ('sekre', 'admin') then
    raise exception 'Unauthorized';
  end if;

  update public.registrations
  set status = 'approved'
  where id = reg_id
  returning * into reg;

  if found then
    select id into u_id from auth.users where lower(email) = lower(reg.email) limit 1;
    if u_id is not null then
      insert into public.profiles (id, full_name, nim, prodi, role)
      values (u_id, reg.full_name, reg.nim, reg.prodi, 'anggota')
      on conflict (id) do update set
        full_name = EXCLUDED.full_name,
        nim = EXCLUDED.nim,
        prodi = EXCLUDED.prodi;
    end if;
  end if;
end;
$$ language plpgsql security definer;


-- 7. PUBLIC STATS (landing page — anon tidak boleh baca profiles langsung)
-- Tamu lihat angka yang sama dengan yang login. Sessions = sesi lampau saja.
create or replace function public.get_public_stats()
returns table (members bigint, sessions bigint, projects bigint)
language sql
security definer
stable
set search_path = public
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.meetings where ends_at < now()),
    (select count(*) from public.projects where status = 'approved');
$$;

revoke execute on function public.get_public_stats() from public;
grant execute on function public.get_public_stats() to anon, authenticated;
