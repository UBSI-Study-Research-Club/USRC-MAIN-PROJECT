-- ========================================================
-- USRC Web — SQL Migration: Pixel Story v2
-- Jalankan di Supabase SQL Editor.
-- Sumber: prototype notes-profil-v2 (kartu member + catatan 24 jam + statistik)
-- ========================================================

-- 1. Kolom baru
--    chat_status_at : penanda waktu catatan → expired otomatis 24 jam
--    about          : teks "about me" di kartu member
alter table profiles add column if not exists chat_status_at timestamptz;
alter table profiles add column if not exists about text;

-- 2. Backfill: catatan lama dianggap dibuat sekarang
--    (tampil 24 jam ke depan, lalu hilang sendiri)
update profiles set chat_status_at = now()
  where chat_status is not null and chat_status_at is null;

-- 3. RPC v2: tambah kolom baru + statistik beneran
--    (sesi hadir dari attendances approved, karya dari projects approved)
drop function if exists get_member_directory();

create or replace function get_member_directory()
returns table (
  id uuid,
  full_name text,
  prodi text,
  role role_t,
  instagram text,
  github text,
  behance text,
  linkedin text,
  pixel_body text,
  pixel_hair text,
  pixel_hair_color text,
  pixel_face text,
  pixel_clothing text,
  pixel_accessories text,
  chat_status text,
  chat_status_at timestamptz,
  hobbies text[],
  about text,
  sessions_attended bigint,
  projects_count bigint,
  member_since int
)
security definer
set search_path = public
language sql
as $$
  select
    p.id,
    p.full_name,
    p.prodi,
    p.role,
    p.instagram,
    p.github,
    p.behance,
    p.linkedin,
    p.pixel_body,
    p.pixel_hair,
    p.pixel_hair_color,
    p.pixel_face,
    p.pixel_clothing,
    p.pixel_accessories,
    -- catatan lebih dari 24 jam otomatis tidak dikembalikan
    case
      when p.chat_status_at is null or p.chat_status_at >= now() - interval '24 hours'
      then p.chat_status
    end as chat_status,
    case
      when p.chat_status_at is null or p.chat_status_at >= now() - interval '24 hours'
      then p.chat_status_at
    end as chat_status_at,
    p.hobbies,
    p.about,
    (select count(*) from attendances a where a.user_id = p.id and a.status = 'approved'),
    (select count(*) from projects pr where pr.user_id = p.id and pr.status = 'approved'),
    extract(year from p.created_at)::int
  from profiles p
  where p.status = 'aktif'
  order by p.full_name asc;
$$;

revoke execute on function get_member_directory() from public;
revoke execute on function get_member_directory() from anon;
grant execute on function get_member_directory() to authenticated;
