# Pembagian Tugas Pembuatan Karakter Pixel SVG & Modul USRC

> Status: Aktif / Siap Eksekusi  
> Tim: Chello, Raken, Iwan, Riski, Yoga  
> Tujuan: Desain modular Karakter Pixel SVG untuk 5 peserta inti dan pengembangan modul Phase 3.

---

## 1. Distribusi Tugas Pembuatan Karakter Pixel (SVG Layers)
Setiap anggota bertanggung jawab merancang dan membuat bagian spesifik dari aset SVG pixel modular agar bisa digabungkan secara dinamis:

| Nama Anggota | Tanggung Jawab Komponen Pixel | Detail Output |
| :--- | :--- | :--- |
| **Chello** | **Layer 1: Badan & Warna Kulit** | Variasi dasar tubuh, proporsi, dan palet warna kulit (terang, sawo matang, gelap). |
| **Raken** | **Layer 2: Rambut & Pewarnaan** | Berbagai gaya rambut (pendek, panjang, berponi, curly, botak) beserta variasi warnanya. |
| **Iwan** | **Layer 3: Wajah (Mata, Alis & Ekspresi)** | Bentuk mata (normal, senyum, kacamata, fokus) dan ekspresi alis. |
| **Riski** | **Layer 4: Set Baju (Pakaian)** | Variasi pakaian (Hoodie USRC, kemeja kasual, kaos polos, jaket bomber). |
| **Yoga** | **Layer 5: Aksesoris (Kepala & Badan)** | Atribut tambahan: topi, kacamata hitam, headband, headset, dan aksesoris badan. |

---

## 2. Pembagian Tugas Pengembangan Web (Pre-Phase 3 Update)
- **Raken**: Halaman Absen (Split 2 halaman: Sesi Aktif & Riwayat) + Integrasi Realtime Meeting + Landing Page Navbar & Back-to-Top.
- **Chello**: Etalase Karya di Landing Page (6 Top Karya interaktif) + Form Karya di Profil.
- **Riski**: Panel Admin (`/dashboard/admin`) + Fitur Pendataan Aktif Anggota & Role Management.
- **Iwan & Yoga**: Integrasi Dashboard Anggota ala Instagram Feed (Home scroll media, upload project, & Pixel Story Chat Box).

---

## 3. Ketentuan Pengumpulan & Integrasi
1. Aset SVG pixel disimpan dalam format kode modular atau file `.svg` terpisah di folder `src/components/pixel/assets/`.
2. Pastikan ukuran koordinat konsisten (Grid 24x24) agar layer dapat ditumpuk (*stacked*) tanpa pergeseran posisi.
3. Commit dan PR dilakukan sesuai ritual standar repo USRC.
