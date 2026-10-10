# design.md — Aturan Proyek & Panduan Desain USRC Web

Versi: 1.0 · Status: Aktif · Updated: 2026-10-10
Dokumen terkait: `PRD-USRCWEB.md` (kebutuhan produk) · `PLAN.md` (rencana eksekusi & tim) · `SPEC.md` (spesifikasi DB/RLS)

---

## 1. Bahasa Visual & Gaya (Editorial Neobrutalist + Glassmorphism Accent)

Desain USRC Web menggabungkan ketegangan **editorial neobrutalist** dengan aksen **glassmorphism** yang bersih di seluruh halaman.

### Karakter Visual:
- **Paper Background**: warna dasar hangat (`#F5F3EF`), bukan putih steril.
- **Exposed Borders & Hard Shadows**: border tegas (1.5px - 2px solid `#1A1A1A` atau maroon) dengan shadow keras (`box-shadow: 3px 3px 0px #7A1B2E`).
- **Glassmorphic Accents**: overlay transparan halus dengan backdrop blur (`backdrop-blur-md bg-white/70 border border-white/40`) pada kartu melayang, header/navbar, modal, atau floating badge.
- **Typography Kontras**: Display font uppercase bold (`Outfit`) dipadu Mono font (`IBM Plex Mono`) untuk aksen teknis (`// komentar`, badge, timestamp).
- **Sticker / Rotasi Elemen**: kartu & badge miring tipis (`-2deg` s/d `4deg`) untuk kesan majalah fisik.

### Aturan Bebas Tim Frontend:
- Mockup HTML di repo hanyalah referensi ide, **BUKAN patokan mati**. Tim frontend (Chello, Riski, Iwan) bebas berkreasi membuat layout dari nol selama mematuhi aturan warna, font, dan perpaduan gaya di atas.

---

## 2. Token Warna & Tipografi

### Palette Warna (Maroon Editorial):
```css
/* Core Brand */
--bg-paper:      #F5F3EF;  /* Warm paper background */
--color-maroon:  #7A1B2E;  /* Primary maroon */
--color-hot:     #A62639;  /* Secondary / hover state */
--color-pink:    #E38595;  /* Accent pink */
--color-dark:    #1A1A1A;  /* Border & heavy text */
--color-white:   #FFFFFF;  /* Card surface */

/* Status Colors */
--status-pending:  #FFF3C4; /* Warm yellow */
--status-approved: #D1E7DD; /* Muted green */
--status-rejected: #F8D7DA; /* Muted red */
```

### Tipografi:
- **Display / Heading**: `Outfit` atau `Cabinet Grotesk` (Uppercase, ExtraBold / Black, tracking wide).
- **Body Text**: `Work Sans` atau `Inter` (Clean, readable, 16px base).
- **Code / Technical / Badge**: `IBM Plex Mono` (diwakili prefix `//`, `[EST. 2026]`, timestamp UTC/WIB).

---

## 3. Komponen Utama & Referensi Visual

Source of truth visual: `C:\Users\Infinix\usrc-web\mockup-landing.html`.

1. **Hero Section**:
   - Kartu Stiker Kanan: Gambar 3D transparan (`assets/logo-usrc-3d.png`) ditempel di kartu putih dengan hard shadow maroon, miring 4°.
   - **Parallax Motion**: Kartu 3D melayang/naik pelan dan rotasi melonggar (4° → 1°) saat discroll.
   - *Catatan Next.js*: Pakai `framer-motion` (`useScroll`, `useTransform`). Wajib hormati `prefers-reduced-motion`.

2. **Tiket Sesi / Kegiatan Terakhir**:
   - Bentuk kartu seperti tiket fisik/kupon dengan border 2px dan notch/potongan tepi.
   - Menggunakan tag mono: `// SESI PASCA` atau `// SESI AKTIF`.

3. **Form Pendaftaran & Input**:
   - Input field kotak tegas dengan border 2px `#1A1A1A`, background `#FFFFFF` atau `#F5F3EF`.
   - Focus state: Hard shadow maroon bertambah tegas, bukan halo biru default browser.

---

## 4. Aturan Proyek & Code Convention

### Framework & Library:
- **Next.js**: App Router (`app/` directory).
- **CSS**: Tailwind CSS v4.
- **Icons**: `lucide-react` (style clean/stroke, sesuaikan dengan border tegas).
- **Aturan Libs**: **Dilarang menambah npm package baru** tanpa diskusi & persetujuan Raken. Gunakan stdlib TS + Tailwind + Supabase JS.

### Komponen & Folder (Strict Ownership):
```text
usrc-web/
├── app/
│   ├── (public)/          <-- Chello (landing, /project, /daftar)
│   ├── (auth)/            <-- Riski (/login, verify OTP)
│   └── (dashboard)/       <-- Iwan (absen, dashboard sekre, admin)
├── components/
│   ├── ui/                <-- Shared UI (Button, Card, Input) - Neobrutalist style
│   └── icons/             <-- Brand SVG assets (logo-usrc.svg dll)
├── lib/
│   └── supabase/          <-- Raken (client.ts, server.ts, RLS helpers)
└── supabase/
    └── migrations/        <-- Raken (File SQL skema & RLS)
```

### Code Standards:
1. **Mobile-First**: Tulis Tailwind breakpoint dari default (`flex-col`), baru `md:` / `lg:` untuk desktop. Minimum testing breakpoint: **360px**.
2. **Standard Language**: Bahasa UI untuk pengguna adalah **Bahasa Indonesia**. Nama variabel/code tetap Bahasa Inggris.
3. **No Inline Styling**: Semua styling via Tailwind class atau CSS Variables di `globals.css`.
4. **Interactive DB Standard**: Hindari hardcoded mock data di UI production. Gunakan loading state / skeleton saat fetching Supabase.

---

## 5. Checklist Review PR (Sebelum Merge ke `main`)

Setiap Pull Request harus lolos checklist ini:
- [ ] UI sesuai prinsip Neobrutalist di `design.md` (no glassmorphism).
- [ ] Tampilan rapi di HP (360px width test).
- [ ] Tidak ada warning TypeScript atau ESLint.
- [ ] Tidak ada hardcoded secret key (Supabase Service Role KEY haram di frontend).
- [ ] Query data / RLS disetujui Raken.
