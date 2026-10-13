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

interface PixelLayerProps extends PixelCharacterConfig {
  animated?: boolean;
  className?: string;
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

  // Construct file paths for each layer
  const layers = [
    { id: 'body', file: `${svgPath}/body-${bodyColor}.svg`, order: 1 },
    { id: 'hair', file: `${svgPath}/${hairStyle}.svg`, order: 2 },
    { id: 'face', file: `${svgPath}/${faceExpression}.svg`, order: 3 },
    { id: 'clothes', file: `${svgPath}/${clothingType}.svg`, order: 4 },
    ...(accessoryHead ? [{ id: 'accessory-head', file: `${svgPath}/${accessoryHead}.svg`, order: 5 }] : []),
    ...(accessoryBody ? [{ id: 'accessory-body', file: `${svgPath}/${accessoryBody}.svg`, order: 5 }] : []),
  ];

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={`drop-shadow-sm ${animated ? 'animate-pulse' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Layer 1: Body Base */}
        <g id="layer-body">
          <use href={`${layers[0].file}#layer-body`} />
        </g>

        {/* Layer 2: Hair */}
        <g id="layer-hair">
          <use href={`${layers[1].file}#layer-hair`} />
        </g>

        {/* Layer 3: Face */}
        <g id="layer-face">
          <use href={`${layers[2].file}#layer-face`} />
        </g>

        {/* Layer 4: Clothing */}
        <g id="layer-clothes">
          <use href={`${layers[3].file}#layer-clothes`} />
        </g>

        {/* Layer 5: Accessories */}
        {accessoryHead && (
          <g id="layer-accessories-head">
            <use href={accessoryHead} />
          </g>
        )}
        {accessoryBody && (
          <g id="layer-accessories-body">
            <use href={accessoryBody} />
          </g>
        )}
      </svg>
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
