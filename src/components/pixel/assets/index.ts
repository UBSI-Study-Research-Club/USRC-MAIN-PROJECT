// Layer 2: Rambut & Pewarnaan — Pixel Hair Components
// Gaya: short, long, bangs, curly, bald
// Warna via CSS custom property --hair-color

export const HAIR_STYLES = ["short", "long", "bangs", "curly", "bald"] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const HAIR_COLORS: Record<string, string> = {
  hitam: "#2C1B0E",
  "coklat-tua": "#5C3A1E",
  "coklat-muda": "#8B6333",
  pirang: "#D4A843",
  merah: "#8B2500",
  abu: "#6B6B6B",
};

export type HairColor = keyof typeof HAIR_COLORS;

// Layer 3: Wajah, Mata & Ekspresi — by Iwan
export { FACE_STYLES, EYE_COLORS } from "../PixelFace";
export type { FaceStyle, EyeColor } from "../PixelFace";
