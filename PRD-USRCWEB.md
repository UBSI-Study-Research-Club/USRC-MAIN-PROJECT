# PRD — USRC Web (Product Requirements Document)

Versi: 1.0 · Status: Aktif · Updated: 2026-10-10
Pemilik produk: Raken Rizki Saputra
Dokumen terkait: `PLAN.md` (eksekusi & pembagian tugas) · `design.md` (aturan proyek & desain) · `SPEC.md` (spesifikasi teknis v1.1, source of truth skema DB)

---

## 1. Ringkasan

Web resmi USRC (UBSI Study & Research Club) — komunitas lintas 3 prodi (Informatika, Sistem Informasi, SI Akuntansi) di UBSI Pontianak.

Satu kalimat: **tempat anggota absen & kelola kegiatan, sekaligus etalase karya nyata untuk publik.**

Prinsip produk (tidak bisa ditawar):
- **Serba interaktif** — kalau bisa dihitung dari database, jangan diketik manual. Stat landing, feed kegiatan, galeri = live dari DB. NOL upload rutin.
- **Jadwal mendatang tidak publik** — publik cuma lihat sesi lampau. Alasan: jadwal sering berubah + orang acak jangan muncul.
- **Mobile-first** — anggota pakai HP, muat < 3 detik di 4G, enak di 360px.

## 2. Tujuan (urutan prioritas)

1. Anggota bisa absen sesi dengan gampang dari HP.
2. Publik (maba, dosen, kaprodi) bisa melihat hasil nyata anggota — project, kegiatan.
3. Pendaftaran anggota baru otomatis, tidak lewat chat manual.

## 3. Non-goal (jangan dikerjakan)

- Marketplace, forum diskusi, chat real-time
- Aplikasi mobile native
- Multi-kampus / white-label
- Geotagging / selfie absen
- Password (auth = email OTP saja)

## 4. Pengguna & role

| Role | Siapa | Bisa apa |
|---|---|---|
| public | siapa saja, tanpa login | landing, feed "Kegiatan Terakhir", galeri project (F2), form daftar |
| anggota | mahasiswa di-approve | lihat jadwal mendatang, absen, upload project (F2) |
| sekre | Riski Bagus (internal), Aya (eksternal) | validasi absen realtime, approve pendaftar & project |
| admin | Raken, Iwan | semua di atas + CRUD jadwal/event + kelola user & role |

Role disimpan di `profiles.role` (enum: `anggota`, `sekre`, `admin`). Pendaftar baru belum punya profile sampai di-approve.

## 5. Kebutuhan fitur

### Fase 1 — MVP

#### F1.1 Landing page (publik)
- Hero + 4 core (study, research, build project, collaboration) + CTA "Gabung".
- Stat live dari DB (jumlah anggota, sesi, karya) — bukan angka ketikan.
- Feed "Kegiatan Terakhir": sesi lampau (`ends_at < now()`) + jumlah hadir. Foto recap optional.
- Teaser: "Login buat lihat jadwal & absen".
- **Selesai bila:** dibuka tanpa login, < 3 detik di 4G, stat benar (dicek vs DB).

#### F1.2 Pendaftaran anggota (publik)
- Form: nama, NIM, email, prodi (dropdown 3 prodi), alasan (opsional).
- Constraint `registrations`: UNIQUE `(email, nim)` — cegah dobel daftar. Email divalidasi format.
- Masuk antrian `status='pending'`.
- Sekre approve → magic link terkirim → row `profiles` dibuat via trigger `on auth.users insert`. Urutan WAJIB: auth user dulu, profiles menyusul (FK).
- Reject → status `rejected`, tanpa email balasan (free tier). Feedback lewat WA sekre.
- **Selesai bila:** maba daftar dari HP tanpa dibantu; dobel submit (email atau NIM sama) ditolak DB.

