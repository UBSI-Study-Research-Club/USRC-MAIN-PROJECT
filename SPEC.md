# USRC Web — Spesifikasi v1

Owner: Raken (backend) · Chello (frontend) · Iwan (frontend)
Status: Draf v1 — dibaca semua tim sebelum mulai kode
Stack: Next.js + Supabase (free tier) + Vercel

---

## 1. Apa ini

Web resmi USRC (UBSI Study & Research Club), lintas 3 prodi (Informatika, Sistem Informasi, SI Akuntansi), kampus UBSI Pontianak.

Tujuan utama (urutan prioritas):
1. Anggota bisa absen sesi dengan gampang dari HP.
2. Publik (maba, dosen, kaprodi) bisa LIHAT hasil nyata anggota USRC — project, riset, kegiatan.
3. Pendaftaran anggota baru otomatis, tidak lewat chat manual.

Non-goal (jangan dikerjakan dulu):
- Marketplace, forum diskusi, chat real-time
- Aplikasi mobile native
- Multi-kampus / white-label
- Geotagging / selfie absen

## 2. Pengguna & role

| Role | Siapa | Bisa apa |
|---|---|---|
| public | siapa saja, tanpa login | lihat landing, jadwal, galeri project, event, form daftar |
| anggota | mahasiswa terdaftar & di-approve | absen, upload project, lihat jadwal |
| sekre | Riski Bagus (internal), Aya (eksternal) | validasi absen realtime, approve anggota baru |
| admin | Raken, Iwan | semua di atas + kelola jadwal/event + manajemen user |

Role disimpan di `profiles.role` (enum: anggota, sekre, admin). Default pendaftar baru: belum ada profile sampai di-approve (lihat §4.3).

## 3. Fase — kerjakan BERURUTAN, jangan lompat

### Fase 1 (MVP) — target: jalan & dipakai sesi pertama
- F1.1 Landing page publik: apa itu USRC, 4 core (study, research, build project, collaboration), CTA "Gabung"
- F1.2 Jadwal kegiatan (read-only dari DB, admin bisa CRUD). VISIBILITAS: publik lihat HANYA sesi lampau (`ends_at < now()`) sebagai feed "Kegiatan Terakhir" (judul + tanggal + jumlah hadir, foto optional); jadwal mendatang + lokasi = khusus anggota login. Teaser publik: "Login buat lihat jadwal & absen".
- F1.3 Pendaftaran anggota: form publik → masuk antrian approve
- F1.4 Login: email OTP via Supabase Auth (tanpa password — anti lupa password)
- F1.5 Absen: anggota buka daftar pertemuan aktif → tombol "Absen" → masuk sebagai `pending`
- F1.6 Dashboard sekre: lihat daftar absen per sesi realtime, approve/kick
- F1.7 Admin: CRUD jadwal + approve anggota + atur role

### Fase 2 — setelah MVP dipakai 2-3 sesi
- F2.1 Upload project (judul, deskripsi, gambar/screenshot, link repo/live, kategori). Alur: anggota upload → `status='pending'` → sekre/admin approve → tampil publik.
- F2.2 Galeri project publik (filter per kategori & anggota)
- F2.3 Halaman anggota: profil + daftar project miliknya

### Fase 3 — nanti
- Arsip riset (upload PDF, sitasi, abstrak)
- Event + pendaftaran event
- Komentar/like publik di project

## 4. Fitur detail (Fase 1)

### 4.1 Landing
- Mobile-first. Target: muat < 3 detik di 4G.
- Section: hero + 4 core + jadwal terdekat + CTA daftar + galeri preview (placeholder dulu).
- Tanpa login.

### 4.2 Jadwal
- Tampil: judul sesi, tanggal, jam, deskripsi singkat.
- Kolom `meetings`: id, title, description, starts_at, ends_at, created_by.
- Window absen dibuka: dari `starts_at - 30 menit` sampai `ends_at`. Dicek server-side (`now()` Supabase), BUKAN waktu HP anggota.
- TIMEZONE: semua `timestamptz` disimpan UTC, `now()` juga UTC. Admin input jam dalam WIB (UTC+8) → konversi ke UTC sebelum insert (edge function atau form helper). Kalau lupa, sesi "12.00 WIB" jadi jam 12.00 UTC = 20.00 WIB.

### 4.3 Pendaftaran
- Form publik: nama, NIM, email, prodi (dropdown 3 prodi), alasan gabung (opsional).
- Masuk tabel `registrations` dengan status `pending` (UNIQUE di `email` + `nim`, email divalidasi formatnya — cegah spam & dobel).
- Sekre approve → edge function (service role) bikin auth user via Supabase Admin API (`inviteUserToWorkspace`-style magic link) → row `profiles` diisi lewat trigger `on auth.users insert` → invite link terkirim otomatis. Urutan ini WAJIB: `profiles.id` FK ke `auth.users`, insert sebelum user ada = gagal.
- Tolak → status `rejected`. TIDAK kirim email balasan (Supabase free cuma bisa magic link/OTP, bukan email custom). Feedback ke pendaftar: lewat chat/WA sekre, atau tambah endpoint status publik nanti. `ponytail:` upgrade path: Resend/Mailersend kalau perlu email otomatis.

