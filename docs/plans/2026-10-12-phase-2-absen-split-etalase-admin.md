# Phase 2 Plan — Absen Split, Etalase Karya, Panel Admin

> Status: disetujui Raken 12 Okt, diumumkan ke grup MainProject. Eksekusi boleh mulai.
> Fokus: fitur Fase 2 yang diumumkan ke tim (split absen 2 halaman, etalase karya, panel admin, mobile polish).

**Goal:** Pecah halaman absen jadi 2 halaman (SESI AKTIF + RIWAYAT), buka etalase karya anggota di landing, dan ganti SQL manual buat promote role dengan panel admin sungguhan.

**Architecture:** Next.js 15 + Supabase. Tabel baru TIDAK perlu — `projects` sudah ada di schema beserta RLS-nya (public baca approved saja, owner insert pending, admin all). Semua fitur = lapisan UI di atas tabel yang sudah jalan. Per orang per PR sesuai ritual repo.

**PIC:**

| PIC | Area | Output |
|---|---|---|
| Raken | Halaman absen | `/absen` = SESI AKTIF, `/absen/riwayat` = RIWAYAT, realtime meetings |
| Chello | Etalase karya | Section KARYA di landing + form karya di `/profil` |
| Riski | Panel admin | `/dashboard/admin`: role management + approve karya |
| Raken + Noelle | DB/RLS guard, audit PR, merge review | Semua PR lewat review dulu |

---

# 1. Raken — Split Halaman Absen (SESI AKTIF + RIWAYAT)

## 1.1 Masalah

Sekarang `/absen` satu halaman campur: sesi lama, sesi aktif, sesi belum buka semua jadi kartu berjajar `order starts_at desc`. Anggota harus scan sendiri mana yang bisa diabsen. Bonus bug: realtime channel cuma denger `attendances`, jadi sesi baru yang dibuat sekre gak muncul sampai refresh.

## 1.2 Alur member (end-to-end)

1. Login → masuk `/absen` (default = SESI AKTIF).
2. SESI AKTIF: cuma tampilkan sesi yang window-nya terbuka (`starts_at - 30min <= now <= ends_at`) — kartu besar + tombol ABSEN besar. Di bawahnya: sesi mendatang (belum buka) tampil abu dengan "Buka HH.MM WIB".
3. Kalau tidak ada sesi aktif: empty state "Belum ada sesi aktif" + sesi terdekat kalau ada.
4. Tab RIWAYAT (`/absen/riwayat`): semua sesi yang sudah lewat, terbaru dulu. Tiap kartu: judul, tanggal WIB, badge status milik sendiri — HADIR / PENDING / TIDAK ABSEN.
5. Riwayat bisa dicari (judul/tanggal) dan di-paging: 10 kartu per klik, tombol "MUAT LAGI" (`.range()` di query, bukan fetch-all-then-slice).

## 1.3 Files

- Modify: `src/app/(dashboard)/absen/page.tsx` → jadi halaman SESI AKTIF
- New: `src/app/(dashboard)/absen/riwayat/page.tsx`
- New: komponen kecil tab switcher (2 link, active state) — dipakai kedua halaman
- Jangan sentuh: `package.json`, `package-lock.json`, `supabase/schema.sql`, halaman lain

## 1.4 Detail teknis

- Realtime: tambah event `meetings` ke channel `absen-page-changes` yang sudah ada → panggil `fetchData()`. Ini nutup gap sesi baru gak muncul.
- Guard "Akun Belum Aktif" (profiles kosong) harus tetap jalan di KEDUA halaman.
- Semua jam tampil WIB (data tersimpan ISO UTC — format di render, jangan di query).
- Filter SESI AKTIF pakai logika yang sama dengan `is_within_window()` di DB (window = 30 menit sebelum mulai sampai selesai) — jangan bikin definisi window kedua.

## 1.5 Acceptance criteria

- `/absen` tanpa sesi aktif = empty state rapi, bukan halaman kosong.
- Sekre buat sesi → kartunya muncul di HP anggota TANPA refresh.
- Absen di SESI AKTIF → buka RIWAYAT, sesi itu badge HADIR.
- Riwayat 30 sesi: render awal 10, tiap "MUAT LAGI" nambah 10 (cek network: query pakai range).
- Search riwayat nyaring di client, gak fetch ulang.
- `npm run build` hijau.

---

# 2. Chello — Etalase Karya

## 2.1 Masalah

