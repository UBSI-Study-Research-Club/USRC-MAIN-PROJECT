-- ============================================================
-- VALIDASI NO WA ANGGOTA (2026-10-19) — plan docs/plans/2026-10-19-validasi-no-wa.md
-- Semua langkah idempotent (aman dijalankan ulang).
-- Jalankan di Supabase SQL Editor, lalu lapor ke Noelle untuk snapshot pertama.
-- ============================================================

-- 1. Kolom baru
alter table public.profiles add column if not exists whatsapp text;
alter table public.registrations add column if not exists whatsapp text;
alter table public.profiles add column if not exists wa_verified_at timestamptz;

-- 2. RPC approve_registration: ikut menyalin whatsapp ke profiles
--    (return type tidak berubah, tapi drop-replace tetap dipakai biar konsisten)
drop function if exists public.approve_registration(uuid);
create function public.approve_registration(reg_id uuid)
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
      insert into public.profiles (id, full_name, nim, prodi, role, hobbies, whatsapp)
      values (u_id, reg.full_name, reg.nim, reg.prodi, 'anggota', reg.hobbies, reg.whatsapp)
      on conflict (id) do update set
        full_name = EXCLUDED.full_name,
        nim = EXCLUDED.nim,
        prodi = EXCLUDED.prodi,
        hobbies = coalesce(EXCLUDED.hobbies, public.profiles.hobbies),
        whatsapp = coalesce(EXCLUDED.whatsapp, public.profiles.whatsapp);
    end if;
  end if;
end;
$$ language plpgsql security definer;

revoke execute on function public.approve_registration(uuid) from public;
revoke execute on function public.approve_registration(uuid) from anon;
grant execute on function public.approve_registration(uuid) to authenticated;

-- ============================================================
-- VERIFIKASI (jalankan satu-satu, komentar dulu baru dibuka):
-- ============================================================
-- 1. Kolom terpasang:
-- select column_name, data_type from information_schema.columns
-- where table_schema='public' and table_name in ('profiles','registrations')
--   and column_name in ('whatsapp','wa_verified_at');
-- → 3 baris.
--
-- 2. RPC bentuk baru terpasang:
-- select proname from pg_proc where proname = 'approve_registration';
-- → 1 baris.
