# PRD & Implementation Plan: Menuju Phase 3 & Update Besar-Besaran USRC Web

> Status: Draft Final (Disetujui Raken)  
> Target: Seluruh Anggota USRC (Chello, Raken, Iwan, Riski, Yoga & Member)  
> Fokus: Perombakan Landing Page, Dashboard Anggota ala Instagram Feed, Sistem Karakter Pixel SVG, dan Peningkatan Panel Admin.

---

## 1. Latar Belakang & Tujuan
Sebelum masuk ke eksekusi penuh **Phase 3**, USRC Web memerlukan pembaruan arsitektur dan UI/UX yang signifikan untuk memisahkan ruang publik (pengunjung/guest) dengan ruang interaktif internal anggota (dashboard sosial & manajemen karya). 

Tujuan utama update ini:
1. Menjadikan landing page sebagai etalase publik yang bersih dan langsung menonjolkan karya terbaik anggota.
2. Mengubah alur setelah login agar anggota langsung masuk ke **Dashboard Anggota** dengan format *social feed* (ala Instagram) untuk upload karya, interaksi, dan absen.
3. Memperkaya profil anggota dengan **Karakter Pixel SVG interaktif** dan sistem hobi/minat.

---

## 2. Rincian Perubahan Utama

### 2.1. Pembaruan Landing Page (`/`)
- **Navbar Atas**: Tombol "Project" / karya di navbar diarahkan otomatis *smooth scroll* langsung ke section **6 Top Karya USRC** (bukan ke 4 pilar).
- **Navbar Kanan (Kotak Merah / Tombol Aksi)**:
  - *Belum Login*: Tombol berubah menjadi **Login** (membuka modal/halaman login).
  - *Di Dalam Landing Page*: Ditambahkan tombol aksi utama: **Daftar Sekarang**, **Lihat Top Karya**, dan tautan halaman **Karya** publik.
- **Pembersihan Navigasi**: Tombol halaman karya di bagian paling bawah landing page dihapus (karena sudah terpusat di navbar atas/tengah).
- **Fitur Back to Top**: Tombol mengambang (*floating button*) di pojok kanan bawah yang muncul saat pengguna scroll ke bawah untuk kembali ke atas dengan mulus.
- **Interaksi Kartu Top Karya**: 6 kartu top karya di landing page dapat diklik untuk membuka modal/halaman detail karya.

### 2.2. Overhaul Dashboard Anggota (`/dashboard`)
- **Direct Login Landing**: Setelah login sukses, anggota **tidak lagi masuk ke landing page**, melainkan langsung mendarat di `/dashboard`.
- **Struktur Dashboard (Format Instagram Feed)**:
  - **Bagian Atas**: Modul Absen Anggota (sesi aktif yang sedang buka, tombol absen cepat).
  - **Bagian Tengah/Feed**: *Home scroll media* (timeline karya anggota lain, komentar, like, dan status).
  - **Tempat Upload Karya**: Pembuatan dan upload project anggota dipindah sepenuhnya ke dashboard pribadi ini (halaman `/karya` publik murni untuk apresiasi pengunjung luar).
- **Navbar Dashboard & Switcher**:
  - Menu Profil (dengan pengaturan kustomisasi profil & hobi).
  - **Sekre Switcher**: Tombol pindah ke `/dashboard/sekre` (khusus sekretaris).
  - **Admin Switcher**: Tombol pindah ke `/dashboard/admin` (khusus admin).
  - **Tombol Kembali ke Landing**: Akses mudah kembali ke halaman publik.
- **Struktur Path**:
  - `/dashboard` → Home Feed & Absen Anggota.
  - `/dashboard/sekre` → Manajemen Sesi & Absen.
  - `/dashboard/admin` → Panel Admin (Role Management, Approve Karya, **Pendataan Aktivitas Anggota**).

### 2.3. Persiapan Kerangka & Fitur Phase 3
- **Pendataan Minat/Hobi**: Anggota wajib memilih hobi/minat (bisa lebih dari satu). Disediakan form pendataan di admin/profil.
- **Karakter Pixel SVG Profil**:
  - Setiap profil memiliki avatar karakter pixel buatan tim USRC.
  - Fitur kustomisasi karakter di profil (hanya bisa diganti **1 minggu sekali**).
- **Pixel Story & Chat Box**:
  - Di bagian atas feed dashboard, terdapat fitur ala *Story* Instagram berupa visual karakter pixel masing-masing anggota yang dilengkapi *chat box* (pesan status/ekspresi yang sedang dirasakan).
  - Karakter pixel dibuat modular, interaktif, dan fleksibel untuk berbagai widget.

---

## 3. Pembagian Struktur Path
- `/` → Landing Page Publik (Etalase & Top Karya)
- `/karya` → Halaman Eksplorasi Karya Publik
- `/dashboard` → Dashboard Utama Anggota (Feed & Absen)
- `/dashboard/sekre` → Panel Sekretaris
- `/dashboard/admin` → Panel Admin & Pendataan Aktif Anggota
- `/profil` → Pengaturan Profil & Kustomisasi Pixel Character
