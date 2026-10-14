-- ========================================================
-- USRC Web — SQL Migration: Phase 3 Final (Pixel Characters, Hobbies, Story Chat)
-- Jalankan di Supabase SQL Editor untuk mendukung seluruh fitur Phase 3.
-- ========================================================

-- 1. Tambah kolom profil pixel, chat status, dan hobi di tabel profiles
alter table profiles add column if not exists pixel_body text default 'light';
alter table profiles add column if not exists pixel_hair text default 'short';
alter table profiles add column if not exists pixel_hair_color text default 'hitam';
alter table profiles add column if not exists pixel_face text default 'normal';
alter table profiles add column if not exists pixel_clothing text default 'hoodie-usrc';
alter table profiles add column if not exists pixel_accessories text default 'none';
alter table profiles add column if not exists pixel_updated_at timestamptz default now();
alter table profiles add column if not exists chat_status text;
alter table profiles add column if not exists hobbies text[];

-- 2. Update get_member_directory() RPC agar mengembalikan data pixel, chat_status, & hobbies
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
  hobbies text[]
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
    p.chat_status,
    p.hobbies
  from profiles p
  where p.status = 'aktif'
  order by p.full_name asc;
$$;

revoke execute on function get_member_directory() from public;
revoke execute on function get_member_directory() from anon;
grant execute on function get_member_directory() to authenticated;
