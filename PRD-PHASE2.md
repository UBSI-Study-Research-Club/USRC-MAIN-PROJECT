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

### F2.2 Etalase Karya — revamp page sendiri (Raken + Chello)

> Keputusan Raken+Chello 12 Okt: karya pindah dari section landing + form profil → **page sendiri `/karya`**, dengan sistem bintang dan karya kelompok. Keputusan final: 1 anggota = 1 bintang per karya (toggle, klik lagi = cabut); dilarang bintang karya sendiri; bagian karya di profil DIHAPUS total; detail karya = popup di page yang sama.

Alur publik:
1. Landing → section hasil karya = **6 TERBAIK** (urut jumlah bintang terbanyak, karya approved) + tombol "LIHAT SEMUA KARYA" di sebelah section → `/karya`
2. `/karya` = grid card semua karya approved: preview gambar, judul, jumlah bintang, "Dibuat oleh A, B, C" (owner + project_members). Tamu bisa lihat
3. Klik card → **popup detail**: deskripsi, semua pembuat, link repo/live, jumlah bintang

Alur anggota:
4. `/karya` → tombol "BUAT KARYA" → form: judul, deskripsi, kategori, gambar (URL), repo, live + tipe **INDIVIDUAL / KELOMPOK**; kelompok → pilih anggota tambahan (multi-select dari profiles)
5. Submit → `pending` → approve via panel admin (F2.3, sistem tetap)
6. Anggota login kasih/cabut bintang ke karya orang lain yang approved — tombol bintang di card/detail; jumlah bintang live

Database (schema.sql, sudah disiapkan Noelle — review Raken):
- Tabel `project_members` (project_id, user_id) — pembuat tambahan karya kelompok
- Tabel `project_stars` (project_id, user_id) — PK ganda = 1 bintang per anggota per karya; RLS melarang bintang karya sendiri & karya belum approved
- RLS: publik baca member+star milik karya approved; anggota insert/delete bintang sendiri; owner atur members

**Bagi tugas:**

| PIC | Area |
|---|---|
| **Raken** | Review & jalankan SQL, page `/karya` (grid card, popup detail, form buat individual/kelompok, toggle bintang) |
| **Chello** | Landing: ganti section karya jadi 6 terbaik + tombol "LIHAT SEMUA KARYA"; hapus total bagian KARYA SAYA dari `/profil` |

**Selesai bila:** landing menampilkan 6 karya berbintang terbanyak; tombol mengarah ke `/karya`; karya kelompok menampilkan semua pembuat; bintang anggota bisa diberi/dicabut dan jumlahnya live; karya sendiri tidak bisa diberi bintang (UI disable + ditolak RLS); profil tidak lagi memiliki bagian karya; `npm run build` hijau.

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
