-- ============================================================
-- FIX KEAMANAN RLS — TAHAP 2 (2026-10-19)
-- 1. Anggota NONAKTIF diblok total di level DB: gak bisa absen,
--    buat karya, edit karya, tambah link/poin, atau bintang.
--    (Sebelumnya blokirnya cuma di UI — lewat endpoint masih bisa.)
-- 2. MEJA LAPORAN (security_audit_log): setiap perubahan role/status/NIM
--    dicatat — siapa, kapan, nilai lama -> baru. Percobaan diblok juga dicatat.
-- Aman dijalankan ulang (idempotent). Jalankan SETELAH tahap 1.
-- ============================================================

-- ============================================================
-- A. MEJA LAPORAN (dibuat dulu — dipakai trigger di bagian C)
-- ============================================================
create table if not exists public.security_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_role text,
  action text not null,
  target_table text not null,
  target_id uuid,
  detail jsonb
);

alter table public.security_audit_log enable row level security;

-- Cuma admin boleh baca. Gak ada policy insert/update/delete untuk client —
-- penulisan cuma lewat trigger (security definer).
drop policy if exists "Admin reads audit log" on public.security_audit_log;
create policy "Admin reads audit log"
  on public.security_audit_log for select
  using (public.get_my_role() = 'admin');

-- ============================================================
-- B. GERBANG AKTIF — anggota nonaktif ditolak di pintu DB
-- ============================================================

-- B1. Absen: nonaktif gak bisa absen
drop policy if exists "Insert attendance only within window" on attendances;
create policy "Insert attendance only within window"
  on attendances for insert
  with check (
    auth.uid() = user_id and
    is_within_window(meeting_id) and
    status = 'pending' and
    exists (select 1 from profiles where id = auth.uid() and status = 'aktif')
  );

-- B2. Karya: nonaktif gak bisa buat karya
drop policy if exists "Member insert own project" on projects;
create policy "Member insert own project"
  on projects for insert
  with check (
    auth.uid() = user_id and status = 'pending' and
    exists (select 1 from profiles where id = auth.uid() and status = 'aktif')
  );

-- B3. Karya: nonaktif gak bisa edit/hapus karyanya (admin tetap bebas)
drop policy if exists "Owner or Admin update/delete project" on projects;
create policy "Owner or Admin update/delete project"
  on projects for all
  using (
    (auth.uid() = user_id and
     exists (select 1 from profiles where id = auth.uid() and status = 'aktif'))
    or get_my_role() = 'admin'
  );

-- B4. Link karya: nonaktif gak bisa kelola link
drop policy if exists "Owner manages links, admin all" on project_links;
create policy "Owner manages links, admin all"
  on project_links for all
  using (
    (exists (
       select 1 from projects p
       where p.id = project_id and p.user_id = auth.uid()
         and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.status = 'aktif')
     ))
    or get_my_role() = 'admin'
  )
  with check (
    (exists (
       select 1 from projects p
       where p.id = project_id and p.user_id = auth.uid()
         and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.status = 'aktif')
     ))
    or get_my_role() = 'admin'
  );

-- B5. Poin detail karya: nonaktif gak bisa kelola poin
drop policy if exists "Owner manages detail points, admin all" on project_detail_points;
create policy "Owner manages detail points, admin all"
  on project_detail_points for all
  using (
    (exists (
       select 1 from projects p
       where p.id = project_id and p.user_id = auth.uid()
         and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.status = 'aktif')
     ))
    or get_my_role() = 'admin'
  )
  with check (
    (exists (
       select 1 from projects p
       where p.id = project_id and p.user_id = auth.uid()
         and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.status = 'aktif')
     ))
    or get_my_role() = 'admin'
  );

