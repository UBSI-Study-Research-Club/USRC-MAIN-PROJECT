-- ========================================================
-- USRC Web — SQL: kolom hobi pendaftaran + approve membawa hobi ke profil
-- Idempotent — aman dijalankan berulang.
-- ========================================================

-- 1. Hobi/minat dipilih saat daftar (bisa lebih dari satu)
alter table registrations add column if not exists hobbies text[];

-- 2. approve_registration: hobi ikut tersalin ke profiles
drop function if exists public.approve_registration(uuid);

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
        -- hobi pendaftar menimpa; profil lama tetap jika pendaftar tidak memilih
        hobbies = coalesce(EXCLUDED.hobbies, public.profiles.hobbies);
    end if;
  end if;
end;
$$ language plpgsql security definer;

-- Verifikasi:
-- select column_name from information_schema.columns where table_name='registrations' and column_name='hobbies';
-- select prosrc from pg_proc where proname='approve_registration';
