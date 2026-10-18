use client';

// ─── Avatar Hewan Pixel (USRC) ──────────────────────────────────
// Aset resmi 11 avatar hewan pixel buatan Aditya Prayoga (Adit)
// Format: WebP Lossless (24×24 scaled 10×), transparan, ultra-ringan.

export interface AnimalAvatar {
  id: string;
  name: string;
  asset: string;
}

export const AVATARS: AnimalAvatar[] = [
  { id: 'ayam', name: 'Ayam', asset: '/pixel/animals/ayam.webp' },
  { id: 'beruang', name: 'Beruang', asset: '/pixel/animals/beruang.webp' },
  { id: 'gorila', name: 'Gorila', asset: '/pixel/animals/gorila.webp' },
  { id: 'hamster', name: 'Hamster', asset: '/pixel/animals/hamster.webp' },
  { id: 'kelinci', name: 'Kelinci', asset: '/pixel/animals/kelinci.webp' },
  { id: 'kucing', name: 'Kucing', asset: '/pixel/animals/kucing.webp' },
  { id: 'monyet', name: 'Monyet', asset: '/pixel/animals/monyet.webp' },
  { id: 'panda', name: 'Panda', asset: '/pixel/animals/panda.webp' },
  { id: 'pinguin', name: 'Pinguin', asset: '/pixel/animals/pinguin.webp' },
  { id: 'rubah', name: 'Rubah', asset: '/pixel/animals/rubah.webp' },
  { id: 'singa', name: 'Singa', asset: '/pixel/animals/singa.webp' },
];

export const AVATAR_BG = ['#E38595', '#FFF3C4', '#D1E7DD', '#F8D7DA', '#F5F3EF'];

export function avatarById(id?: string | null): AnimalAvatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS.find((a) => a.id === 'kucing') ?? AVATARS[0];
}

export function validAvatarBg(bg?: string | null): string {
  return bg && AVATAR_BG.includes(bg) ? bg : AVATAR_BG[0];
}

/** SVG string avatar — fallback untuk render manual */
export function avatarSvg(id: string): string {
  const a = avatarById(id);
  return `<svg viewBox="0 0 240 240" aria-hidden="true" style="width:100%;height:100%;display:block"><image href="${a.asset}" width="240" height="240" style="image-rendering:pixelated"/></svg>`;
}

/**
 * Lingkaran avatar hewan — dipakai di strip pixel story,
 * kartu member, composer, dan halaman profil.
 */
export function PixelAvatar({
  id,
  bg,
  className = '',
}: {
  id?: string | null;
  bg?: string | null;
  className?: string;
}) {
  const a = avatarById(id);
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: validAvatarBg(bg) }}
      role="img"
      aria-label={`Avatar ${a.name}`}
    >
      <img
        src={a.asset}
        alt={a.name}
        className="h-[84%] w-[84%] object-contain"
        style={{ imageRendering: 'pixelated' }}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}
