# PRD — Cover Karya Otomatis dari og:image (Jalur 1)

> Status: DRAFT — menunggu OK Raken
> Tanggal: 2026-10-23 · Penyusun: Noelle
> Terkait: `prd-update-karya.md` · `sql-untuk-supabase-karya.sql`

---

## 1. Latar Belakang

Karya kategori **Web** dan **Tools** tampil di halaman karya tanpa gambar cover (cuma teks) karena tidak ada file yang diupload. Setelah diaudit:

- Karya Web yang ada sekarang ("Ragam Arsip Batik Indonesia") **tidak menyimpan URL-nya di kolom mana pun** — tabel `projects` bahkan belum punya kolom URL.
- Infrastruktur penyimpanan file ke **Telegram Datacenter** sudah lengkap dan terbukti jalan:
  - `POST /api/files` → `sendDocument` ke `TELEGRAM_STORAGE_CHAT_ID` → `file_id` disimpan di tabel `files`
  - `GET /api/files/[id]` → proxy stream dari Telegram (`src/lib/files/serve.ts`, lengkap retry + cache 1 jam)
- Kolom `projects.image_url` sudah ada dan `KaryaCover` sudah bisa menampilkannya (5 karya poster terbukti), plus placeholder untuk yang kosong.

Artinya: yang perlu dibangun tinggal **URL karya + pipeline pengambil og:image**, sisanya memakai infrastruktur yang ada.

## 2. Tujuan

1. Karya kategori Web/Tools punya **cover otomatis** yang diambil dari halaman depan web-nya (meta `og:image`).
2. Anggota tidak perlu menyiapkan/mengunggah gambar sama sekali.
3. Gambar tersimpan di **Telegram Datacenter** (bukan Supabase Storage) — konsisten dengan arsitektur file USRC.
4. Grup/kartu tetap rapi: gagal ambil gambar = placeholder, **tidak pernah memblokir** alur submit/approval.

## 3. Non-Tujuan (Fase Berikutnya)

- Screenshot penuh halaman (Cloudflare Browser Rendering / ApiFlash) — jalur 2, kalau og:image dirasa kurang.
- Re-fetch otomatis berkala (cukup tombol/manual dulu).

## 3a. Backfill Karya Lama (WAJIB masuk rilis ini)

Karya yang sudah approved sebelum update ini tidak menyimpan URL-nya (kolom `project_url` belum ada). Agar cover lama ikut terisi otomatis:

1. **Edit URL karya lama** — admin isi `project_url` lewat dashboard admin (sekali per karya).
2. **Tombol "Ambil Cover"** di dashboard admin — tampil hanya untuk karya yang `project_url` terisi tapi `image_url` masih kosong. Klik → jalankan pipeline yang sama (pasal 6) → `image_url` terisi, cover langsung tampil.
3. **Auto-backfill opsional**: saat deploy, jalankan sekali untuk semua karya approved yang memenuhi syarat poin 2 — biar yang lama beres tanpa klik satu-satu.

Endpoint pendukung: `POST /api/karya/[id]/cover` (admin only) → memanggil `generateOgCover(project)`.

## 4. Perubahan Database (SQL migration)

```sql
-- prd ini menghasilkan file: sql-karya-project-url.sql
alter table projects add column if not exists project_url text;

-- RLS: kolom baru ikut policy tabel projects yang sudah ada (select publik
-- untuk approved, insert/update milik owner). Tidak ada policy tambahan.
```

Kolom lain **tidak perlu**: `image_url` sudah ada, tabel `files` sudah ada.

## 5. Perubahan Form Submit

**File: `src/app/(public)/karya/page.tsx`** (form submit ada di sini, insert di ~baris 499)

- Field baru: **"Link Web / Demo"** (input url), tampil **wajib** saat kategori `Web` atau `Tools`, tersembunyi untuk kategori lain.
- Validasi client: harus diawali `http://` atau `https://`.
- Nilai disimpan ke `projects.project_url` pada insert yang sudah ada.

## 6. Pipeline og:image (inti fitur)

**Titik hook: saat admin menyetujui karya** — file `src/app/(dashboard)/dashboard/admin/page.tsx` (~baris 260, `update({ status: 'approved' })`). Dipanggil setelah update sukses, fire-and-forget (tidak menahan tombol ACC).

