-- ========================================================
-- USRC Web — Supabase Schema & RLS Setup (SPEC.md v1.2 — Gelombang B)
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
  -- Sosmed pembuat (Gelombang B) — URL penuh, opsional, diedit di /profil
  instagram text,
  github text,
  behance text,
  linkedin text,
  -- Status keanggotaan (Gelombang C): nonaktif = dijeda admin,
  -- gak muncul di directory & aksi tulis ditutup di app
  status text not null default 'aktif' check (status in ('aktif', 'nonaktif')),
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
  hobbies text[],
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

-- PROJECTS (Fase 2.1 — link fleksibel pindah ke project_links)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  pdf_url text,
  category text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz default now()
);

-- PROJECT_LINKS (Gelombang B — lampiran fleksibel per karya, maks 6 di form)
create table project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  link_type text not null check (link_type in (
    'repo', 'live', 'instagram', 'youtube', 'behance',
    'figma', 'portfolio', 'image', 'other'
  )),
  url text not null,
  label text,
  created_at timestamptz default now()
);

-- PROJECT_DETAIL_POINTS (Gelombang C — detail karya per poin bertipe)
-- teks/chips/warna/link/tabel — value jsonb sesuai tipe (lihat SQL gelombang C)
create table project_detail_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  point_type text not null check (point_type in ('teks', 'chips', 'warna', 'link', 'tabel')),
  title text,
  value jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
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

-- Hapus anggota = admin saja (Gelombang C — tombol Keluarkan).
-- Tanpa policy ini RLS menolak semua delete, bahkan dari admin.
create policy "Admin delete member"
  on profiles for delete
  using (get_my_role() = 'admin');

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

-- PROJECT_LINKS POLICIES (Gelombang B)
create policy "Read links of visible projects"
  on project_links for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_id
        and (p.status = 'approved' or p.user_id = auth.uid())
    )
    or get_my_role() = 'admin'
  );

create policy "Owner manages links, admin all"
  on project_links for all
  using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
    or get_my_role() = 'admin'
  )
  with check (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
    or get_my_role() = 'admin'
  );

-- PROJECT_DETAIL_POINTS POLICIES (Gelombang C)
create policy "Read detail points of visible projects"
  on project_detail_points for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_id
        and (p.status = 'approved' or p.user_id = auth.uid())
    )
    or get_my_role() = 'admin'
  );

create policy "Owner manages detail points, admin all"
  on project_detail_points for all
  using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
    or get_my_role() = 'admin'
  )
  with check (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
    or get_my_role() = 'admin'
  );

-- PROJECT MEMBERS (Fase 2 revamp: karya kelompok) — pembuat tambahan selain owner
create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (project_id, user_id)
);
alter table project_members enable row level security;

create policy "Read members of visible projects"
  on project_members for select
  using (
    exists (
      select 1 from projects p
      where p.id = project_id
        and (p.status = 'approved' or p.user_id = auth.uid())
    )
    or get_my_role() = 'admin'
  );

-- Insert: owner karya (pilih anggota kelompok saat buat) atau admin.
-- Delete: owner, anggota yang keluar sendiri, atau admin (USING saja untuk delete).
create policy "Owner manages members, member can leave, admin all"
  on project_members for all
  using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
    or user_id = auth.uid()
    or get_my_role() = 'admin'
  )
  with check (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
    or get_my_role() = 'admin'
  );

-- PROJECT STARS (Fase 2 revamp: 1 anggota = 1 bintang per karya, toggle)
create table project_stars (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);
alter table project_stars enable row level security;

create policy "Read stars of approved projects (count for landing), own stars always"
  on project_stars for select
  using (
    exists (select 1 from projects p where p.id = project_id and p.status = 'approved')
    or user_id = auth.uid()
    or get_my_role() = 'admin'
  );

-- 1 bintang per anggota per karya (PK), dilarang bintang karya sendiri,
-- karya harus sudah approved.
create policy "Member stars others' approved project"
  on project_stars for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from projects p
      where p.id = project_id
        and p.status = 'approved'
        and p.user_id <> auth.uid()
    )
  );

