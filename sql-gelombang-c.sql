-- ============================================================
-- GELOMBANG C — DETAIL POIN KARYA + STATUS ANGGOTA (Fase 2.1)
-- Jalankan di Supabase SQL Editor. Aman dijalankan ulang
-- (idempotent) — TIDAK ADA bagian destruktif di file ini.
-- ============================================================

-- ============ 1. TABEL PROJECT_DETAIL_POINTS ============
-- Detail karya = daftar poin bertipe (keputusan Raken+Chello):
--   teks  -> value: {"text": "..."}
--   chips -> value: {"items": ["python", "js", ...]}        (bebas ketik)
--   warna -> value: {"colors": ["#RRGGBB", ...]}            (palette)
--   link  -> value: {"url": "...", "label": "..."}
--   tabel -> value: {"headers": [...], "rows": [[...], ...]}
create table if not exists project_detail_points (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  point_type text not null check (point_type in ('teks', 'chips', 'warna', 'link', 'tabel')),
  title text,
  value jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table project_detail_points enable row level security;

drop policy if exists "Read detail points of visible projects" on project_detail_points;
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

drop policy if exists "Owner manages detail points, admin all" on project_detail_points;
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

-- ============ 2. STATUS ANGGOTA (aktif / nonaktif) ============
-- Nonaktif = dijeda admin (masih bisa login, tapi gak muncul di directory
-- dan aksi tulis ditutup di app). Hapus anggota = delete profiles
-- (cascade permanen — hanya dari Panel Admin dengan konfirmasi).
alter table profiles add column if not exists status text not null default 'aktif'
  check (status in ('aktif', 'nonaktif'));

-- profiles gak punya policy DELETE sama sekali sejak awal → tanpa ini,
-- tombol "Keluarkan" selalu ditolak RLS walau untuk admin.
drop policy if exists "Admin delete member" on profiles;
create policy "Admin delete member"
  on profiles for delete
  using (get_my_role() = 'admin');

-- ============ 3. REALTIME PUBLICATION (idempotent) ============
do $$
begin
  alter publication supabase_realtime add table project_detail_points;
exception when duplicate_object then null;
end $$;

-- ============ 4. RPC get_member_directory v3 ============
-- Nonaktif gak muncul di pilihan anggota kelompok.
-- Return type gak berubah dari v2, tapi tetap drop-create biar konsisten.
drop function if exists public.get_member_directory();
create or replace function public.get_member_directory()
returns table (id uuid, full_name text, instagram text, github text, behance text, linkedin text)
language sql security definer stable as $$
  select id, full_name, instagram, github, behance, linkedin
  from profiles
  where status = 'aktif'
  order by full_name;
$$;

revoke execute on function public.get_member_directory() from public;
revoke execute on function public.get_member_directory() from anon;
grant execute on function public.get_member_directory() to authenticated;

-- ============ 5. RPC get_public_karya v3 ============
-- Sekarang ikut bawa detail poin (jsonb array, urut sort_order).
-- Return type berubah → drop dulu (pola anti-42P13).
drop function if exists public.get_public_karya();
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
  detail_points jsonb,
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
  order by 12 desc, p.created_at desc;
$$;

grant execute on function public.get_public_karya() to anon, authenticated;

-- ============================================================
-- VERIFIKASI (jalankan terpisah setelah Run):
--   select count(*) from project_detail_points;   -- 0
--   select status, count(*) from profiles group by status;  -- semua 'aktif'
--   select * from get_public_karya();             -- detail_points: []
-- ============================================================
