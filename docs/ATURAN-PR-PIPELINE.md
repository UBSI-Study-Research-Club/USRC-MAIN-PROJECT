# Aturan Pipeline PR & Urutan Pengerjaan USRC Web (`ATURAN-PR-PIPELINE.md`)

> **Wajib dibaca oleh seluruh anggota USRC (Chello, Raken, Iwan, Riski, Yoga) serta AI Agent / Hermes yang mendampingi.**  
> Dokumen ini mengatur tata cara pengiriman Pull Request (PR) agar tidak terjadi konflik kode, tumpang tindih, atau kesalahan urutan integrasi.

---

## 1. Prinsip Utama: Modular & Bertahap
Dilarang menggabungkan seluruh fitur dalam satu PR raksasa (*monolith PR*). Setiap fitur harus dikerjakan di branch terpisah dan di-PR secara bertahap sesuai urutan ketergantungan sistem.

---

## 2. Urutan Wajib Pengiriman PR (Pipeline)

### Tahap 1: Fondasi Aset Pixel (`feature/pixel-assets`)
- **Fokus**: Selesaikannya pembuatan layer SVG pixel (Chello, Raken, Iwan, Riski, Yoga).
- **Aturan**: PR aset pixel **harus di-merge terlebih dahulu** sebelum fitur yang memanggil avatar pixel (seperti profil dan dashboard feed) di-merge.

### Tahap 2: Modul Core & Backend/Database Helpers
- **Fokus**: Helper Supabase, penyesuaian tipe data, atau utilitas dasar yang dibutuhkan modul admin dan dashboard.

### Tahap 3: Halaman Frontend & Fitur Turunan (Dapat Dikerjakan Paralel)
Setelah Tahap 1 beres, modul berikut dapat dikerjakan secara paralel di branch masing-masing:
1. **Raken**: Branch fitur `/absen` (Sesi Aktif & Riwayat) & Navbar Landing.
2. **Chello**: Branch Etalase Karya & Form Profil.
3. **Riski**: Branch Panel Admin & Pendataan Aktivitas Anggota.
4. **Iwan & Yoga**: Branch Dashboard Anggota (IG Feed & Pixel Story Chat Box).

---

## 3. Protokol & Aturan Wajib
1. **Wajib Cek PR Aktif**: Sebelum membuat PR atau mulai coding, setiap anggota (atau AI agent pendamping) **wajib mengecek daftar PR yang sedang aktif** di repo GitHub (`gh pr list` atau tab PR GitHub) untuk melihat apa yang sedang dikerjakan anggota lain.
2. **Wajib Bertanya / Konfirmasi**: Jika ada PR dari anggota lain yang belum di-merge dan berkaitan dengan kode yang akan kamu edit, **wajib bertanya dan berkoordinasi di grup MainProject** sebelum mengirim PR baru.
3. **Build Lokal Wajib Hijau**: Setiap PR wajib lulus `npm run build` tanpa error sebelum dilaporkan ke Raken untuk diaudit.
4. **Dilarang Merge Mandiri**: Semua PR memerlukan audit dari Raken/Noelle dan izin eksplisit sebelum di-merge.
