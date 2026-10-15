<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:7A1B2E,50:A62639,100:E38595&height=220&section=header&text=USRC&fontSize=85&fontColor=F5F3EF&fontAlignY=32&desc=UBSI%20STUDY%20%26%20RESEARCH%20CLUB%20·%20PONTIANAK&descAlignY=55&descSize=18&animation=fadeIn" width="100%" />

[![Website](https://img.shields.io/badge/🌐_usrc.my.id-7A1B2E?style=for-the-badge&labelColor=1A1A1A)](https://usrc.my.id)
[![Next.js](https://img.shields.io/badge/Next.js_16-1A1A1A?style=for-the-badge&logo=next.js&logoColor=E38595)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=1A1A1A)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Vercel-1A1A1A?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

<a href="https://usrc.my.id">
  <img src="https://readme-typing-svg.herokuapp.com?font=IBM+Plex+Mono&weight=700&size=22&duration=2800&pause=900&color=7A1B2E&center=true&vCenter=true&width=620&lines=STUDY+%2F%2F+RESEARCH+%2F%2F+BUILD+PROJECT;BUKAN+SEKADAR+KOMUNITAS+%E2%80%94+ETALASE+KARYA;DIBANGUN+OLEH+MAHASISWA+UBSI+PONTIANAK" alt="Typing SVG" />
</a>

</div>

---

## ✦ Tentang

**USRC Web** adalah rumah digital resmi **UBSI Study & Research Club** — komunitas lintas prodi (Informatika, Sistem Informasi, SI Akuntansi) di Universitas Bina Sarana Informatika Pontianak.

Satu kalimat: **tempat anggota absen & kelola kegiatan, sekaligus etalase karya nyata untuk publik.**

> Prinsip produk: serba interaktif. Kalau bisa dihitung dari database, jangan diketik manual. Stat landing, feed kegiatan, galeri karya — semuanya hidup dari Supabase.

---

## ⚡ Fitur

| | Fitur | Detail |
|---|---|---|
| 🏛 | **Landing Publik** | Hero, statistik live dari DB, feed kegiatan terakhir, etalase karya |
| 📝 | **Pendaftaran Online** | Form calon anggota → antrian approve sekre → magic link otomatis |
| 🔑 | **Login Tanpa Password** | Email OTP 6 digit via Supabase Auth — aman & anti-lupa-sandi |
| 🎫 | **Absen Realtime** | Window absen server-side, tiket digital dengan stamp HADIR/PENDING |
| 🗂 | **Dashboard Sekre** | Approve absen & pendaftar realtime (Supabase Realtime), daftar anggota |
| 🛡 | **Panel Admin** | Kelola role anggota, approve/reject karya, aktivitas admin tercatat |
| 🖼 | **Etalase Karya** | Showcase project anggota + sistem bintang ⭐, filter kategori |
| 🐾 | **Pixel Story** | Avatar hewan pixel custom + kartu status & catatan antar anggota |
| 👤 | **Profil Anggota** | Bio, sosmed, link fleksibel, avatar pixel personal |
| 🔗 | **Rich Link Preview** | Open Graph metadata — share `usrc.my.id` muncul kartu cantik |

---

## 🛠 Tech Stack

```txt
// FRONTEND
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion

// BACKEND
Supabase — PostgreSQL · Row Level Security · Realtime · Email OTP

// INFRA
Vercel (auto-deploy dari main) · Domain usrc.my.id
```

**Gaya visual:** Editorial Neobrutalist — kertas hangat, border tegas, hard shadow maroon, font display uppercase + IBM Plex Mono untuk komentar `// zine`.

---

## 🗺 Peta Halaman

| Route | Akses | Isi |
|---|---|---|
| `/` | Publik | Landing, statistik, kegiatan, karya |
| `/daftar` | Publik | Form pendaftaran anggota |
| `/login` | Publik | Login email OTP |
| `/karya` | Publik | Etalase karya + pixel story |
| `/dashboard` | Anggota | Feed kegiatan & karya |
| `/dashboard/absen` | Anggota | Absen sesi aktif + riwayat |
| `/profil` | Anggota | Edit profil, avatar pixel, sosmed |
| `/dashboard/sekre` | Sekre | Approve absen, pendaftar, anggota |
| `/dashboard/admin` | Admin | Role management, approve karya |

---

## ⚔️ Kontributor

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=soft&color=0:7A1B2E,100:E38595&height=90&section=header&text=%E2%9A%94%20LIMA%20ORANG%20INI%20YANG%20MEMBANGUN&fontSize=24&fontColor=F5F3EF&animation=twinkling" width="70%" />

<table>
  <tr>
    <td align="center" width="20%">
      <a href="https://github.com/kabayy-sys">
        <img src="assets/readme/kabayy-sys.gif" width="110" alt="Raken"/><br />
        <sub><b>RAKEN</b></sub>
      </a><br />
      <sub><b>Backend Lead</b><br />Database · RLS · Auth<br />Audit PR · DevOps · 190+ commits</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/Greeezzz">
        <img src="assets/readme/Greeezzz.gif" width="110" alt="Chello"/><br />
        <sub><b>CHELLO</b></sub>
      </a><br />
      <sub><b>Frontend Publik</b><br />Landing · Etalase Karya<br />Pixel Story UI · 30 commits</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/Im-Wann">
        <img src="assets/readme/Im-Wann.gif" width="110" alt="Iwan"/><br />
        <sub><b>IWAN</b></sub>
      </a><br />
      <sub><b>Frontend Dashboard</b><br />Absen Realtime · Panel Sekre<br />Panel Admin · Navbar · 12 commits</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/riskiriski-eng">
        <img src="assets/readme/riskiriski-eng.gif" width="110" alt="Riski"/><br />
        <sub><b>RISKI</b></sub>
      </a><br />
      <sub><b>Auth & Admin</b><br />Halaman Login OTP<br />Panel Admin · Pixel Clothing</sub>
    </td>
    <td align="center" width="20%">
      <a href="https://github.com/Adityaprayoga15">
        <img src="assets/readme/Adityaprayoga15.gif" width="110" alt="Adit"/><br />
        <sub><b>ADIT</b></sub>
      </a><br />
      <sub><b>Pixel Artist</b><br />6 Aset Avatar Hewan<br />Layer Aksesori · SVG</sub>
    </td>
  </tr>
</table>

</div>

---

## 📈 Aktivitas Pengembangan

<img src="https://github-readme-activity-graph.vercel.app/graph?username=kabayy-sys&repo=USRC-MAIN-PROJECT&bg_color=F5F3EF&color=1A1A1A&line=7A1B2E&point=A62639&area=true&area_color=E38595&hide_border=true&custom_title=Riwayat%20Commit%20Pengembangan" width="100%" />

---

## 🚀 Jalankan Lokal

```bash
# clone
git clone https://github.com/UBSI-Study-Research-Club/USRC-MAIN-PROJECT.git
cd USRC-MAIN-PROJECT

# install
npm install

# siapkan .env.local
NEXT_PUBLIC_SUPABASE_URL=<url-project-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# jalan
npm run dev
```

---

<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=IBM+Plex+Mono&weight=700&size=16&duration=3000&pause=1000&color=1A1A1A&center=true&vCenter=true&width=560&lines=%2F%2F+DIBANGUN+DENGAN+KOPI%2C+DEADLINE%2C+DAN+RASA+POSA%3B%2F%2F+EST.+2026+%C2%B7+UBSI+PONTIANAK" alt="Typing SVG" />

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:E38595,50:A62639,100:7A1B2E&height=120&section=footer&animation=fadeIn" width="100%" />

</div>
