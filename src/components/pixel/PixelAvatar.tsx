'use client';

// ─── Avatar Hewan Pixel ───────────────────────────────────────
// Grid placeholder dari prototype "Profil Saya" (Raken).
// Aset final menyusul via PR Adit/Yoga — ganti AVATARS saja,
// semua pemakaian (strip, kartu member, profil) ikut otomatis.

export interface AnimalAvatar {
  id: string;
  name: string;
  /** huruf grid → warna fill */
  colors: Record<string, string>;
  grid: string[];
}

export const AVATARS: AnimalAvatar[] = [
  {
    id: 'kucing', name: 'Kucing',
    colors: { b: '#E8944A', l: '#FBE3C6', p: '#E38595' },
    grid: ['..b......b..', '..bb....bb..', '..bbbbbbbb..', '.bbbbbbbbbb.', '.bbebbbbebb.', '.bbbbbbbbbb.', '.bbbllpplbb.', '.bbbbllllbb.', '..bbbbbbbb..', '...bbbbbb...'],
  },
  {
    id: 'rubah', name: 'Rubah',
    colors: { b: '#D9622B', l: '#FFF6EA' },
    grid: ['b..........b', 'bb........bb', 'bbb......bbb', 'bbbbbbbbbbbb', '.bbebbbbebb.', '.bbbbbbbbbb.', '..llbbbbll..', '..lllbblll..', '....lleell..', '......ll....'],
  },
  {
    id: 'panda', name: 'Panda',
    colors: { b: '#FAFAFA', l: '#FFFFFF' },
    grid: ['ee........ee', 'eee......eee', '.ebbbbbbbbe.', '.bbbbbbbbbb.', '.eelbbbblee.', '.eeebbbbeee.', '.bbbbeebbbb.', '.bbbbbbbbbb.', '..bbbbbbbb..'],
  },
  {
    id: 'kelinci', name: 'Kelinci',
    colors: { b: '#F4EDE4', p: '#E38595' },
    grid: ['...bbb.bbb..', '...bpb.bpb..', '...bpb.bpb..', '.bbbbbbbbbb.', '.bbebbbbebb.', '.bbbbbbbbbb.', '.bbbbppbbbb.', '..bbbbbbbb..'],
  },
  {
    id: 'katak', name: 'Katak',
    colors: { b: '#6DB35A', l: '#E8F5D8', p: '#E38595' },
    grid: ['..bb....bb..', '.bleb..bleb.', '.bbbbbbbbbb.', 'bbbbbbbbbbbb', 'bbbbbbbbbbbb', 'bppbbbbbbppb', 'bbbeeeeeebbb', '.bbbbbbbbbb.', '..llllllll..'],
  },
  {
    id: 'beruang', name: 'Beruang',
    colors: { b: '#8B5A3C', l: '#D9B38C' },
    grid: ['bb........bb', 'bbb......bbb', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbebbbbebb.', '.bbbbbbbbbb.', '.bbbllllbbb.', '.bbllleelbb.', '..bbbbbbbb..'],
  },
  {
    id: 'anjing', name: 'Anjing',
    colors: { b: '#D2A66B', l: '#F6E7CC', p: '#7B4B2A' },
    grid: ['pp........pp', 'pp........pp', 'ppbbbbbbbbpp', 'ppbbbbbbbbpp', 'ppbebbbbebpp', '.bbbbbbbbbb.', '.bbbllllbbb.', '.bbllleelbb.', '..bbbbbbbb..'],
  },
  {
    id: 'hantu', name: 'Burung hantu',
    colors: { b: '#8A6A4B', l: '#F3E3C3', p: '#F2A31B' },
    grid: ['bb........bb', 'bbb......bbb', '.bbbbbbbbbb.', '.bllbbbbllb.', '.blelbbblel.', '.bllbbbbllb.', '.bbbbppbbbb.', '.bblbbbblbb.', '..bbbbbbbb..'],
  },
];

export const AVATAR_BG = ['#E38595', '#FFF3C4', '#D1E7DD', '#F8D7DA', '#F5F3EF'];

export function avatarById(id?: string | null): AnimalAvatar {
  return AVATARS.find(a => a.id === id) ?? AVATARS[0];
}

export function validAvatarBg(bg?: string | null): string {
  return bg && AVATAR_BG.includes(bg) ? bg : AVATAR_BG[0];
}

function avatarSvgInner(a: AnimalAvatar): string {
  const c: Record<string, string> = { ...a.colors, e: '#1A1A1A' };
  let r = '';
  a.grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (c[ch]) r += `<rect x="${x}" y="${y + 1}" width="1" height="1" fill="${c[ch]}"/>`;
  }));
  return r;
}

/** SVG string avatar — untuk render manual (mis. innerHTML di grid picker) */
export function avatarSvg(id: string): string {
  return `<svg viewBox="0 0 12 12" aria-hidden="true" style="width:100%;height:100%;display:block">${avatarSvgInner(avatarById(id))}</svg>`;
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
      className={className}
      style={{ background: validAvatarBg(bg) }}
      role="img"
      aria-label={`Avatar ${a.name}`}
    >
      <svg viewBox="0 0 12 12" aria-hidden="true" style={{ width: '100%', height: '100%', display: 'block' }}>
        {avatarSvgInner(a)}
      </svg>
    </div>
  );
}
