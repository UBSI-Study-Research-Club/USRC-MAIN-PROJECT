-- ============ RPC get_public_past_meetings ============
-- Memungkinkan tamu (anon) dan anggota melihat daftar sesi lampau beserta
-- hitung jumlah hadir (attendee_count) secara aman tanpa terhalang RLS attendances.
-- Sumber: SPEC.md §5 (recap publik). Jalankan sekali di Supabase SQL Editor.

create or replace function public.get_public_past_meetings()
returns table (
  id uuid,
  title text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  attendee_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    m.id,
    m.title,
    m.description,
    m.starts_at,
    m.ends_at,
    (select count(*) from public.attendances a where a.meeting_id = m.id and a.status = 'approved') as attendee_count
  from public.meetings m
  where m.ends_at < now()
  order by m.ends_at desc
  limit 6;
$$;

revoke execute on function public.get_public_past_meetings() from public;
grant execute on function public.get_public_past_meetings() to anon, authenticated;
