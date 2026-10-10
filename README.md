# USRC Web (USRC-MAIN-PROJECT)

Web Resmi **UBSI Study & Research Club (USRC)** — UBSI Pontianak.

Aplikasi web untuk manajemen anggota, presensi/absen sesi kumpul, serta pendaftaran & etalase karya nyata komunitas.

---

## 🛠 Stack Teknis

- **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Motion**: [framer-motion](https://www.framer.com/motion/)
- **Backend & Auth**: [Supabase](https://supabase.com/) (Postgres DB, RLS, Auth OTP, Realtime)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 👥 Pembagian Tim & Folder Code Base

Struktur folder App Router Next.js dibagi berdasarkan kepemilikan area kerja:

```text
usrc-web/
├── app/
│   ├── (public)/          <-- Chello (Landing Page, /daftar, feed kegiatan)
│   ├── (auth)/            <-- Riski Bagus Wardana (/login, OTP UI)
│   └── (dashboard)/       <-- Iwan / Riduwan (Absen anggota, Dashboard Sekre & Admin)
├── components/
│   ├── ui/                <-- Shared UI Components (Neobrutalist + Glassmorphic accent)
│   └── icons/             <-- Brand SVG assets
├── lib/
│   └── supabase/          <-- Raken (Client, Server & RLS helpers)
└── supabase/
    └── migrations/        <-- Raken (File SQL skema DB & RLS)
```

---

## 📖 Berkas Dokumentasi

- **`PRD-USRCWEB.md`** — Product Requirements Document & DoD per fitur.
- **`PLAN.md`** — Rencana eksekusi, timeline rilis (R0 - R5), & alur kerja tim.
- **`design.md`** — Aturan gaya visual (Editorial Neobrutalist + Glassmorphic accent), token warna, & font.
- **`SPEC.md`** — Spesifikasi teknis backend, skema tabel Supabase, & aturan RLS.

---

## 🚀 Memulai (Local Development)

1. Clone repositori:
   ```bash
   git clone https://github.com/UBSI-Study-Research-Club/USRC-MAIN-PROJECT.git
   cd USRC-MAIN-PROJECT
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Environment Variables:
   Buat file `.env.local` di root folder:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJKV1QiLC...
   ```

4. Jalankan server lokal:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser.
