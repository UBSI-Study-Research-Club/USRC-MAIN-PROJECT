# 2026-10-19 — Validasi No WA Anggota (usulan Zio)

Status: DISETUJUI — 2026-10-19 (Raken: alur OK, PIC terkunci)

## Ringkasan

Semua anggota wajib mencatat no WA di database. Validasi "sudah masuk grup WA USRC atau
belum" memakai **snapshot daftar grup** (sekali ambil, refresh sewaktu-waktu) — TIDAK ada
pemeriksaan berkala dan tidak ada jalur internet ke bridge. Dashboard menampilkan salah
satu dari tiga keadaan lewat banner:

| Kondisi data anggota | Yang tampil di dashboard |
|---|---|
| `whatsapp` terisi **dan** nomor ada di snapshot grup | Bersih — tanpa banner |
| `whatsapp` kosong | Banner ringan: "Isi no telp kamu" → arah ke /profil |
| `whatsapp` terisi tapi tidak ada di snapshot | Banner: "Kamu belum masuk grup WA USRC" + link GC |

## Alur End-to-End

1. **Anggota baru**: `/daftar` mengisi no WA (wajib, dinormalisasi `62xxx`) →
   `registrations.whatsapp`.
2. **Approval sekre**: RPC `approve_registration` menyalin `whatsapp` ke `profiles.whatsapp`.
3. **Anggota lama tanpa nomor**: banner "Isi no telp kamu" → mengisi di `/profil`.
4. **Snapshot grup**: backend (PC Raken) menarik daftar nomor asli grup via bridge
   (`lidToPhone`) dan menyimpan hasil pencocokan ke `profiles.wa_verified_at`
   (timestamp = tahu kapan terakhir terverifikasi). Refresh hanya bila dijalankan —
   bukan loop otomatis.
5. **Dashboard** membaca dua kolom itu dan memilih satu dari tiga keadaan banner di atas.
   Tombol "Cek Ulang" hanya me-refresh data — pencocokan tetap pekerjaan snapshot.

## Ringkasan Tugas PIC

| PIC | Bagian | Jangan sentuh |
|---|---|---|
| Chello | Frontend: field WA di /daftar + /profil, banner dashboard 3 keadaan, tombol Cek Ulang | bridge, snapshot, SQL, RPC |
| Raken (eksekusi bridge/snapshot oleh Noelle) | SQL migration, RPC, bridge endpoint, snapshot matcher | halaman frontend |

Koordinasi: karya Chello cukup membaca `profiles.whatsapp` + `profiles.wa_verified_at`
dan env `NEXT_PUBLIC_WA_GROUP_INVITE`. Tidak ada API validasi yang dipanggil web.

## Bagian Chello (Frontend)

**Files**: `/daftar` (registrations form), `/profil`, dashboard banner component.

- **Input no WA**: normalisasi ke `62xxx` (buang `+`, `0` depan → `62`), validasi
  9–16 digit numerik, submit ditolak dengan pesan jelas bila tidak valid.
- **/daftar**: insert `registrations` menyertakan `whatsapp` (wajib — form gak bisa
  submit kosong).
- **/profil**: field WA editable (RLS own-row sudah ada), save polos.
- **Banner dashboard — tiga keadaan** (lihat tabel Ringkasan):
  - kolom kosong → teks netral "Isi no telp kamu" + tombol ke /profil
  - terisi tapi `wa_verified_at` null → banner "Kamu belum masuk grup WA USRC" +
    link GC (`NEXT_PUBLIC_WA_GROUP_INVITE`)
  - `wa_verified_at` terisi → banner tidak dirender
- **Tombol "Cek Ulang"**: me-refetch profil (react berkala di dashboard boleh dipakai —
  realtime subscription `profiles` sudah ada polanya). Bukan pemanggilan API validasi.
- **Catatan pengalaman**: jika anggota yakin sudah join tapi masih terbaca belum,
  pesan bannya cukup "kalau sudah join, tunggu sebentar lalu klik Cek Ulang" —
  snapshot diperbarui berkala oleh backend, bukan detik itu juga.

**Selesai bila**: form menolak WA tidak valid; ketiga keadaan banner tampil benar
(uji dengan 3 akun: tanpa nomor, nomor di luar grup, nomor terverifikasi); banner
hilang setelah snapshot berikutnya memverifikasi.

## Bagian Raken / Noelle (Backend + Bridge)

**Files**: `sql-validasi-wa.sql` (root + copy Desktop), `bridge.js` (endpoint baru),
script snapshot `validasi-wa` di PC (dijalankan manual / saat diminta).

- **SQL (idempotent)**:
  - `alter table profiles add column if not exists whatsapp text;`
  - `alter table registrations add column if not exists whatsapp text;`
  - `alter table profiles add column if not exists wa_verified_at timestamptz;`
  - RPC `approve_registration`: `drop function if exists` dulu (42P13), definisi baru
    ikut menyalin `whatsapp` ke profiles.
- **Bridge — endpoint baru** `GET /group-phones/:jid`: ambil `groupMetadata`, resolve
  LID→nomor via `lidToPhone` (sesi punya ±2220 file mapping; teruji 45/48 peserta
  USRC ter-resolve langsung), return `{ name, phones: ["62xxx", ...] }`.
  Restart bridge sesuai ritual: kill PID di :3000 → relaunch background pty=true.
- **Snapshot matcher** (script di PC, service key Supabase):
  1. `GET /group-phones/120363410417861458@g.us` → daftar nomor
  2. baca semua `profiles.whatsapp` aktif
  3. yang cocok → `wa_verified_at = now()` (hanya maju, tidak pernah dibatalkan)
  4. output ringkas: "X/Y nomor terverifikasi" — jadi laporan ke Raken
  Dijalankan manual kapan pun (atau sekali sehari kalau nanti diminta) — tidak ada cron.
- **Raken**: isi `NEXT_PUBLIC_WA_GROUP_INVITE` di Vercel + ambil link invite grup dari WA.

**Selesai bila**: endpoint meng-resolve ≥45/48; matcher menulis `wa_verified_at`
untuk nomor terdaftar dan melaporkan hitungan; snapshot ulang tidak pernah menurunkan
status anggota yang sudah terverifikasi.

## Sengaja TIDAK masuk (anti-scope-creep)

- Job/cron pemeriksaan berkala — cukup snapshot manual on-demand.
- Notif WA otomatis ke anggota yang belum join (gelombang 2 bila banner gak cukup).
- Validasi grup KWSB / grup lain.
- Validasi on-demand dari web (butuh ekspos bridge ke internet — ditolak demi keamanan).
- Edit nomor anggota via Panel Admin (nanti kalau benar-benar diminta).