Tabel `projects` + RLS + hitungan landing stats (`projects bigint`) sudah ada sejak Phase 1, tapi tidak ada satu pun UI yang pakai. Anggota gak punya tempat pamer karya. Ide Chello sendiri (9 Okt): profil bisa nampilin projek/kelompok apa yang dikerjakan.

## 2.2 Alur member (end-to-end)

1. Anggota buka `/profil` → section baru "KARYA SAYA" + form tambah: judul, deskripsi, kategori, link repo, link live, gambar (URL).
2. Submit → tersimpan status `pending`, muncul di list miliknya sebagai "Menunggu persetujuan".
3. Admin approve (Task 3) → status `approved` → otomatis tampil publik.
4. Tamu/anggota buka landing → section KARYA: grid kartu karya approved (gambar, judul, kategori, link repo/live). Anon read aman — RLS `Public read approved projects` sudah ada.

## 2.3 Files

- Modify: `src/app/(public)/page.tsx` → section KARYA (anchor navbar sudah ada di desain Badge Nav)
- Modify: `src/app/(dashboard)/profil/page.tsx` → list karya sendiri + form tambah/hapus pending
- Jangan sentuh: schema, RLS, auth, absen

## 2.4 Catatan desain

- Tetap garis editorial/neobrutalist USRC (paper, border tebal, maroon) — ikut bahasa visual landing sekarang.
- Kartu karya pakai gambar `next/image` (remotePatterns perlu cek — kalau domain bebas, pakai `<img>` biasa biar gak sentuh config; tentukan saat implementasi).
- Tidak ada upload file — URL gambar saja (YAGNI; storage bucket = fase berikutnya kalau diminta).

## 2.5 Acceptance criteria

- Karya pending GAK muncul di landing (tes dengan 2 akun/status).
- Approved muncul untuk guest tanpa login.
- Pemilik bisa hapus karya pending miliknya (RLS owner all sudah izinkan).
- `npm run build` hijau.

---

# 3. Riski — Panel Admin

## 3.1 Masalah

Promote role masih lewat SQL Editor manual (sudah 2x dipakai). Anggota approved/rejected history cuma keliatan sekre. Karya baru butuh jalur approve yang manusiawi.

## 3.2 Alur admin (end-to-end)

1. Admin login → navbar muncul PANEL ADMIN (role-gate admin saja, beda dari PANEL SEKRE).
2. Tab ANGGOTA: list semua anggota (search NIM/nama) + dropdown role per baris (anggota/sekre/admin) → simpan langsung.
3. Tab KARYA: karya pending → tombol Setujui/Tolak → landing langsung update.
4. (Stretch, boleh menyusul) tab PENDAFTARAN LAMA: daftar rejected + tombol approve ulang (alur Pitfall 12).

## 3.3 Files

- New: `src/app/(dashboard)/dashboard/admin/page.tsx` (tab internal, satu file dulu — jangan pecah dulu)
- Modify: navbar dashboard (tambah link role-gated)
- Cek RLS: policy update `profiles.role` oleh admin — kalau belum ada, jangan akali di client; lempar ke Raken+Noelle (Task 4) untuk SQL-nya.

## 3.4 Acceptance criteria

- Anggota biasa buka URL `/dashboard/admin` langsung = ditolak/tak ada isi (client gate + RLS).
- Ganti role sekre→anggota: navbar panel sekre hilang di sesi dia setelah refresh.
- Approve karya pending → muncul di landing.
- `npm run build` hijau.

---

# 4. Raken + Noelle — DB/RLS Guard & Review

- Verifikasi/buat policy: admin update `profiles.role`; admin update `projects.status` (kemungkinan sudah tercakup policy admin-all yang ada — cek, jangan dobel).
- Audit tiap PR: cek diff, build lokal, review GitHub, baru merge (ritual biasa — merge TUNGGU OK Raken).
- Vercel preview merah di PR anggota = normal; keputusan dari build lokal.

## Urutan eksekusi

1. Task 1 (Raken) — pengaruh terbesar ke user harian, independent.
2. Task 2 (Chello) + Task 3 (Riski) boleh paralel — satu-satunya sambungan: approve karya. Kalau Task 3 belum jadi, approve sementara via SQL (sudah ada ritelenya).
3. Mobile polish bukan task terpisah — tiap task wajib responsive (acceptance criteria masing-masing).

## Hal yang sengaja TIDAK masuk Fase 2

- Upload gambar ke storage (URL saja) — tambah kalau anggota komplain.
- Rekap absen otomatis/export — `recap_url` sudah cukup.
- Edit sesi oleh sekre dari UI — sekarang buat saja baru.
- Chat/notifikasi — jangan scope creep.
