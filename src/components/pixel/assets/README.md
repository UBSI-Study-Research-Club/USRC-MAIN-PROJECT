# Pixel SVG Assets — Layer 1: Body & Skin

## Struktur File

**Layer 1 Variants** (Chello):
- `layer-1-body-light.svg` — Skin terang #F4C8A0
- `layer-1-body-medium.svg` — Skin sawo matang #D4A574
- `layer-1-body-dark.svg` — Skin gelap #8B5A2B

## Spesifikasi Grid

- **ViewBox**: `0 0 24 24` (semua layer konsisten)
- **Unit**: Grid pixel 1x1 = `<rect width="1" height="1">` (untuk presisi) atau `width="4" height="4"` (untuk 6x6 blocks lebih mudah dilihat)
- **Koordinat**: Origin (0,0) top-left

## Anatomu Badan (Referensi)

```
Head:      x=8  y=4   w=8 h=8
Neck:      x=10 y=12  w=4 h=2
Body:      x=8  y=14  w=8 h=6
L-Arm:     x=4  y=14  w=4 h=6
R-Arm:     x=16 y=14  w=4 h=6
L-Leg:     x=8  y=20  w=3 h=4
R-Leg:     x=13 y=20  w=3 h=4
```

## Instruksi Untuk Layer 2-5

Setiap layer **harus**:
1. Menggunakan **SAMA viewBox** `0 0 24 24`
2. Render pada koordinat yang **tidak bertabrakan** dengan layer sebelumnya (atau overlap deliberate untuk detail)
3. Punya `<g id="layer-X">` wrapper
4. Memakai class CSS untuk warna agar mudah dikustomisasi via kode

**Contoh layer 2 (Rambut Raken):**
```xml
<svg viewBox="0 0 24 24">
  <defs>
    <style>
      .px-hair-black { fill: #1A1A1A; }
    </style>
  </defs>
  <g id="layer-hair">
    <!-- Rambut short: 6x5 block di atas head, dst -->
    <rect class="px-hair-black" x="7" y="2" width="10" height="5" />
  </g>
</svg>
```

## Assembly di React

Nanti kita bikin component `PixelCharacter.tsx` yang stack layer-layer ini:
```tsx
<g id="body">{/* layer 1 */}</g>
<g id="hair">{/* layer 2 */}</g>
<g id="face">{/* layer 3 */}</g>
<g id="clothes">{/* layer 4 */}</g>
<g id="accessories">{/* layer 5 */}</g>
```

## Style Convention

- **Fill colors**: masing-masing layer punya `.px-{type}-{variant}` class
- **No strokes**: murni fill-based untuk pixel art clarity
- **Nested groups**: tiap layer bisa punya sub-groups (misal layer 2 punya `.px-hair-short`, `.px-hair-long`, dst)

---

**Next**: Raken layer 2 (hair), Iwan layer 3 (face), Riski layer 4 (clothes), Yoga layer 5 (accessories).
