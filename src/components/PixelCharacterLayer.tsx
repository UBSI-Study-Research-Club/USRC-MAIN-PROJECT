// PixelCharacterLayer.tsx
// Modular pixel character layer component for USRC
// Supports stacking multiple SVG layers: body, hair, face, clothes, accessories

import { ReactNode } from 'react';

export interface PixelCharacterConfig {
  bodyColor: string; // Layer 1: body skin color
  hairStyle: string; // Layer 2: hair file name (e.g., 'hair-short')
  hairColor: string;
  faceExpression: string; // Layer 3: face/expression file (e.g., 'face-smile')
  clothingType: string; // Layer 4: clothing file (e.g., 'clothing-hoodie-usrc')
  accessoryHead?: string; // Layer 5: head accessory
  accessoryBody?: string; // Layer 5: body accessory
  size?: number; // Display size in pixels (default 96)
}

interface PixelLayerProps extends Partial<PixelCharacterConfig> {
  animated?: boolean;
  className?: string;
  bodyColor?: string;
  hairStyle?: string;
  hairColor?: string;
  faceExpression?: string;
  clothingType?: string;
  size?: number;
}

/**
 * PixelCharacterLayer
 * 
 * Renders a modular pixel character by stacking SVG layers.
 * Each layer is independently customizable and can be mixed/matched.
 * 
 * Layer Structure (bottom to top):
 * 1. Body & Skin Color (base)
 * 2. Hair & Style
 * 3. Face, Mata & Alis (expressions)
 * 4. Clothing (pakaian)
 * 5. Accessories (kepala + badan)
 * 
 * Usage:
 * <PixelCharacterLayer
 *   bodyColor="medium"
 *   hairStyle="hair-short"
 *   hairColor="black"
 *   faceExpression="face-smile"
 *   clothingType="clothing-hoodie-usrc"
 *   size={96}
 * />
 */
export function PixelCharacterLayer({
  bodyColor,
  hairStyle,
  hairColor,
  faceExpression,
  clothingType,
  accessoryHead,
  accessoryBody,
  size = 96,
  animated = false,
  className = '',
}: PixelLayerProps) {
  const svgPath = `/pixel/assets`;

  // Normalisasi nama file: terima 'short' maupun 'hair-short'
  const asset = (prefix: string, value?: string, fallback = "") => {
    if (!value || value === "none") return fallback ? `${svgPath}/${fallback}.svg` : "";
    return `${svgPath}/${value.includes(prefix) ? value : `${prefix}-${value}`}.svg`;
  };

  // Stacked <img> — SVG transparan, aman ditumpuk, tidak tergantung fragment <use>
  const layerFiles = [
    asset("body", bodyColor, "body-medium"),
    asset("hair", hairStyle, "hair-short"),
    asset("face", faceExpression, "face-normal"),
    asset("clothing", clothingType, "clothing-hoodie-usrc"),
    ...(accessoryHead ? [asset("aksesori", accessoryHead)] : []),
    ...(accessoryBody ? [asset("aksesori", accessoryBody)] : []),
  ].filter(Boolean);

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {layerFiles.map((file, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={file}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      ))}
    </div>
  );
}

/**
 * PixelCharacterPreset
 * 
 * Quick presets for common character combinations.
 */
export const characterPresets = {
  default: {
    bodyColor: 'medium',
    hairStyle: 'hair-short',
    hairColor: 'black',
    faceExpression: 'face-neutral',
    clothingType: 'clothing-hoodie-usrc',
  } as PixelCharacterConfig,
  casual: {
    bodyColor: 'light',
    hairStyle: 'hair-medium',
    hairColor: 'brown',
    faceExpression: 'face-smile',
    clothingType: 'clothing-tshirt-plain',
  } as PixelCharacterConfig,
  formal: {
    bodyColor: 'dark',
    hairStyle: 'hair-neat',
    hairColor: 'black',
    faceExpression: 'face-focus',
    clothingType: 'clothing-shirt-casual',
  } as PixelCharacterConfig,
  active: {
    bodyColor: 'medium',
    hairStyle: 'hair-short',
    hairColor: 'black',
    faceExpression: 'face-energetic',
    clothingType: 'clothing-jacket-bomber',
  } as PixelCharacterConfig,
};

/**
 * PixelCharacterPreview
 * 
 * Preview component showing all available presets.
 */
export function PixelCharacterPreview() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4">
      {Object.entries(characterPresets).map(([name, config]) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <PixelCharacterLayer {...config} size={96} />
          <span className="text-xs font-mono uppercase font-bold text-gray-700">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