create policy "Member unstars own star, admin all"
  on project_stars for delete
  using (user_id = auth.uid() or get_my_role() = 'admin');

-- RPC KARYA (Fase 2.1 — Gelombang C)
-- RLS profiles melarang publik baca nama anggota, tapi card karya harus
-- nampilin "Dibuat oleh siapa" + sosmed pembuat ke tamu → security definer,
-- cuma bocorin nama, sosmed, dan agregat bintang milik karya APPROVED.
-- links/members/detail_points: jsonb sesuai tipe masing-masing.
create or replace function public.get_public_karya()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  pdf_url text,
  category text,
  links jsonb,
  owner_id uuid,
  owner_name text,
  owner_socials jsonb,
  members jsonb,
  detail_points jsonb,
  stars bigint,
  created_at timestamptz
)
language sql security definer stable as $$
  select
    p.id, p.title, p.description, p.image_url, p.pdf_url, p.category,
    coalesce((
      select jsonb_agg(jsonb_build_object('link_type', pl.link_type, 'url', pl.url, 'label', pl.label) order by pl.created_at)
      from project_links pl
      where pl.project_id = p.id
    ), '[]'::jsonb),
    p.user_id, o.full_name,
    jsonb_build_object('instagram', o.instagram, 'github', o.github, 'behance', o.behance, 'linkedin', o.linkedin),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'full_name', pr.full_name, 'instagram', pr.instagram,
        'github', pr.github, 'behance', pr.behance, 'linkedin', pr.linkedin
      ) order by pr.full_name)
      from project_members pm
      join profiles pr on pr.id = pm.user_id
      where pm.project_id = p.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('point_type', d.point_type, 'title', d.title, 'value', d.value) order by d.sort_order, d.created_at)
      from project_detail_points d
      where d.project_id = p.id
    ), '[]'::jsonb),
    (select count(*) from project_stars ps where ps.project_id = p.id),
    p.created_at
  from projects p
  join profiles o on o.id = p.user_id
  where p.status = 'approved'
  order by 13 desc, p.created_at desc;
$$;

grant execute on function public.get_public_karya() to anon, authenticated;

-- Daftar anggota buat form pilih kelompok (khusus yang login — anon ditolak).
-- v3: nonaktif gak ikut (Gelombang C).
create or replace function public.get_member_directory()
returns table (id uuid, full_name text, instagram text, github text, behance text, linkedin text)
language sql security definer stable as $$
  select id, full_name, instagram, github, behance, linkedin
  from profiles
  where status = 'aktif'
  order by full_name;
$$;

grant execute on function public.get_member_directory() to authenticated;

-- Default Postgres kasih EXECUTE ke PUBLIC → tanpa revoke ini, anon bisa
-- narik daftar anggota walau RLS profiles menolak. (Fix kebocoran PR #20.)
revoke execute on function public.get_member_directory() from public;
revoke execute on function public.get_member_directory() from anon;
grant execute on function public.get_member_directory() to authenticated;


-- 5. REALTIME PUBLICATION
-- Idempotent: SQL Editor bisa dijalankan ulang tanpa error "already member".
do $$
begin
  alter publication supabase_realtime add table attendances;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table registrations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table meetings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table project_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table project_stars;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table project_links;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table project_detail_points;
exception when duplicate_object then null;
end $$;

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
      insert into public.profiles (id, full_name, nim, prodi, role, hobbies)
      values (u_id, reg.full_name, reg.nim, reg.prodi, 'anggota', reg.hobbies)
      on conflict (id) do update set
        full_name = EXCLUDED.full_name,
        nim = EXCLUDED.nim,
        prodi = EXCLUDED.prodi,
        hobbies = coalesce(EXCLUDED.hobbies, public.profiles.hobbies);
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

-- 8. REJECT-REAPPLY FIX
-- Unique constraint lama (email,nim) mengunci pendaftar 'rejected' selamanya.
-- Ganti dengan partial index: hanya email aktif (pending/approved) yang di-unlock satu.
alter table public.registrations drop constraint if exists registrations_email_nim_key;
create unique index if not exists registrations_email_active_key
  on public.registrations (lower(email))
  where status in ('pending', 'approved');
