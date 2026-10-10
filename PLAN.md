# PLAN — USRC Web (Rencana Eksekusi)

Versi: 1.0 · Updated: 2026-10-10
Dokumen terkait: `PRD-USRCWEB.md` (apa yang dibangun) · `design.md` (aturan proyek) · `SPEC.md` (teknis DB/RLS)

---

## 1. Stack (final)

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | SSR untuk landing cepat, ekosistem besar, deploy Vercel mulus |
| Styling | Tailwind CSS v4 | Mockup HTML → utilitas class langsung; neobrutalist gampang (border kasar, hard shadow) |
| Motion | framer-motion | Parallax hero (useScroll + useTransform), hormat prefers-reduced-motion |
| DB + Auth | Supabase (free tier) | Postgres + RLS + OTP email + Realtime + Storage, satu layanan |
| Hosting | Vercel (free) | Auto-deploy dari GitHub, `main` = production |

Aturan dependensi: **tidak boleh tambah library tanpa setuju Raken** (lihat `design.md` §2).

## 2. Tim & ownership

| Orang | Peran | Milik dia | Jangan sentuh |
|---|---|---|---|
| **Raken** | Backend lead | Skema DB, RLS, edge function, auth flow, migration files, review semua PR yang sentuh data | Styling UI |
| **Riski Bagus Wardana** | Frontend — auth | Halaman login (`/login`, OTP, verify, error state) | RLS, skema DB, halaman lain |
| **Iwan (a.k.a. Riduwan)** | Frontend — area login | Dashboard anggota, absen, dashboard sekre, upload project (F2), panel admin | RLS, skema DB, landing |
| **Chello** | Frontend — publik | Landing, feed "Kegiatan Terakhir", galeri + profil project (F2) | RLS, skema DB, area login |

Aturan lintas orang:
- Butuh kolom/tabel/RLS baru → minta Raken DULU. Dilarang CREATE TABLE dari frontend.
- Komponen bersama (button, card, layout) dibuat sekali di `components/ui/` — siapa pun boleh pakai, perubahan visual = lewat review.
- Semua PR yang menyentuh `supabase/`, `middleware`, atau query data → wajib review Raken.

## 3. Urutan rilis (BUKAN big bang)

Satu bagian selesai = rilis. Jangan tunggu semua.

| Rilis | Isi | Pekerja utama |
|---|---|---|
| R0 | Repo + scaffold Next.js + Supabase project + skema & RLS dasar | Raken |
| R1 | Landing (hero, 4 core, stat live, CTA) + deploy pertama | Chello |
| R2 | Pendaftaran publik + antrian approve (sekre) | Chello + Iwan + Raken |
| R3 | Login OTP + jadwal untuk anggota login | Riski + Raken |
| R4 | Absen + dashboard sekre realtime | Iwan + Raken |
| R5 | Panel admin (CRUD jadwal, role) | Iwan + Raken |
| F2 | Upload project + galeri + profil anggota | Iwan + Chello |

R0-R1 = target minggu 1. R2-R3 = minggu 2. R4-R5 = minggu 3. F2 = setelah MVP dipakai 2-3 sesi beneran.

## 4. Definition of done per rilis

- R0: `npm run dev` jalan di 3 laptop; skema + RLS terpasang; repo di GitHub org MuaraAI.
- R1: landing live di URL Vercel; stat cocok dengan DB.
- R2: ada orang luar berhasil daftar sendiri dari HP; sekre approve dari HP.
- R3: anggota sungguhan login pakai OTP tanpa bantuan.
- R4: sesi pertama dipakai absen beneran; sekre approve realtime dari HP.
- R5: admin bikin jadwal mingguan tanpa bantuan Raken.

DoD Fase 1 lengkap: lihat `PRD-USRCWEB.md` §9.

## 5. Workflow kerja

- Repo: GitHub org **MuaraAI**, nama `usrc-web`. Branch `main` = production (auto-deploy). Kerja di branch fitur (`feat/login`, `feat/absen`) → PR → merge.
- Setiap rilis di-tag / minimal dicatat di commit message: `R4: absen + dashboard sekre`.
- Komit kecil-kecil, pesan jelas. Dilarang push langsung ke `main` (kecuali Raken untuk hotfix).
- Perubahan skema DB: Raken tulis sebagai file SQL migration di `supabase/migrations/` — TIDAK klik-klik manual di dashboard, supaya tercatat & bisa diulang.
- Handoff antar orang: halaman mengikuti mockup `mockup-landing.html` + `design.md`. Kalau ragu, tanya di grup, jangan nebak sendiri.

## 6. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Raken bottleneck (semua urusan DB lewat dia) | Skema terdokumentasi di SPEC.md + migration files; Iwan = admin kedua di Supabase dashboard (baca, bukan ubah skema) |
| SMTP bawaan Supabase free berbatas (~2-4 email/jam) → OTP/invite molor saat ramai | **Keputusan sementara:** sekre copy magic link dari dashboard, kirim manual via WA. Upgrade path: Resend free (3000 email/bln) kalau sudah terbukti perlu |
| Tim 3-4 orang semua sibuk kuliah | Urutan rilis §3 — fitur kecil rilis cepat; kalau 2 bulan MVP belum jalan → turunkan scope (landing + Google Form) |
| Dobel data pendaftar | UNIQUE `(email, nim)` di DB, bukan cuma validasi form |
| Jam WIB ketukar UTC | Satu helper konversi WIB→UTC dipakai semua form admin; dicek di R4 |

## 7. Keputusan terbuka (perlu putusan, tidak blocker R0-R2)

1. Domain: `usrc-web.vercel.app` dulu, domain kustom belakangan (~Rp150rb/thn) — putuskan sebelum R1 kalau mau.
2. Email otomatis via Resend: tunggu bukti kebutuhan setelah R2/R3.
3. Nama repo final & apakah private dulu sampai R1.
