"use client";

// Layer 3: Wajah, Mata & Ekspresi — by Iwan
// Grid 24x24, konsisten dengan layer-hair dan layer-body

export const FACE_STYLES = ["normal", "smile", "focus", "glasses"] as const;
export type FaceStyle = (typeof FACE_STYLES)[number];

export const EYE_COLORS: Record<string, string> = {
  hitam: "#1A1A2E",
  coklat: "#5C3A1E",
  abu: "#6B6B6B",
  biru: "#1E4080",
};
export type EyeColor = keyof typeof EYE_COLORS;

// [x, y] pixel coords per style
// eyebrow-left, eyebrow-right, eye-left, eye-right
// highlight: mata normal & kacamata dapat highlight putih (ditangani di render)
const FACE_DATA: Record<
  FaceStyle,
  {
    eyebrows: [number, number][];
    eyes: [number, number][];
    highlights?: [number, number][];
    glassesFrame?: [number, number][];
    glassesBridge?: [number, number][];
  }
> = {
  normal: {
    eyebrows: [
      [8, 6], [9, 6], [10, 6],     // alis kiri
      [13, 6], [14, 6], [15, 6],   // alis kanan
    ],
    eyes: [
      [8, 8], [9, 8], [8, 9], [9, 9],      // mata kiri 2x2
      [14, 8], [15, 8], [14, 9], [15, 9],  // mata kanan 2x2
    ],
    highlights: [[9, 8], [15, 8]],
  },
  smile: {
    eyebrows: [
      [8, 6], [9, 6], [10, 5],   // alis kiri (luar naik)
      [13, 5], [14, 6], [15, 6], // alis kanan (luar naik)
    ],
    eyes: [
      // bulan sabit — 1 baris saja
      [8, 8], [9, 8], [10, 8],   // mata kiri
      [13, 8], [14, 8], [15, 8], // mata kanan
    ],
  },
  focus: {
    eyebrows: [
      [8, 7], [9, 6], [10, 6],   // alis kiri (miring, kerutan)
      [13, 6], [14, 6], [15, 7], // alis kanan (miring)
    ],
    eyes: [
      // menyipit — 1 baris
      [8, 8], [9, 8], [10, 8],
      [13, 8], [14, 8], [15, 8],
    ],
  },
  glasses: {
    eyebrows: [
      [8, 5], [9, 5], [10, 5],
      [13, 5], [14, 5], [15, 5],
    ],
    eyes: [
      [8, 8], [9, 8], [8, 9], [9, 9],
      [14, 8], [15, 8], [14, 9], [15, 9],
    ],
    highlights: [[9, 8], [15, 8]],
    glassesFrame: [
      // frame kiri
      [7, 7], [8, 7], [9, 7], [10, 7],
      [7, 8], [10, 8],
      [7, 9], [10, 9],
      [7, 10], [8, 10], [9, 10], [10, 10],
      // frame kanan
      [13, 7], [14, 7], [15, 7], [16, 7],
      [13, 8], [16, 8],
      [13, 9], [16, 9],
      [13, 10], [14, 10], [15, 10], [16, 10],
    ],
    glassesBridge: [[11, 8], [12, 8]],
  },
};

interface PixelFaceProps {
  style?: FaceStyle;
  eyeColor?: EyeColor;
  eyebrowColor?: string;
  glassesColor?: string;
  size?: number;
  className?: string;
}

/**
 * Inline SVG pixel face layer (Layer 3).
 * Stack di atas layer-body dan layer-hair dengan absolute positioning.
 * Warna dinamis via props.
 */
export function PixelFace({
  style = "normal",
  eyeColor = "hitam",
  eyebrowColor = "#2C1B0E",
  glassesColor = "#374151",
  size = 96,
  className = "",
}: PixelFaceProps) {
  const data = FACE_DATA[style];
  const eyeHex = EYE_COLORS[eyeColor] || EYE_COLORS.hitam;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      <g id="layer-face" data-style={style}>
        {/* Alis */}
        {data.eyebrows.map(([x, y], i) => (
          <rect key={`eb-${i}`} x={x} y={y} width={1} height={1} fill={eyebrowColor} />
        ))}
        {/* Mata */}
        {data.eyes.map(([x, y], i) => (
          <rect key={`e-${i}`} x={x} y={y} width={1} height={1} fill={eyeHex} />
        ))}
        {/* Highlight mata */}
        {data.highlights?.map(([x, y], i) => (
          <rect key={`hl-${i}`} x={x} y={y} width={1} height={1} fill="#FFFFFF" opacity={0.6} />
        ))}
        {/* Frame kacamata */}
        {data.glassesFrame?.map(([x, y], i) => (
          <rect key={`gf-${i}`} x={x} y={y} width={1} height={1} fill={glassesColor} />
        ))}
        {/* Jembatan kacamata */}
        {data.glassesBridge?.map(([x, y], i) => (
          <rect key={`gb-${i}`} x={x} y={y} width={1} height={1} fill={glassesColor} />
        ))}
      </g>
    </svg>
  );
}