**Fungsi baru: `src/lib/karya/ogCover.ts`** — `generateOgCover(project)`

Alur:
1. **Validasi anti-SSRF** (wajib, jangan pernah dilewati):
   - scheme `http/https`
   - tolak hostname: `localhost`, `*.local`, IP literal privat/loopback (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`)
   - resolve DNS lalu cek ulang IP hasil resolve (anti DNS-rebinding versi sederhana)
2. **Fetch halaman** — timeout 8 detik, batas ukuran ~2 MB, `User-Agent` bot USRC.
3. **Ekstraksi gambar** berurutan:
   - `<meta property="og:image" content="...">`
   - `<meta name="twitter:image" content="...">`
   - fallback: `<link rel="icon">` / `/favicon.ico` (ukuran kecil, tetap lebih baik daripada placeholder)
   - URL relatif di-resolve terhadap base URL halaman.
4. **Download gambar** — timeout 8 detik, `Content-Type` harus `image/*`, maksimal 5 MB, tolak `image/svg+xml` (risiko XSS via proxy).
5. **Simpan ke Datacenter** — pakai ulang pola `POST /api/files` (ekstrak jadi helper bersama `uploadToTelegramStorage(bytes, name, mime)`, dipakai dua tempat):
   - `sendDocument` ke `TELEGRAM_STORAGE_CHAT_ID` dengan `TELEGRAM_BOT_TOKEN`
   - insert tabel `files` → dapat id
6. **Tulis hasil**: `projects.image_url = '/api/files/<id>'` (hanya jika kolom masih kosong — jangan menimpa cover yang sudah diupload anggota).

**Hasil gagal di langkah mana pun** (timeout, gak ada og:image, gambar rusak, SSRF): `image_url` tetap `null` → placeholder neobrutalist tampil seperti sekarang. Catat ke `console.error` dengan alasan singkat. **Approval tetap sukses.**

## 7. Perubahan Tampilan

**Tidak ada.** `KaryaCover` sudah menangani `image_url` ada/kosong. Card karya Web otomatis tampil gambar begitu `image_url` terisi.

## 8. Keamanan (ringkas)

- SSRF: validasi scheme + blokir IP privat/loopback + cek hasil resolve DNS (poin 6.1) — dianggap kebutuhan keamanan, bukan opsional.
- Content-type gambar divalidasi; SVG ditolak.
- Ukuran dibatasi (halaman 2 MB, gambar 5 MB) — server tidak bisa dibebani web raksasa.
- Pipeline hanya jalan dari server (env `TELEGRAM_BOT_TOKEN` tidak pernah ke klien).

## 9. Testing

1. **Unit** (`src/lib/karya/ogCover`): parser meta (og:image, twitter:image, favicon, URL relatif), validator anti-SSRF (localhost/private IP/dns rebinding ditolak).
2. **Integration**: mock fetch — og ada → image_url terisi via files; og gak ada → null, approval tetap sukses.
3. **E2E manual**:
   - Submit karya Web dengan URL yang punya og:image (mis. repo GitHub) → admin ACC → cover muncul di card & detail.
   - Submit dengan URL tanpa og:image (web statis polos) → placeholder, tanpa error.
   - Submit dengan `http://localhost:3000` → ditolak diam-diam, tercatat di log.
4. **Data lama**: isi manual `project_url` karya "Ragam Arsip Batik Indonesia" → jalankan pipeline sekali (endpoint admin kecil atau SQL+script) → cover muncul.

## 10. Rollout

1. Jalankan `sql-karya-project-url.sql` di Supabase (tambah kolom).
2. Deploy web.
3. Isi `project_url` untuk karya Web/Tools lama (manual via SQL/dashboard).
4. Re-run pipeline untuk karya lama tersebut, verifikasi cover.
5. Umumkan ke grup.

## 11. Pertanyaan Terbuka (untuk Raken)

1. Trigger alternatif: selain saat ACC admin, mau sekalian jalan saat **approval via bot Telegram** (`handled_via = 'telegram'`)? (Perlu akses yang sama dari worker bot — bisa menyusul.)
2. Favicon sebagai fallback terakhir: oke, atau lebih baik placeholder saja?
