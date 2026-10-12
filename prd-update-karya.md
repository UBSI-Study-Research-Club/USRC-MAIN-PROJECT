# PRD UPDATE — Karya (revamp page sendiri)

> Status: disepakati Raken + Chello, 12 Okt 2026. File LOKAL — sengaja tidak di-commit (keputusan Raken).
> Rujukan induk: `PRD-PHASE2.md` §F2.2 (versi lama di repo belum diganti).

## Keputusan final (4 poin)

1. **Bintang** = 1 anggota 1 bintang per karya — klik kasih, klik lagi cabut (toggle, gaya GitHub).
2. **Gak boleh** bintang karya sendiri.
3. **Profil dibersihin total** — bagian KARYA SAYA dihapus, semua pindah ke page karya.
4. **Detail karya = popup** di page yang sama, gak pindah halaman.

## Alur end-to-end

### Publik (tamu)
1. Landing → section hasil karya = **6 TERBAIK** (urut bintang terbanyak, yang approved) + tombol **LIHAT SEMUA KARYA** di samping section → `/karya`
2. `/karya` = grid card semua karya approved: preview gambar, judul, jumlah bintang, **"Dibuat oleh A, B, C"** (owner + anggota kelompok)
3. Klik card → **popup detail**: deskripsi lengkap, semua pembuat, link repo/live, jumlah bintang

### Anggota (login)
4. `/karya` → tombol **BUAT KARYA** → form: judul, deskripsi, kategori, gambar (URL), repo, live + pilih **INDIVIDUAL / KELOMPOK**; kelompok = pilih anggota tambahan (multi-select dari profiles)
5. Submit → `pending` → approve lewat panel admin (sistem Riski, tetap)
6. Kasih/cabut bintang ke karya orang lain yang approved — jumlah bintang update live

## Database (schema.sql — sudah disiapkan Noelle, di PR #20, BELUM jalan di Supabase)

- **`project_members`** (project_id, user_id) — pembuat tambahan karya kelompok. RLS: owner atur anggota, anggota bisa keluar sendiri, publik baca member milik karya approved
- **`project_stars`** (project_id, user_id) — PK ganda = otomatis 1 bintang per anggota per karya. RLS: larang bintang karya sendiri, larang karya belum approved, anggota bisa cabut bintang sendiri

Langkah Raken sebelum UI: review policy RLS di PR #20 (terutama `project_members` FOR ALL — USING untuk delete vs WITH CHECK untuk insert) → jalankan SQL di Supabase SQL Editor → merge.

## Bagi tugas

| PIC | Area | Files |
|---|---|---|
| **Raken** | Review+jalankan SQL, page `/karya`: grid card, popup detail, form buat individual/kelompok, toggle bintang | `src/app/(dashboard)/karya/` baru? — final path ditentukan saat eksekusi (public vs dashboard group) |
| **Chello** | Landing: section karya → 6 terbaik by bintang + tombol LIHAT SEMUA KARYA; hapus total KARYA SAYA dari profil | `src/app/(public)/page.tsx`, `src/app/(dashboard)/profil/page.tsx` |

Ritual tetap: satu tugas satu PR, review dulu, merge nunggu OK Raken.

## Selesai bila

- Landing nampilin 6 karya berbintang terbanyak + tombol nyambung ke `/karya`
- Karya kelompok nampilin semua pembuat
- Bintang bisa dikasih/dicabut, jumlahnya live
- Karya sendiri gak bisa dibintangin (UI disable + ditolak RLS)
- Profil bersih dari bagian karya
- `npm run build` hijau
