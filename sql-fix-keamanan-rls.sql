-- ============================================================
-- FIX KEAMANAN RLS — insiden Bobob (2026-10-19)
-- Masalah: policy RLS cuma cek BARIS (auth.uid() = id), bukan kolom.
-- Akibatnya anggota bisa PATCH role/status/nim sendiri via REST endpoint,
-- dan anon bisa insert registrations status='approved'.
-- Semua langkah aman dijalankan ulang (idempotent).
-- TAHAP 1 dari 2 — jalankan semua sekaligus di SQL Editor.
-- ============================================================

-- ============================================================
-- CEK DATA DULU (read-only): siapa aja yang sekarang pegang role istimewa.
-- Cocokkan hasilnya dengan yang berhak. Kalau ada asing = sudah pernah dipakai.
-- ============================================================
-- select p.id, p.full_name, p.nim, p.role, p.status, u.email
-- from profiles p join auth.users u on u.id = p.id
-- where p.role in ('sekre','admin')
-- order by p.role, p.full_name;

-- ============================================================
-- FIX 1 (FATAL): anon bisa daftar jadi anggota tanpa sekre
-- Policy insert registrations = with check (true) → status boleh diisi 'approved'
-- langsung dari REST. Fix: tolak INSERT yang statusnya bukan pending.
-- Approval legit tetap jalan karena lewat UPDATE (approve_registration RPC /
-- tombol Telegram), bukan INSERT.
-- ============================================================
create or replace function public.force_registration_pending()
returns trigger as $$
begin
  if new.status is distinct from 'pending' then
    raise exception 'Status pendaftaran tidak boleh diisi manual. Tunggu approval sekre.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_registration_insert_guard on public.registrations;
create trigger trg_registration_insert_guard
  before insert on public.registrations
  for each row execute function public.force_registration_pending();

-- ============================================================
-- FIX 2 (FATAL): anggota bisa jadi admin / ganti status sendiri
-- Policy update profiles = using (auth.uid() = id ...) → semua kolom boleh.
-- Fix: trigger tolak perubahan role/status/nim kecuali oleh admin.
-- Edit nama/prodi/sosmed/avatar anggota tetap bebas (form profil normal).
-- service_role (Telegram worker) di-exempt.
-- ============================================================
create or replace function public.guard_profiles_sensitive()
returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if (new.role   is distinct from old.role
   or new.status is distinct from old.status
   or new.nim    is distinct from old.nim)
     and public.get_my_role() is distinct from 'admin' then
    raise exception 'role/status/NIM hanya bisa diubah oleh admin.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_update_guard on public.profiles;
create trigger trg_profiles_update_guard
  before update on public.profiles
  for each row execute function public.guard_profiles_sensitive();

-- ============================================================
-- FIX 3 (FATAL): pemilik bisa self-approve karya
-- Policy update projects = using (auth.uid() = user_id ...) → kolom status ikut.
-- Fix: trigger tolak perubahan status karya kecuali oleh admin/service_role.
-- ============================================================
create or replace function public.guard_projects_status()
returns trigger as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.status is distinct from old.status
     and public.get_my_role() is distinct from 'admin' then
    raise exception 'Status karya hanya diubah oleh admin.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_update_guard on public.projects;
create trigger trg_projects_update_guard
  before update on public.projects
  for each row execute function public.guard_projects_status();

-- ============================================================
-- VERIFIKASI (jalankan satu-satu di SQL Editor, harus ERROR semua):
-- ============================================================
-- A. Simulasi anggota ganti role sendiri → harus error "role/status/NIM hanya..."
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<UUID-ANGGOTA-TEST>', 'role', 'authenticated')::text, true);
--   update profiles set role = 'admin' where id = '<UUID-ANGGOTA-TEST>';
-- rollback;
--
-- B. Simulasi anggota ganti NIM sendiri → harus error sama.
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<UUID-ANGGOTA-TEST>', 'role', 'authenticated')::text, true);
--   update profiles set nim = '12345678' where id = '<UUID-ANGGOTA-TEST>';
-- rollback;
--
-- C. Simulasi anon insert pendaftaran approved → harus error "tidak boleh diisi manual".
-- begin;
--   set local role anon;
--   insert into registrations (full_name, email, nim, prodi, status)
--   values ('Tes', 'tes@contoh.com', '99999999', 'Informatika', 'approved');
-- rollback;
--
-- D. Simulasi admin ganti role (Panel Admin) → HARUS BERHASIL (tanpa error).
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<UUID-RAKEN-ADMIN>', 'role', 'authenticated')::text, true);
--   update profiles set role = 'sekre' where id = '<UUID-ANGGOTA-TEST>';
-- rollback;