#### F1.3 Login (Riski)
- Email → OTP 6 digit → verify. Tanpa password. Supabase `signInWithOtp` + `verifyOtp`.
- Halaman login mengikuti `design.md` (neobrutalist).
- **Selesai bila:** login berhasil dari HP, OTP salah/salah kirim punya pesan error jelas (bahasa Indonesia).

#### F1.4 Absen (Iwan)
- Anggota login → lihat sesi aktif HANYA jika `now()` dalam window absen (`starts_at - 30 menit` s/d `ends_at`).
- Window dicek **server-side** (`now()` Supabase), bukan jam HP.
- Klik "Absen" → insert `attendances(status='pending')`. UNIQUE `(meeting_id, user_id)` — dobel klik = 1 row.
- Anti-curang minimum: window server-side + unique + OTP email. Tanpa GPS/selfie.
- **Selesai bila:** absen sukses dalam window; di luar window tombol tidak ada; dobel klik tidak bikin 2 row (diuji).

#### F1.5 Dashboard sekre (Iwan)
- Lihat absen per sesi **realtime** (Supabase Realtime): nama, NIM, prodi, waktu, status.
- Tombol: Approve (`status='approved'`), Revoke (delete row).
- Antrian pendaftar baru: approve / reject.
- Juga di area ini: admin CRUD jadwal + atur role.
- **Selesai bila:** sekre approve absen dari HP; dashboard update tanpa refresh.

### Fase 2 — setelah MVP dipakai 2-3 sesi

- **F2.1 Upload project** (Iwan): judul, deskripsi, gambar, repo/live URL, kategori. Alur: pending → approve sekre/admin → publik.
- **F2.2 Galeri project** (Chello): halaman `/project`, filter kategori & anggota, kartu → detail.
- **F2.3 Profil anggota** (Chello): profil + daftar project miliknya.
- Landing dapat strip preview 4-6 karya + "Lihat semua".

### Fase 3 — nanti (garis besar saja)

Arsip riset (PDF, sitasi, abstrak) · Event + pendaftaran event · Komentar/like publik.

## 6. Alur utama

1. **Daftar → jadi anggota:** isi form → `registrations.pending` → sekre approve → auth user dibuat → magic link ke email → klik → login → profile ada.
2. **Login:** email → OTP 6 digit → dashboard anggota.
3. **Absen:** login → sesi aktif tampil (sesuai window) → klik Absen → `pending` → sekre approve → `approved`.
4. **Recap publik (otomatis):** sesi lewat → muncul di "Kegiatan Terakhir" + COUNT hadir. Tanpa input manual siapa pun.

## 7. Data model (ringkas)

Source of truth: `SPEC.md` §5 (SQL lengkap). Tabel: `profiles`, `registrations`, `meetings`, `attendances`, `projects` (F2).

Aturan data yang tidak boleh dilanggar:
- Semua `timestamptz` UTC. Admin input WIB → konversi ke UTC sebelum insert.
- UNIQUE: `registrations(email, nim)`, `attendances(meeting_id, user_id)`, `profiles.nim`.
- RLS enabled di SEMUA tabel (detail di `SPEC.md` §6 — domain Raken).
- Service role key TIDAK PERNAH di kode frontend.

## 8. Batasan teknis

- Hosting: Vercel free + Supabase free (500MB DB, 1GB storage). Tanpa biaya bulanan.
- Auth: email OTP saja. Catatan risiko: SMTP bawaan Supabase free berbatas ketat (~2-4 email/jam) — mitigasi di `PLAN.md` §6.
- Bahasa UI: Indonesia. Breakpoint minimum 360px.
- Deploy: push GitHub → Vercel auto-deploy. `main` = production.

## 9. Definition of done — Fase 1

- [ ] Maba daftar dari HP tanpa dibantu
- [ ] Sekre approve pendaftar & lihat absen realtime dari HP
- [ ] Anggota absen sesi aktif; dobel klik = 1 row
- [ ] Landing dibuka tanpa login; stat & feed hidup dari DB
- [ ] Semua tabel RLS enabled & diuji dengan akun biasa (tidak bisa curang)
