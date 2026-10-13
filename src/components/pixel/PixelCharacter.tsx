'use client'

import { useMemo } from 'react'

type SkinTone = 'light' | 'medium' | 'dark'
type HairStyle = 'short' | 'long' | 'curly' | 'bob'
type HairColor = 'black' | 'brown' | 'blonde' | 'red'
type FaceExpression = 'neutral' | 'smile' | 'wink' | 'focus'
type ClothingType = 'hoodie' | 'casual' | 'tshirt' | 'jacket'
type AccessoryType = 'none' | 'cap' | 'glasses' | 'headset' | 'headband'

export interface PixelCharacterConfig {
  skin?: SkinTone
  hair?: { style: HairStyle; color: HairColor }
  face?: FaceExpression
  clothing?: ClothingType
  accessory?: AccessoryType
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const DEFAULT_CONFIG: PixelCharacterConfig = {
  skin: 'medium',
  hair: { style: 'short', color: 'black' },
  face: 'neutral',
  clothing: 'hoodie',
  accessory: 'none',
  size: 'md',
}

const sizeMap = {
  sm: 64,
  md: 96,
  lg: 128,
  xl: 160,
}

export function PixelCharacter({ config = DEFAULT_CONFIG }: { config?: PixelCharacterConfig }) {
  const merged = { ...DEFAULT_CONFIG, ...config }
  const pixelSize = sizeMap[merged.size || 'md']

  // Layer 1: Body (skin tone)
  const skinMap = {
    light: '#F4C8A0',
    medium: '#D4A574',
    dark: '#8B5A2B',
  }

  // Layer 2: Hair (simplified — tu Raken bikin SVG)
  const hairColorMap = {
    black: '#1A1A1A',
    brown: '#5C4033',
    blonde: '#FFD700',
    red: '#C41E3A',
  }

  // Layer 3: Face (simplified — tu Iwan bikin)
  const faceMap = {
    neutral: 'M 10 8 L 14 8',
    smile: 'M 10 9 Q 12 10 14 9',
    wink: 'M 10 8 L 11 8 M 13 8 L 14 8',
    focus: 'M 10 8.5 L 14 8.5',
  }

  // Layer 4: Clothing (simplified — tu Riski bikin)
  const clothingMap = {
    hoodie: '#2E5090',
    casual: '#4A90E2',
    tshirt: '#FF6B6B',
    jacket: '#34495E',
  }

  // Layer 5: Accessory (simplified — tu Yoga bikin)
  const accessoryMap = {
    none: null,
    cap: '#FFD700',
    glasses: '#000',
    headset: '#696969',
    headband: '#FF1493',
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={pixelSize}
      height={pixelSize}
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated' }}
    >
      <defs>
        <style>{`
          .px-body { fill: ${skinMap[merged.skin || 'medium']}; }
          .px-hair { fill: ${hairColorMap[merged.hair?.color || 'black']}; }
          .px-clothing { fill: ${clothingMap[merged.clothing || 'hoodie']}; }
          .px-accessory { fill: ${accessoryMap[merged.accessory || 'none'] || 'none'}; }
          .px-border { fill: #1A1A1A; }
        `}</style>
      </defs>

      {/* Layer 1: Body */}
      <g id="layer-body">
        <rect className="px-body" x="8" y="4" width="8" height="8" />
        <rect className="px-body" x="10" y="12" width="4" height="2" />
        <rect className="px-body" x="8" y="14" width="8" height="6" />
        <rect className="px-body" x="4" y="14" width="4" height="6" />
        <rect className="px-body" x="16" y="14" width="4" height="6" />
        <rect className="px-body" x="8" y="20" width="3" height="4" />
        <rect className="px-body" x="13" y="20" width="3" height="4" />
      </g>

      {/* Layer 2: Hair */}
      <g id="layer-hair">
        {merged.hair?.style === 'short' && (
          <>
            <rect className="px-hair" x="7" y="2" width="10" height="3" />
            <rect className="px-hair" x="6" y="3" width="2" height="2" />
            <rect className="px-hair" x="16" y="3" width="2" height="2" />
          </>
        )}
        {merged.hair?.style === 'long' && (
          <>
            <rect className="px-hair" x="7" y="1" width="10" height="4" />
            <rect className="px-hair" x="5" y="5" width="3" height="3" />
            <rect className="px-hair" x="16" y="5" width="3" height="3" />
          </>
        )}
        {merged.hair?.style === 'curly' && (
          <>
            <rect className="px-hair" x="6" y="2" width="2" height="2" />
            <rect className="px-hair" x="8" y="1" width="2" height="2" />
            <rect className="px-hair" x="10" y="1" width="2" height="2" />
            <rect className="px-hair" x="12" y="1" width="2" height="2" />
            <rect className="px-hair" x="14" y="2" width="2" height="2" />
            <rect className="px-hair" x="16" y="3" width="1" height="1" />
          </>
        )}
      </g>

      {/* Layer 3: Face (Eyes & Expression) */}
      <g id="layer-face">
        {(merged.face === 'neutral' || merged.face === 'smile') && (
          <>
            <rect className="px-border" x="10" y="6" width="1" height="1" />
            <rect className="px-border" x="13" y="6" width="1" height="1" />
          </>
        )}
        {merged.face === 'wink' && (
          <>
            <rect className="px-border" x="10" y="6" width="1" height="1" />
          </>
        )}
        {merged.face === 'focus' && (
          <>
            <rect className="px-border" x="9" y="6" width="2" height="1" />
            <rect className="px-border" x="13" y="6" width="2" height="1" />
          </>
        )}
      </g>

      {/* Layer 4: Clothing */}
      <g id="layer-clothing">
        <rect className="px-clothing" x="7" y="14" width="10" height="4" />
        <rect className="px-clothing" x="3" y="14" width="2" height="5" />
        <rect className="px-clothing" x="19" y="14" width="2" height="5" />
      </g>

      {/* Layer 5: Accessory */}
      {merged.accessory !== 'none' && (
        <g id="layer-accessory">
          {merged.accessory === 'cap' && (
            <>
              <rect className="px-accessory" x="7" y="1" width="10" height="2" />
              <rect className="px-accessory" x="6" y="2" width="12" height="1" />
            </>
          )}
          {merged.accessory === 'glasses' && (
            <>
              <rect className="px-accessory" x="9" y="5" width="2" height="2" />
              <rect className="px-accessory" x="13" y="5" width="2" height="2" />
              <rect className="px-accessory" x="11" y="6" width="2" height="1" />
            </>
          )}
          {merged.accessory === 'headset' && (
            <>
              <rect className="px-accessory" x="6" y="3" width="2" height="3" />
              <rect className="px-accessory" x="16" y="3" width="2" height="3" />
              <rect className="px-accessory" x="8" y="2" width="8" height="1" />
            </>
          )}
          {merged.accessory === 'headband' && (
            <rect className="px-accessory" x="7" y="3" width="10" height="1" />
          )}
        </g>
      )}
    </svg>
  )
}