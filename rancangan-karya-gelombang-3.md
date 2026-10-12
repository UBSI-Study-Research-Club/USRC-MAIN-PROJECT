# RANCANGAN KARYA — GELOMBANG 3 (DRAFT · LOKAL SAJA, JANGAN DI-COMMIT)

Status: IDE LENGKAP — semua keputusan terkunci (Chello jawab 2026-10-12).
Tinggal OK Raken untuk gas per gelombang.

Urutan eksekusi: A → B → C. Tiap pekerjaan = PR terpisah.

---

## GELOMBANG A — Perbaikan Hasil Audit (kecil, bisa gas duluan)

- **A1. Bintang popup basi.** Klik bintang dari detail popup → angka/status di popup
  tidak ikut update (snapshot lama). Fix: derive `detail` dari `karyaList` by id,
  jangan simpan objek terpisah.
- **A2. Guard "Akun Belum Aktif" di /karya.** Pendaftar pending/rejected yang
  OTP-login masih bisa buka form Buat Karya → error mentah FK violation.
  Fix: pakai pola GhostScreen seperti halaman absen.
- **A3. Karya kelompok yatim.** Insert karya sukses tapi insert project_members
  gagal → karya keclose tanpa anggota, retry = duplikat. Fix: urutan aman +
  pesan error jelas.
- Catatan: fix "validasi link" lama (poin #3 audit) DISERAP Gelombang B — form
  barunya yang atur, jangan dikerjakan dua kali.

---

## GELOMBANG B — Link Fleksibel + Sosmed Pembuat (ide Chello #1)

**Keputusan terkunci (Raken):**
1. Sosmed disimpan di PROFIL masing-masing — isi sekali, nempel di semua karya (opsi a).
2. Batas link per karya: 6 (Noelle yang atur).
3. Tipe link FIXED: repo, live, instagram, youtube, behance, figma, portfolio, image, other.
4. Karya lama DIHAPUS, tanpa migrasi data.

**Alur end-to-end:**
1. Anggota isi sosmed di /profil (usulan kolom: instagram, github, behance,
   linkedin — opsional, boleh kosong).
2. Buat karya: form dinamis — tambah link sampai 6, tiap link pilih tipe + label.
3. Karya approved: card → popup detail → link karya sesuai tipe + baris
   "Pembuat: nama (+ ikon sosmed dari profil)".
4. Tamu tetap bisa lihat semua tanpa login (pola RPC security definer seperti
   get_public_karya).

**Langkah teknis (URUTAN WAJIB — pelajaran revert PR #26):**
1. PR schema: tabel `project_links` + RLS + kolom sosmed di `profiles` + drop
   `repo_url`/`live_url` + hapus karya lama. Update RPC `get_public_karya`.
2. **Raken jalanin SQL di Supabase dulu** — UI TIDAK BOLEH merge duluan.
3. PR UI: form /karya dinamis + detail modal baru.
4. PR profil: form sosmed.
5. PR landing: card adaptasi (pakai link utama), tetap top-6 by bintang.

**Pembagian draft:** schema/SQL review + eksekusi Supabase = Raken;
form /karya + detail modal = Raken; /profil sosmed + landing = Chello.

---

## GELOMBANG C — Detail Builder + Admin (setelah B rampung, ide Chello #2)

- **C1. Pilih anggota kelompok model "tambah kotak"**: tombol "+ Tambah Orang"
  → nambah 1 kotak → pilih nama. Kotak menampilkan sosmed anggota dari profil.
- **C2. Detail karya = poin-poin bertipe.** Tipe poin FIXED — 5 macam
  (keputusan Raken + Chello):
  1. teks — penjelasan biasa
  2. chips — deretan card kecil (bahasa/tools), isi BEBAS KETIK
  3. swatch warna — palette karya gambar/design
  4. link — rujukan tambahan dalam detail
  5. tabel — buat jurnal/dokumentasi (tanggal rilis, progres, dll);
     kolom & isinya didefinisikan si pembuat karya saat isi form
  → Perlu tabel baru (mis. `project_detail_points`, value jsonb per tipe)
  + form dinamis (tambah poin, pilih tipe, isi) + renderer per tipe di modal.
  Digabung setelah B biar gak jadi PR monster.
- **C3. Admin panel diperluas** (keputusan Raken):
  - Hapus karya (policy sudah ada sejak Phase 1, tinggal UI).
  - Hapus sesi absen/meeting.
  - Anggota: NONAKTIFKAN + KELUARKAN/HAPUS, dua-duanya. Hapus = cascade
    permanen (karya, absen, pendaftaran ikut) → wajib ada dialog konfirmasi di UI.

---

## Catatan lintas gelombang

- Realtime: tabel baru (`project_links`, `project_detail_points`) harus masuk
  publication supabase_realtime — blok DO idempotent di schema.sql.
- Semua tampilan publik nama anggota tetap lewat RPC security definer.
- Spec final (PRD + plan bagi tugas) baru ditulis setelah jawaban Chello masuk.
