-- ============================================================
-- GELOMBANG B — LINK FLEKSIBEL + SOSMED PROFIL (Fase 2.1)
-- Jalankan di Supabase SQL Editor. SEKALI saja.
--
-- ⚠ BAGIAN 1 DESTRUKTIF: menghapus SEMUA karya lama (keputusan
--   Raken 2026-10-12 — gak ada migrasi). Jangan jalankan ulang
--   setelah anggota mulai isi karya baru.
--
-- Urutan aman dijalankan berulang kecuali Bagian 1.
-- Setelah Run: verifikasi pakai kueri di bagian paling bawah.
-- ============================================================

-- ============ 1. HAPUS KARYA LAMA (SEKALI SAJA — DESTRUKTIF) ============
-- project_stars & project_members ikut terhapus otomatis (ON DELETE CASCADE).
delete from projects;

-- ============ 2. KOLOM SOSMED DI PROFILES ============
alter table profiles add column if not exists instagram text;
alter table profiles add column if not exists github    text;
alter table profiles add column if not exists behance   text;
alter table profiles add column if not exists linkedin  text;

-- ============ 3. TABEL PROJECT_LINKS ============
-- Lampiran fleksibel per karya — maks 6 divalidasi di form (bukan DB).
create table if not exists project_links (
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
alter table project_links enable row level security;

drop policy if exists "Read links of visible projects" on project_links;
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

drop policy if exists "Owner manages links, admin all" on project_links;
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

-- ============ 4. DROP KOLOM LINK LAMA DI PROJECTS ============
alter table projects drop column if exists repo_url;
alter table projects drop column if exists live_url;

-- ============ 5. REALTIME PUBLICATION (idempotent) ============
do $$
begin
  alter publication supabase_realtime add table project_links;
exception when duplicate_object then null;
end $$;

-- ============ 6. RPC get_public_karya v2 ============
-- links: jsonb array [{link_type,url,label}]
-- owner_socials: jsonb {instagram,github,behance,linkedin}
-- members: jsonb array [{full_name,instagram,github,behance,linkedin}]
-- Urutan: bintang terbanyak, lalu terbaru.
create or replace function public.get_public_karya()
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  category text,
  links jsonb,
  owner_id uuid,
  owner_name text,
  owner_socials jsonb,
  members jsonb,
  stars bigint,
  created_at timestamptz
)
language sql security definer stable as $$
  select
    p.id, p.title, p.description, p.image_url, p.category,
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
    (select count(*) from project_stars ps where ps.project_id = p.id),
    p.created_at
  from projects p
  join profiles o on o.id = p.user_id
  where p.status = 'approved'
  order by 11 desc, p.created_at desc;
$$;

grant execute on function public.get_public_karya() to anon, authenticated;

-- ============ 7. RPC get_member_directory v2 ============
-- Sekarang ikut bawa sosmed (dipakai kotak anggota di Gelombang C).
create or replace function public.get_member_directory()
returns table (id uuid, full_name text, instagram text, github text, behance text, linkedin text)
language sql security definer stable as $$
  select id, full_name, instagram, github, behance, linkedin from profiles order by full_name;
$$;

grant execute on function public.get_member_directory() to authenticated;

-- ============================================================
-- VERIFIKASI (jalankan terpisah setelah Run):
--   select count(*) from project_links;                    -- 0
--   select instagram, github from profiles limit 1;        -- kolom ada
--   select * from get_public_karya();                      -- links: []
--   select * from get_member_directory();                  -- ada kolom sosmed
-- Atau probe REST dengan anon key:
--   POST /rest/v1/rpc/get_public_karya  body {}
-- ============================================================
