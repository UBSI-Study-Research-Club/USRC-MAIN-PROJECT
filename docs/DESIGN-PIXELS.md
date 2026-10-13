# Spesifikasi Desain: Karakter Pixel SVG USRC (`DESIGN-PIXELS.md`)

> Status: Final Specification  
> Fokus: Standar teknis pembuatan, struktur layer, kustomisasi, dan integrasi Karakter Pixel SVG di USRC Web.

---

## 1. Konsep Dasar
Karakter Pixel SVG USRC adalah avatar unik bergaya retro-pixel (16x16 atau 24x24 grid SVG) yang merepresentasikan setiap anggota di dalam ekosistem USRC. Karakter ini tampil di profil, *feed* dashboard, dan fitur *Pixel Story* dengan balon obrolan (*chat box*).

---

## 2. Struktur Layer & Modularitas SVG
Agar karakter dapat dikustomisasi secara dinamis melalui kode, file SVG harus dipecah menjadi beberapa layer terpisah dalam satu grup (`<g>`):

1. **Layer 1: Badan & Kulit (`#layer-body`)**
   - Mencakup bentuk dasar tubuh, proporsi, gender/gaya, dan warna kulit.
2. **Layer 2: Rambut & Warna (`#layer-hair`)**
   - Gaya rambut dan palet warnanya.
3. **Layer 3: Wajah, Mata & Alis (`#layer-face`)**
   - Bentuk mata, ekspresi, dan alis.
4. **Layer 4: Set Baju (`#layer-clothes`)**
   - Pakaian utama (kaos, hoodie, jaket, kemeja khas USRC).
5. **Layer 5: Aksesoris (`#layer-accessories`)**
   - **Kepala**: Topi, kacamata, headband, dll.
   - **Badan/Luar**: Tas, jubah, atribut tambahan.

---

## 3. Aturan Teknis & Kustomisasi
- **Format**: Murni SVG berbasis koordinat grid pixel (`<rect>` dengan ukuran seragam, misal `width="4" height="4"` atau vector path kotak).
- **Skalabilitas**: `viewBox="0 0 24 24"` agar responsif di berbagai ukuran perangkat (`next/image` atau inline SVG).
- **Batasan Kustomisasi**:
  - Anggota dapat mengubah kombinasi layer (rambut, baju, aksesoris) melalui halaman `/profil`.
  - **Cooldown**: Pergantian kustomisasi karakter dibatasi **1 minggu sekali** untuk menjaga konsistensi identitas anggota.

---

## 4. Fitur Pixel Story & Chat Box
- Di bagian atas `/dashboard`, karakter pixel anggota dirender dalam lingkaran bergaya *Story* Instagram.
- Mengklik atau melihat story menampilkan **Chat Box** di atas kepala karakter, berisi status harian atau pesan singkat yang ditulis oleh anggota bersangkutan (misal: *"Lagi pusing debugging Next.js 15 💀"*).
