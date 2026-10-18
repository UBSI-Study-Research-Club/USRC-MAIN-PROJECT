-- Migrasi: Dukung kolom pdf_url dan perbarui RPC get_public_karya agar membawa dokumen PDF ke publik
-- Jalankan di Supabase SQL Editor

-- 1. Tambahkan kolom pdf_url pada tabel projects (jika belum ada)
alter table public.projects add column if not exists pdf_url text;

-- 2. Update RPC get_public_karya agar mengembalikan pdf_url
drop function if exists public.get_public_karya();

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