-- B6. Anggota kelompok: owner aktif kelola; anggota tetap boleh KELUAR sendiri
--     (leave = cabut diri, gak bahaya — sengaja gak diblok walau nonaktif)
drop policy if exists "Owner manages members, member can leave, admin all" on project_members;
create policy "Owner manages members, member can leave, admin all"
  on project_members for all
  using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
    or user_id = auth.uid()
    or get_my_role() = 'admin'
  )
  with check (
    (exists (
       select 1 from projects p
       where p.id = project_id and p.user_id = auth.uid()
         and exists (select 1 from profiles pr where pr.id = auth.uid() and pr.status = 'aktif')
     ))
    or get_my_role() = 'admin'
  );

-- B7. Bintang: nonaktif gak bisa membintangi
drop policy if exists "Member stars others' approved project" on project_stars;
create policy "Member stars others' approved project"
  on project_stars for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'aktif')
    and exists (
      select 1 from projects p
      where p.id = project_id
        and p.status = 'approved'
        and p.user_id <> auth.uid()
    )
  );

-- ============================================================
-- C. UPGRADE PENJAGA + CATAT MEJA LAPORAN
--    (ganti trigger tahap 1 — sekarang setiap perubahan role/status/NIM
--     TERCATAT: yang lolos oleh admin, dan yang DITOLAK)
-- ============================================================
create or replace function public.guard_profiles_sensitive()
returns trigger as $$
declare
  v_actor_role text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  v_actor_role := public.get_my_role();

  if (new.role   is distinct from old.role
   or new.status is distinct from old.status
   or new.nim    is distinct from old.nim) then
    insert into public.security_audit_log
      (actor, actor_role, action, target_table, target_id, detail)
    values
      (auth.uid(), v_actor_role,
       case when v_actor_role = 'admin'
            then 'profile_sensitive_change'
            else 'BLOCKED_profile_sensitive_change' end,
       'profiles', new.id,
       jsonb_build_object(
         'role_old', old.role,   'role_new', new.role,
         'status_old', old.status, 'status_new', new.status,
         'nim_old', old.nim,     'nim_new', new.nim));

    if v_actor_role is distinct from 'admin' then
      raise exception 'role/status/NIM hanya bisa diubah oleh admin.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Penjaga status karya ikut mencatat ke meja laporan
create or replace function public.guard_projects_status()
returns trigger as $$
declare
  v_actor_role text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  v_actor_role := public.get_my_role();

  if new.status is distinct from old.status then
    insert into public.security_audit_log
      (actor, actor_role, action, target_table, target_id, detail)
    values
      (auth.uid(), v_actor_role,
       case when v_actor_role = 'admin'
            then 'project_status_change'
            else 'BLOCKED_project_status_change' end,
       'projects', new.id,
       jsonb_build_object('status_old', old.status, 'status_new', new.status));

    if v_actor_role is distinct from 'admin' then
      raise exception 'Status karya hanya diubah oleh admin.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- (Trigger-nya gak perlu dibuat ulang — nama sama, definisi fungsi baru
--  otomatis kepake. Tapi drop/create idempotent tetap disertakan buat jaga.)
drop trigger if exists trg_profiles_update_guard on public.profiles;
create trigger trg_profiles_update_guard
  before update on public.profiles
  for each row execute function public.guard_profiles_sensitive();

drop trigger if exists trg_projects_update_guard on public.projects;
create trigger trg_projects_update_guard
  before update on public.projects
  for each row execute function public.guard_projects_status();

-- ============================================================
-- VERIFIKASI
-- ============================================================
-- 1. Cek semua policy baru terpasang (harus muncul 7 baris B di atas):
-- select tablename, policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename in
--   ('attendances','projects','project_links','project_detail_points','project_members','project_stars')
-- order by tablename, policyname;
--
-- 2. Ulangi RUN 2 kemarin (admin ganti role) → sukses, lalu cek meja laporan:
-- select * from security_audit_log order by "at" desc limit 5;
-- → harus muncul baris 'profile_sensitive_change' berisi uuid Raken.
