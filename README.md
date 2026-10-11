# USRC — UBSI Study & Research Club

> **Ruang berkarya yang nggak biasa.** Platform digital untuk koordinasi studi, riset, dan project bersama.

![Status](https://img.shields.io/badge/Phase-1_MVP-7A1B2E?style=flat-square)
![Deploy](https://img.shields.io/badge/Vercel-Live-000?style=flat-square)
![Tech](https://img.shields.io/badge/Next.js_15-Supabase-0070F3?style=flat-square)

🔗 **Live:** https://usrc-main-project.vercel.app

---

## 📋 Table of Contents

- [Apa itu USRC?](#apa-itu-usrc)
- [Phase 1 MVP — Fitur Inti](#phase-1-mvp--fitur-inti)
- [Alur Pengguna (User Journey)](#alur-pengguna-user-journey)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Setup & Development](#setup--development)
- [Deployment](#deployment)
- [Roadmap Fase 2](#roadmap-fase-2)

---

## Apa itu USRC?

**USRC** (UBSI Study and Research Club) adalah organisasi mahasiswa yang mengumpulkan pemikir dari **3 prodi**: Informatika, Sistem Informasi, dan SI Akuntansi.

Kami fokus pada:
- 📚 **Study**: Belajar bareng materi kuliah + teknologi terkini
- 🔬 **Research**: Eksplorasi riset, paper, presentasi
- 🛠️ **Build**: Project nyata — web, mobile, IoT
- 👥 **Collaboration**: Lintas prodi, lintas disiplin ilmu

**Masalah tua:** Koordinasi via WA grup (chaos), absensi manual (gampang curang), tracking progress gak terstruktur.

**Solusi:** Platform terpusat — satu dashboard untuk absen, sesi, approval, dan collab.

---

## Phase 1 MVP — Fitur Inti

### 🎯 Scope Phase 1

Phase 1 membangun **inti infrastruktur**: login aman, dashboard anggota, sistem absensi real-time, dan panel sekretaris untuk manajemen sesi.

#### 1️⃣ **Landing Page & Public Stats**

**Apa:** Homepage publik yang menampilkan identitas USRC dan statistik live.

**Fitur:**
- Hero section: brand USRC, 4 pilar (Study/Research/Build/Collaboration)
- **Live Counter** (real-time dari database):
  - Jumlah anggota aktif (approved)
  - Sesi yang sudah diadakan
  - Karya/project terselesaikan
- Section "Kegiatan Terakhir": strip tiket absensi 6 sesi terakhir dengan jumlah hadir
- CTA: "Gabung Sekarang" (daftar) / "Login" (anggota)

**Tech:**
- RPC `get_public_stats()` — tamu bisa query angka, tapi gak bisa baca data mentah (RLS + security definer)
- Framer Motion: fade-up animation, parallax scroll hero
- Responsive: mobile-first (2.25/3/4.5/5rem hero font scaling)

---

#### 2️⃣ **Sistem Registrasi & OTP Login**

**Apa:** Calon anggota daftar via form, tunggu approval sekretaris, baru bisa login.

**Alur:**
```
PENDAFTAR
   ↓
[Form Daftar: nama, NIM, prodi, email]
   ↓
[OTP 8-digit ke Gmail — custom SMTP 30/jam]
   ↓
[Status: pending — tunggu sekretaris approve]
   ↓
SEKRETARIS
   ↓
[Dashboard Sekre: list pendaftar → approve/reject]
   ↓
[Jika approve → RPC create_profile otomatis]
   ↓
ANGGOTA LOGIN
   ↓
[Email + OTP (terkirim ulang) → Supabase session]
   ↓
[Masuk dashboard → bisa absen, lihat profil]
```

**Security:**
- Email + NIM unique constraint (tidak bisa daftar 2x dengan data sama)
- Yang ditolak bisa daftar ulang (partial unique index: hanya pending/approved yang locked)
- OTP expire 10 menit, rate limit 3x/jam per email
- Refresh token auto-persist (stay login across devices)

**Tech:**
- Supabase Auth (OAuth email + custom SMTP)
- RPC `approve_registration()` — sekretaris approve → trigger auto-create profile
- TypeScript + form validation (Zod optional, bisa plain validation)
- Motion: fade-up 0.4-0.5s, 20px translate, respects `prefers-reduced-motion`

---

#### 3️⃣ **Dashboard Anggota**

**Apa:** Rumah anggota — lihat profil, absen, riwayat, settings.

**Tab/Menu:**
- **Profil**: Nama, NIM, prodi, role, join date — edit terbatas (nama saja, sisanya dari approval)
- **Absen Realtime**: 
  - List sesi hari ini (window 30 menit sebelum start)
  - Tombol "Absen Sekarang" — insert attendance, instant update di sekretaris
  - Status: pending (anggota absen) → approved (sekretaris konfirmasi)
  - Delete absen: sekretaris cabut → realtime hilang dari layar anggota
- **Riwayat**: Semua absensi anggota (timeline)
- **Settings**: Theme toggle (light/dark), logout

**Navbar Adaptif:**
- Guest: tombol Daftar/Login
- Anggota: Home, Absen, Profil, Logout
- Sekretaris (role=sekre): + "Dashboard Sekre" tab

**Tech:**
- Loading skeleton (shimmer animation) while fetching
- Realtime sub: Supabase `.on('INSERT')` untuk attendance baru
- RLS: anggota hanya lihat profil + absen mereka sendiri
- Motion: fade-up cascade per item

---

#### 4️⃣ **Dashboard Sekretaris**

**Apa:** Command center sekre — buat sesi, approve absen, manage pendaftar.

**Tab/Menu:**

**A. Buat Sesi (Create Meeting)**
- Form: Tanggal, Jam Mulai, Durasi (menit), Ruangan
- Submit → insert ke tabel `meetings`
- Instantly bisa dilihat anggota (window 30 menit sebelum start)
- Contoh: Sekre buat sesi "Standup Teknik 2026-10-11 16:00-17:00 Lab D4" → anggota notif + bisa absen pas waktunya

**B. Kelola Absensi**
- List anggota untuk sesi terpilih
- Status: pending (menunggu konfirmasi) → approve/reject
- Bulk actions: approve all / reset untuk resesi
- Realtime: ketika anggota absen, langsung muncul di list (tidak perlu refresh)

**C. Kelola Pendaftar**
- List calon anggota: email, NIM, prodi, waktu daftar
- Action: Approve → create profile + auto-generate password (atau email link)
- Action: Reject → mark as rejected (bisa daftar ulang nanti)
- Search/filter: by email, NIM, prodi

**Tech:**
- RPC `approve_registration()` — transaction: update registration.status + insert profiles
- Realtime sub: `.on('INSERT', 'attendances')` untuk anggota absen baru
- Delete attendance: pakai `payload.old` (bukan `payload.new` yang null saat DELETE)
- RLS: sekre hanya bisa akses data USRC (tidak ada data klub lain)

---

#### 5️⃣ **Sistem Kehadiran Real-time**

**Apa:** Absensi instan tanpa rigging, dengan approval dua-tingkat.

**Mekanisme:**
```
ANGGOTA
   ↓
[Pas window absen (30 min before start), klik "Absen Sekarang"]
   ↓
[INSERT attendance: {meeting_id, user_id, status='pending', checked_at}]
   ↓
SEKRETARIS (Real-time)
   ↓
[Baru absen anggota langsung muncul di layar sekre (Realtime sub)]
   ↓
[Sekre review: ini orang apa, valid gak? → Approve/Reject]
   ↓
ANGGOTA (Real-time)
   ↓
[Jika reject: attendance hilang realtime dari layar anggota]
   ↓
[Riwayat tetap tercatat (status=rejected) untuk audit]
```

**Validasi:**
- Client-side: window 30 menit sebelum start sampai 5 menit after
- Server-side: RLS + DB constraint `is_within_window()` function
- Anti-dobel: unique constraint `(meeting_id, user_id)` — gabung 2x sesi sama = error
- Revocation: sekre cabut → realtime delete dari UI anggota

**Tech:**
- Supabase Realtime (table subscriptions)
- Payload.old (untuk DELETE events)
- Unique constraint + check constraint di DB
- Motion: delete fade-out 0.3s

---

#### 6️⃣ **Branding & UI/UX**

**Design System: Neobrutalism + Glassmorphism**

- **Color Palette:**
  - Maroon (`#7A1B2E`): primary, tombol, highlight
  - Hot Pink (`#A62639`): accent, hover
  - Pink (`#E38595`): card tint
  - Paper Beige (`#F5F3EF`): background
  - Dark (`#1A1A1A`): text, border
  - White (`#FFFFFF`): form, glass

- **Typography:**
  - Display: Outfit (bold, uppercase headers)
  - Body: Work Sans (readable, warm)
  - Mono: IBM Plex Mono (code, timestamps)

- **Components:**
  - Border: 2px solid dark, sharp (no radius)
  - Shadow: hard shadow `3-6px offset` (neobrutalist depth)
  - Motion: fade-up 0.4-0.5s, 20px slide, respects `prefers-reduced-motion`
  - Glass (landing): `border-white/40 bg-white/70 backdrop-blur-md`

- **Logo:**
  - SVG interlocked hexagons (3 rings = Study/Research/Build)
  - Favicon 16px readable
  - Mark (simplified) untuk icons

- **Responsive:**
  - Mobile-first
  - Hero: 2.25rem → 3 → 4.5 → 5rem (sm/md/lg/xl)
  - Nav: collapse hamburger pada mobile (TBD Fase 2)
  - Spacing: gap-4/md:gap-6/lg:gap-8

---

### 📊 Database Schema (Simplified)

```sql
-- Users (via Supabase Auth)
auth.users {
  id (UUID)
  email
  created_at
}

-- Public Tables (RLS active)
public.registrations {
  id, email, nim, full_name, prodi, status (pending|approved|rejected), created_at
}

public.profiles {
  id (FK auth.users), full_name, nim, prodi, role (anggota|sekre|admin), created_at
}

public.meetings {
  id, title, description, starts_at, ends_at, location, created_by (FK profiles)
}

public.attendances {
  id, meeting_id (FK), user_id (FK profiles), status (pending|approved|rejected), checked_at
  Unique(meeting_id, user_id)
}

-- RPC Functions
get_public_stats()
  → {members: count(profiles), sessions: count(meetings where ends_at < now), projects: 0}

approve_registration(email_input)
  → Update registrations.status = 'approved' + Insert profiles + Return profile
```

---

## Alur Pengguna (User Journey)

### Scenario 1: Calon Anggota Daftar

```
[Landing] Klik "GABUNG SEKARANG"
   ↓
[Form Daftar: Nama, NIM, Prodi, Email]
   ↓
[Submit] → Validasi (email/NIM unique) → Insert registrations (status=pending)
   ↓
[Email terkirim OTP 8-digit] → Copy-paste ke form
   ↓
[Verify] → Supabase session create, redirect /dashboard/absen
   ↓
[Dashboard] "Akun Belum Aktif" — tunggu sekretaris approve
   ↓
[Sekretaris] Login → Dashboard Sekre → Kelola Pendaftar → Approve
   ↓
[Approval RPC trigger] → Create profile (user mendapat role=anggota)
   ↓
[Anggota refresh] → Unlock absen, profil, menu
   ↓
**Status: AKTIF**
```

### Scenario 2: Anggota Absen Sesi

```
[Anggota login] → Dashboard
   ↓
[Sesi hari ini muncul] Standup Teknik 16:00-17:00
   ↓
[Pas jam 15:30 (30 min before)] Tombol "Absen Sekarang" aktif
   ↓
[Klik] → INSERT attendance (status=pending)
   ↓
[Sekretaris dashboard realtime] Baru anggota absen langsung muncul
   ↓
[Sekre click approve] → UPDATE attendance.status = 'approved'
   ↓
[Anggota realtime] Lihat status "Approved" ✓
   ↓
**Kehadiran tercatat**
```

### Scenario 3: Sekretaris Buat Sesi

```
[Sekretaris] Login → Dashboard Sekre
   ↓
[Tab Absen] → "Buat Sesi" button
   ↓
[Form] Tanggal (2026-10-11), Jam (16:00), Durasi (60 min), Ruangan (Lab D4)
   ↓
[Submit] → INSERT meetings
   ↓
[Landing + Dashboard anggota] Stats "Sesi" update realtime
   ↓
[Anggota notif] Sesi baru tersedia untuk absen
   ↓
**Sesi live di sistem**
```

---

## Arsitektur Sistem

### Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 15 (App Router), React 19, Framer Motion, Tailwind CSS 4 |
| **Backend** | Supabase PostgreSQL, RPC functions, RLS policies |
| **Auth** | Supabase Auth (email + OTP), custom SMTP Gmail |
| **Realtime** | Supabase Realtime (WebSocket) |
| **Deployment** | Vercel (frontend) + Supabase hosted (DB) |
| **Design** | Neobrutalism + Glassmorphism, responsive mobile-first |

### Folder Structure

```
usrc-web/
├── src/
│   ├── app/
│   │   ├── (public)/         # Landing, daftar, login — anon
│   │   │   ├── page.tsx      # Landing page + live stats
│   │   │   ├── daftar/
│   │   │   └── auth/
│   │   ├── (dashboard)/      # Anggota + Sekre — auth required
│   │   │   ├── layout.tsx    # Navbar, sidebar
│   │   │   ├── absen/        # Anggota: attendance + sekre: manage
│   │   │   ├── profil/
│   │   │   └── dashboard/sekre/  # Sekre: create meeting, approve
│   │   └── auth/
│   │       └── callback/     # OTP → session → redirect
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts     # Client init
│   │   │   └── server.ts     # Server init (for RSC)
│   │   └── utils.ts
│   └── components/           # Reusable: NavLink, StatCard, etc
├── supabase/
│   └── schema.sql            # Tables, RPC, RLS policies
└── public/
    └── logo/                 # SVG assets
```

### Data Flow

```
Landing (Public)
   ↓ fetch RPC get_public_stats()
   ↓ Supabase (anon key) — RLS allows public read
   ↓ Display: members=6, sessions=0, projects=0

Dashboard Anggota (Protected)
   ↓ Supabase Auth getUser() — must have session
   ↓ Fetch profiles, attendance, meetings — RLS filters per user
   ↓ Subscribe realtime: new attendance, status changes
   ↓ Update UI realtime

Dashboard Sekre (Protected + Role check)
   ↓ Check role = 'sekre' or 'admin' — server-side RLS
   ↓ CRUD: meetings, attendance, registrations
   ↓ Broadcast realtime: attendance.INSERT → all sekre subscribed
   ↓ Trigger: approve_registration RPC → create profile
```

---

## Setup & Development

### Prerequisites

- Node.js 18+ (20 recommended)
- npm 9+ (or yarn/pnpm)
- Git
- Supabase account (free tier OK)
- GitHub account

### 1. Clone & Install

```bash
git clone https://github.com/UBSI-Study-Research-Club/USRC-MAIN-PROJECT.git
cd usrc-web
npm install --registry=https://registry.npmmirror.com  # Fast npm mirror
```

### 2. Environment Setup

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wagvbmkimpswiidnenwx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SERVICE_ROLE_KEY=<your-service-role-key>

# Gmail SMTP (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-gmail>
SMTP_PASS=<app-password>

# Optional: Analytics, etc.
NEXT_PUBLIC_ANALYTICS_ID=
```

### 3. Database Setup

1. Create Supabase project (free)
2. Go to SQL Editor
3. Copy-paste `supabase/schema.sql` → Execute
4. Verify tables + RPC functions created

### 4. Run Local

```bash
npm run dev
# http://localhost:3000
```

### 5. Testing Workflow

**A. Test Landing Stats:**
```
curl -H "apikey: $ANON_KEY" https://wagvbmkimpswiidnenwx.supabase.co/rest/v1/rpc/get_public_stats
```

**B. Test Registration:**
- Go to `/daftar` → fill form → verify OTP (check console)
- Check Supabase: registrations table → new row (status=pending)

**C. Test Approval (as Sekretaris):**
- Switch role in DB: `UPDATE profiles SET role='sekre' WHERE email='<your-email>'`
- Login → Dashboard Sekre → Approve pendaftar
- Check: profiles table → new row created for approved user

**D. Test Absensi:**
- Create meeting: `INSERT meetings (title, starts_at, ends_at, location) VALUES (...)`
- Login as anggota → sesi muncul pas window (30 min before)
- Click absen → attendance.INSERT → realtime update

---

## Deployment

### Vercel (Frontend)

1. Push ke GitHub
2. Connect repo ke Vercel
3. Add env vars (.env.local → Vercel settings)
4. Auto-deploy on push

```bash
git push origin main
# Vercel auto-build & deploy
```

### Supabase (Database)

- Already hosted
- Migrations: add SQL di supabase/migrations/ → Vercel redeploy triggers DB sync
- RLS policies active in production

### Monitoring

- Vercel: analytics, error logs
- Supabase: query performance, realtime usage
- Console logs: landing stats fetch errors (for debugging)

---

## 📌 Development Status

**Phase 1 MVP: LIVE** 🟢

Semua fitur inti sudah production-ready:
- ✅ Landing page + live stats
- ✅ Registrasi + OTP login
- ✅ Dashboard anggota
- ✅ Dashboard sekretaris
- ✅ Real-time absensi
- ✅ Branding + responsive design

**Fase 2 dan fitur tambahan:** In Progress / Ongoing planning

---

## 🤝 Contributing

### Branch Strategy

- **main**: production-ready
- **feat/**: new features (branch dari main, PR review sebelum merge)
- **fix/**: bug fixes (per bug = 1 PR, audit gabungan sebelum merge)

### Workflow

1. Create branch: `git checkout -b feat/feature-name`
2. Commit: `git commit -m "feat(scope): description"`
3. Push: `git push origin feat/feature-name`
4. Open PR → code review → approve → merge
5. Delete branch setelah merge

### Team

- **Raken** (Lead): Backend, RLS, database design
- **Riski**: Auth system, OTP, security
- **Iwan**: Absensi, dashboard sekre, realtime
- **Chello**: Landing page, branding, UI polish

---

## 📝 License

MIT — Built by USRC for UBSI Pontianak.

---

## 📞 Support & Questions

- **Discord/WA**: @USRC-Admin (untuk discuss fitur)
- **GitHub Issues**: Report bugs, suggest features
- **Email**: usrc@ubsi.ac.id (TBD)

---

## 🎨 Design Assets

- **Logo SVG**: `public/logo-usrc.svg` (maroon, dark)
- **Logo White**: `public/logo-usrc-white.svg` (for dark bg)
- **Favicon**: `public/favicon.svg` (16px)
- **Brand Guide**: TBD (akan di-push di Fase 2)

---

## 🔐 Security

### RLS Policies (Row-Level Security)

- **profiles**: Anggota hanya bisa read profil sendiri (except admin)
- **registrations**: Hanya sekre/admin yang bisa read (calon anggota gak lihat pending list)
- **attendances**: Anggota hanya lihat absen sendiri, sekre lihat semua
- **meetings**: Public read (semua bisa lihat jadwal), sekre only write

### Auth Flow

1. Email + OTP (8-digit, 10 min expire)
2. Supabase session token (auto-refresh)
3. JWT decoded server-side di RSC (React Server Component)
4. Role check di RLS + middleware (if added Fase 2)

### Data Privacy

- Password hashing: Supabase default (bcrypt)
- SMTP: Gmail app-password (tidak plain text)
- No PII logged (privacy-first)

---

## 📊 Phase 1 Success Metrics

✅ **Completed:**
- [x] Landing page dengan live stats
- [x] Registrasi + OTP login
- [x] Dashboard anggota (profile, absen, riwayat)
- [x] Dashboard sekretaris (create sesi, manage absen, approve pendaftar)
- [x] Real-time attendance sync
- [x] Neobrutalist design + responsive
- [x] Production deploy (Vercel)

📈 **KPIs:**
- Member signup: 10+ anggota
- Monthly active: 80%+ attendance rate
- Load time: <2s (Vercel + Supabase)
- Zero downtime (SLA 99.9%)

---

**Last updated:** 2026-10-11  
**Version:** 1.0.0 (Phase 1 MVP)  
**Status:** 🟢 LIVE

---

> Made with ❤️ by USRC Team — *Ruang berkarya yang nggak biasa.*
