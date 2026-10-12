# PRD-UPDATE-PHASE 2.1 — KARYA GELOMBANG 3
(DRAFT LOKAL · jangan di-commit sebelum disetujui Raken)

Status: DISETUJUI RAKEN 2026-10-12 — gas. Ujian: umum ke grup MainProject.
Latar: lanjutan prd-update-karya.md + rancangan-karya-gelombang-3.md.
Semua keputusan produk terkunci (lihat rancangan-karya-gelombang-3.md).

---

## 1. BAGI TUGAS

| PIC | Bagian | Alasan |
|---|---|---|
| **Chello** | CARD karya saja — card grid /karya, card landing top-6, tampilan (renderer) detail popup | punya sample sendiri |
| **Raken** | Semua yang GAK nyentuh card karya: schema/SQL, form & logika page, profil, admin | — |

### Chello — KARYA CARD & TAMPILAN
1. Redesign card karya (grid /karya) sesuai sample dia → tampil link
   fleksibel + sosmed pembuat di card.
2. Adaptasi card yang sama ke landing top-6 by bintang.
3. Renderer tampilan detail popup: link per tipe, baris pembuat + ikon
   sosmed, poin-poin bertipe (teks / chips / swatch warna / link / tabel).
- **Jangan sentuh**: supabase/schema.sql, form builder /karya, /profil,
  /dashboard/admin, halaman absen. Data & types disiapkan Raken — Chello
  tinggal render.

### Raken — NON-CARD (schema, form, profil, admin)
1. **Gelombang A — fix audit** (gas duluan, gak nunggu siapa-siapa):
   - popup bintang basi → derive detail dari karyaList by id;
   - guard "Akun Belum Aktif" (pola GhostScreen) di /karya;
   - amankan insert karya kelompok biar gak ada karya yatim.
2. **Gelombang B — schema & data**:
   - schema.sql: tabel project_links + project_detail_points (value jsonb),
     kolom sosmed di profiles (instagram, github, behance, linkedin),
     drop repo_url/live_url, hapus karya lama, publication realtime baru
     (blok DO idempotent), update RPC get_public_karya;
   - **Raken jalanin SQL di Supabase SEBELUM UI merge** (pelajaran PR #26).
3. **Gelombang B — form & page**:
   - form /karya: link dinamis maks 6 pilih tipe, validasi URL;
   - /profil: form sosmed;
   - types + fetch data buat card (diserahkan ke Chello).
4. **Gelombang C — form & admin**:
   - form: pilih anggota model "tambah kotak" (kotak nampilin sosmed dari profil);
   - form: builder poin bertipe (isi data — renderer-nya Chello);
   - admin: hapus karya, hapus sesi absen, nonaktifkan + keluarkan anggota
     (hapus = cascade permanen → dialog konfirmasi wajib).
- **Jangan sentuh**: visual KaryaCard/ProjectCard & renderer popup milik Chello.

---

## 2. URUTAN EKSEKUSI

1. Raken: Gelombang A (fix audit) — PR per bug.
2. Raken: PR schema Gelombang B → review → **jalanin SQL di Supabase** →
   smoke-test RPC.
3. Paralel: Raken (form/page/profil) ∥ Chello (card + renderer, pakai types
   dari Raken).
4. Gelombang C menyusul setelah B live — pola sama.

## 3. SELESAI BILA

- Semua karya lama hilang, karya baru pakai link fleksibel + sosmed pembuat
  tampil untuk tamu.
- Detail popup bisa berisi poin teks/chips/warna/link/tabel sesuai isi pembuat.
- Kelompok ditambah per kotak, tanpa checklist panjang.
- Admin bisa hapus karya & sesi, nonaktifkan/keluarkan anggota dengan konfirmasi.
- Build lokal pass; realtime jalan tanpa refresh manual.

## 4. NON-GOAL (sengaja TIDAK masuk)

- Upload file gambar (tetap link) — bisa jadi gelombang berikutnya.
- Migrasi data karya lama (dihapus begitu saja — keputusan Raken).
- Perubahan alur absen/pendaftaran.

## 5. ATURAN KERJA

- Semua tugas lewat PR; direct push cuma hotfix.
- PR yang bilang "run SQL before merge" = hard blocker.
- Tampilan publik nama anggota tetap lewat RPC security definer.
- Spec ini lokal sampai disetujui; setelah gas → commit + umumkan ke grup.
