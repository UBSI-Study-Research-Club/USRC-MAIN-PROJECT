# PRD — USRC Web Fase 2 (Product Requirements Document)

Versi: 1.0 · Status: Aktif · Updated: 2026-10-12
Pemilik produk: Raken Rizki Saputra
Dokumen terkait: `PRD-USRCWEB.md` (kebutuhan produk Fase 1) · `PLAN.md` (aturan eksekusi & tim) · `design.md` (aturan proyek & desain) · `SPEC.md` (source of truth skema DB)

---

## 1. Ringkasan

Lanjutan MVP Fase 1 yang sudah live. Fase 2 memecah halaman absen jadi dua, membuka etalase karya anggota untuk publik, dan mengganti kelola role dari SQL manual menjadi panel admin.

Prinsip produk tetap sama, tidak bisa ditawar:
- **Serba interaktif** — semua tampil dari database, nol ketikan manual.
- **Jadwal mendatang tidak publik** — publik hanya lihat karya approved dan sesi lampau.
- **Mobile-first** — enak di 360px, muat < 3 detik di 4G.

## 2. Bagi tugas

| # | Fitur | PIC | Area sentuh | Jangan sentuh |
|---|---|---|---|---|
| F2.1 | Absen dua halaman | **Raken** | `src/app/(dashboard)/absen/` | schema, RLS, halaman lain |
| F2.2 | Etalase karya | **Chello** | landing + `/profil` | schema, RLS, auth, absen |
| F2.3 | Panel admin | **Riski** | `/dashboard/admin/` + navbar | schema, RLS, halaman lain |

Butuh tabel/kolom/RLS baru atau ubah policy → minta Raken dulu, jangan CREATE TABLE dari frontend. Tambah library baru juga izin dulu (aturan `design.md` §2 tetap berlaku).

## 3. Kebutuhan fitur

### F2.1 Absen dua halaman (Raken)

Halaman `/absen` sekarang mencampur sesi aktif, mendatang, dan lampau dalam satu daftar — anggota harus scan sendiri. Bug ditemani: sesi baru dari sekre tidak muncul sebelum refresh (realtime hanya dengarkan `attendances`).

Alur member:
1. Login → masuk `/absen` = halaman SESI AKTIF: hanya sesi dengan window terbuka (`starts_at - 30 menit` s/d `ends_at`), kartu besar + tombol ABSEN besar. Di bawahnya sesi mendatang tampil abu: "Buka HH.MM WIB".
2. Tidak ada sesi aktif → empty state "Belum ada sesi aktif" + sesi terdekat jika ada.
3. Tab RIWAYAT (`/absen/riwayat`): sesi lampau, terbaru dulu. Tiap kartu: judul, tanggal WIB, badge status sendiri — HADIR / PENDING / TIDAK ABSEN.
4. Riwayat: search (judul/tanggal, filter client) + paging 10 kartu per klik tombol "MUAT LAGI" (`.range()` di query, bukan fetch-all).

Aturan teknis:
- Definisi window sama dengan `is_within_window()` di DB — dilarang bikin definisi window kedua.
- Realtime: tambah event `meetings` ke channel yang sudah ada → refetch (menutup bug sesi baru).
- Guard "Akun Belum Aktif" tetap jalan di kedua halaman.
- Jam tampil WIB; data tetap ISO UTC.

**Selesai bila:** sekre buat sesi → kartu muncul di HP anggota tanpa refresh; absen di SESI AKTIF → badge HADIR muncul di RIWAYAT; 30 sesi riwayat render 10 dulu dan tiap "MUAT LAGI" nambah 10; `npm run build` hijau.

### F2.2 Etalase karya (Chello)

Tabel `projects` + RLS sudah ada sejak Fase 1 (publik baca `approved` saja, owner insert `pending`, admin penuh) tapi belum dipakai UI mana pun. Tidak perlu SQL baru.

Alur member:
1. Buka `/profil` → section "KARYA SAYA" + form tambah: judul, deskripsi, kategori, link repo, link live, gambar (URL — bukan upload).
2. Submit → status `pending`, tampil di list miliknya sebagai "Menunggu persetujuan".
3. Admin setujui (F2.3) → otomatis tampil publik.
4. Tamu buka landing → section KARYA: grid kartu karya approved (gambar, judul, kategori, link).

Aturan desain: ikut `design.md` — editorial/neobrutalist, border tebal, maroon/paper. Gambar via URL; storage bucket bukan bagian fase ini.

**Selesai bila:** karya pending tidak muncul di landing (diuji dua status); karya approved terlihat oleh tamu tanpa login; pemilik bisa hapus karya pending miliknya; `npm run build` hijau.

### F2.3 Panel admin (Riski)

Promote role masih lewat SQL Editor manual. Karya baru butuh jalur persetujuan yang manusiawi.

Alur admin:
1. Admin login → navbar muncul PANEL ADMIN (role-gate `admin` saja, terpisah dari PANEL SEKRE).
2. Tab ANGGOTA: list anggota (search nama/NIM) + dropdown role per baris (anggota/sekre/admin) → simpan langsung.
3. Tab KARYA: karya pending → tombol Setujui/Tolak → landing langsung terbarui.
4. (Stretch, boleh menyusul) tab pendaftar lama: daftar `rejected` + approve ulang.

Aturan teknis: gate di client SAJA tidak cukup — kalau policy RLS `admin update profiles.role` belum ada, berhenti dan minta Raken; dilarang akali di client.

**Selesai bila:** anggota biasa buka `/dashboard/admin` = kosong/ditolak; ganti role → navbar sesuai role setelah refresh; approve karya → muncul di landing; `npm run build` hijau.

## 4. Non-goal fase 2 (jangan dikerjakan)

- Upload gambar ke storage (URL saja) — tambah kalau anggota komplain.
- Export/rekap absen otomatis — `recap_url` cukup.
- Edit sesi dari UI — buat baru saja.
- Chat, notifikasi, forum.

## 5. Aturan kerja (sama seperti Fase 1)

- Satu fitur satu branch satu PR (`feat/absen-split`, `feat/etalase-karya`, `feat/panel-admin`) → review → merge. Commit kecil-kecil, pesan jelas.
- Semua PR yang menyentuh query data / `supabase/` → wajib review Raken (+ Noelle audit diff & build lokal).
- Merge hanya setelah OK Raken. Vercel preview merah di PR sendiri bukan masalah — keputusan dari build lokal.
- Mobile polish bukan tugas terpisah: setiap fitur wajib lolos cek 360px.
- Ragu → tanya di grup MainProject, jangan nebak sendiri.
