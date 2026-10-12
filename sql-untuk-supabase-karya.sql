-- BLOK SQL UNTUK SUPABASE SQL EDITOR — karya revamp (F2.2)
-- Sumber: supabase/schema.sql (PR #20). Jalankan SEKALI.
-- Kalau sebagian sudah pernah jalan, hapus statement yang error lalu jalankan sisanya.

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

-- RPC KARYA (Fase 2 revamp)
-- RLS profiles melarang publik baca nama anggota, tapi card karya harus
-- nampilin "Dibuat oleh siapa" ke tamu → security definer, cuma bocorin
-- nama + agregat bintang milik karya APPROVED.
create or replace function public.get_public_karya()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  category text,
  repo_url text,
  live_url text,
  owner_id uuid,
  owner_name text,
  members text[],
  stars bigint,
  created_at timestamptz
)
language sql security definer stable as $$
  select
    p.id, p.title, p.description, p.image_url, p.category, p.repo_url, p.live_url,
    p.user_id, o.full_name,
    coalesce((
      select array_agg(pr.full_name order by pr.full_name)
      from project_members pm
      join profiles pr on pr.id = pm.user_id
      where pm.project_id = p.id
    ), '{}'),
    (select count(*) from project_stars ps where ps.project_id = p.id),
    p.created_at
  from projects p
  join profiles o on o.id = p.user_id
  where p.status = 'approved'
  order by 11 desc, p.created_at desc;
$$;

grant execute on function public.get_public_karya() to anon, authenticated;

-- Daftar anggota buat form pilih kelompok (khusus yang login — anon ditolak).
create or replace function public.get_member_directory()
returns table (id uuid, full_name text)
language sql security definer stable as $$
  select id, full_name from profiles order by full_name;
$$;

grant execute on function public.get_member_directory() to authenticated;