### 4.4 Absen
- Anggota login → lihat daftar sesi. Sesinya cuma tampil kalau sekarang dalam window absen.
- Klik "Absen" → insert `attendances(meeting_id, user_id, status='pending')`.
- 1 user hanya boleh 1 row per sesi → UNIQUE constraint `(meeting_id, user_id)`.
- Sekre lihat realtime (Supabase Realtime), approve → `status='approved'`, atau delete kalau salah orang.
- Anti-curang minimum: (a) window absen server-side, (b) unique constraint, (c) email OTP login. TIDAK perlu GPS/selfie.
- `ponytail:` ceiling = asumsi anggota jujur & komunitas saling kenal. Upgrade path: tambah kolom `check_token` per sesi (QR) kalau anggota sudah ratusan.

### 4.5 Dashboard sekre
- Daftar sesi → klik sesi → tabel absen realtime: nama, NIM, prodi, waktu click, status.
- Tombol: Approve, Revoke (delete row).
- Juga: antrian pendaftar baru (approve/reject).

## 5. Skema DB (Supabase Postgres)

```sql
create type role_t as enum ('anggota','sekre','admin');
create type att_status as enum ('pending','approved');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  nim text unique,
  prodi text not null check (prodi in ('Informatika','Sistem Informasi','SI Akuntansi')),
  role role_t not null default 'anggota',
  created_at timestamptz default now()
);

create table registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  nim text not null,
  prodi text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recap_url text,                   -- optional, foto dokumentasi (tim footage)
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table attendances (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status att_status not null default 'pending',
  checked_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);

create table projects (           -- Fase 2
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  repo_url text,
  live_url text,
  category text,
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz default now()
);
```

## 6. RLS (ini tugas RAKEN — jangan disentuh frontend)

Prinsip: data sensitif tidak bisa dibaca/ditulis langsung dari browser, kecuali lewat aturan berikut.

- `profiles`: SELECT sendiri + sekre/admin. UPDATE sendiri (nama saja) + admin (semua). INSERT hanya lewat service role (backend/admin).
- `registrations`: INSERT public (tanpa login). SELECT/UPDATE hanya sekre/admin.
- `meetings`: SELECT — anon HANYA baris `ends_at < now()` (recap publik); anggota/sekre/admin lihat semua termasuk mendatang. CUD hanya sekre/admin.
- `attendances`: SELECT sendiri + sekre/admin. INSERT sendiri, hanya kalau `now()` dalam window sesi (via function `is_within_window(meeting_id)`), status selalu `pending`. UPDATE/DELETE hanya sekre/admin.
- `projects`: SELECT yang `approved` untuk publik; SELECT semua milik sendiri + admin. INSERT sendiri (status default pending). UPDATE/DELETE sendiri + admin.
- Service role key: HANYA dipakai di Supabase dashboard/edge function. TIDAK PERNAH masuk kode frontend.

Checklist Raken:
- [ ] Semua tabel: RLS enabled, bukan cuma aturan
- [ ] Tidak ada `anon` key yang bisa UPDATE status absen sendiri
- [ ] Storage bucket project-images: upload login-only, read public
- [ ] `alter publication supabase_realtime add table attendances;` — tanpa ini dashboard sekre tidak realtime
- [ ] Trigger `on auth.users after insert` → insert `profiles` (dipakai flow invite §4.3)

## 7. Batasan teknis

- PRINSIP INTERAKTIF: "kalau bisa dihitung dari database, jangan diketik manual". Stat landing (anggota/sesi/karya) = live COUNT dari DB. Feed "Kegiatan Terakhir" = otomatis dari `meetings` + COUNT `attendances` — NOL upload rutin. Foto recap optional (kolom `recap_url`, kerjaan tim footage belakangan).

- Hosting: Vercel free, Supabase free. Tanpa biaya bulanan.
- Supabase free = 500MB DB, 1GB storage, 2 project. Cukup.
- Auth: email OTP (magic link). Tanpa password.
- Mobile-first. Breakpoint: 360px harus tetap enak.
- Bahasa UI: Indonesia.
- Deploy: push ke GitHub → Vercel auto-deploy. Branch `main` = production.

## 8. Pembagian tugas

| Orang | Tanggung jawab | Jangan sentuh |
|---|---|---|
| Raken | Supabase setup, skema, RLS, edge function approve-absen, auth flow | styling UI |
| Chello | landing, jadwal, halaman publik | RLS, skema DB |
| Iwan | halaman login, absen, dashboard sekre, upload project | RLS, skema DB |

Aturan: kalau butuh kolom/fitur DB baru, minta ke Raken dulu — jangan CREATE TABLE sendiri dari frontend.

## 9. Definition of done (Fase 1)

- [ ] Maba bisa daftar dari HP tanpa dibantu
- [ ] Sekre bisa approve pendaftar & lihat absen realtime dari HP
- [ ] Anggota bisa absen sesi aktif, dobel click tidak bikin 2 row
- [ ] Landing bisa dibuka tanpa login
- [ ] Semua tabel punya RLS & diuji dengan akun biasa (tidak bisa curang)

## 10. Risiko

- Tim 3 orang, semua sibuk kuliah → jaga scope mati-matian. Satu fitur selesai = rilis, jangan nunggu semua.
- Admin (Raken) jadi bottleneck kalau semua urusan DB lewat dia → dokumentasikan skema di file ini, jangan cuma di kepala.
- Kalau dua bulan MVP belum jalan, turunkan: landing + absen manual di Google Form dulu.
