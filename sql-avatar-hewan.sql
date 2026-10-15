-- ========================================================
-- USRC Web — SQL Migration: Avatar Hewan (Pixel Animals)
-- Jalankan di Supabase SQL Editor.
-- Sumber: prototype "Profil Saya" — pixel karakter custom
-- diganti avatar hewan pilihan (avatar_id) + warna latar (avatar_bg).
-- Aset visual menyusul via PR Adit/Yoga; grid placeholder di kode.
-- ========================================================

-- 1. Kolom baru
alter table profiles add column if not exists avatar_id text;
alter table profiles add column if not exists avatar_bg text;

-- 2. Backfill: semua anggota mulai dengan kucing + latar pink
update profiles
  set avatar_id = 'kucing', avatar_bg = '#E38595'
  where avatar_id is null;

-- 3. RPC: tambahkan avatar_id & avatar_bg ke directory
--    (kolom pixel_* lama tetap dikembalikan — tidak dihapus,
--    migrasi penuh menunggu aset final)
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
  member_since int,
  avatar_id text,
  avatar_bg text
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
    extract(year from p.created_at)::int,
    p.avatar_id,
    p.avatar_bg
  from profiles p
  where p.status = 'aktif'
  order by p.full_name asc;
$$;

revoke execute on function get_member_directory() from public;
revoke execute on function get_member_directory() from anon;
grant execute on function get_member_directory() to authenticated;
