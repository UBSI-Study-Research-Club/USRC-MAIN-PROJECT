// Format sosmed yang seragam di seluruh web.
// Anggota bisa mengisi apa saja — "@rara.kirana", "rara.kirana",
// "https://www.instagram.com/rara.kirana/?igsh=xyz" — semuanya dirapikan
// jadi username yang sama, lalu link dibangun ulang dari username itu.

export type SocialKey = 'instagram' | 'github' | 'behance' | 'linkedin'

export const SOCIAL_PLATFORMS: Record<SocialKey, { label: string; domain: string; path: string; at: boolean }> = {
  instagram: { label: 'Instagram', domain: 'instagram.com', path: '/', at: true },
  github: { label: 'GitHub', domain: 'github.com', path: '/', at: false },
  behance: { label: 'Behance', domain: 'behance.net', path: '/', at: false },
  linkedin: { label: 'LinkedIn', domain: 'linkedin.com', path: '/in/', at: false },
}

export const SOCIAL_KEYS = Object.keys(SOCIAL_PLATFORMS) as SocialKey[]

/** Ambil username bersih dari input apa pun. */
export function toHandle(key: SocialKey, raw: string | null | undefined): string {
  let v = (raw ?? '').trim()
  if (!v) return ''
  const { domain, path } = SOCIAL_PLATFORMS[key]
  // buang skema, www., query, hash
  v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[?#].*$/, '')
  if (v.toLowerCase().startsWith(domain)) {
    v = v.slice(domain.length)
    // LinkedIn: /in/<user>; platform lain: segmen pertama
    if (path !== '/' && v.toLowerCase().startsWith(path)) v = v.slice(path.length)
    v = v.replace(/^\/+/, '').split('/')[0] ?? ''
  }
  v = v.replace(/^@+/, '').replace(/\/+$/, '').replace(/\s+/g, '')
  // Username Instagram tidak peka huruf besar — seragamkan jadi huruf kecil
  return key === 'instagram' ? v.toLowerCase() : v
}

/** Link lengkap ke profil. */
export function toProfileUrl(key: SocialKey, raw: string | null | undefined): string | null {
  const h = toHandle(key, raw)
  if (!h) return null
  const { domain, path } = SOCIAL_PLATFORMS[key]
  return `https://${domain}${path}${h}`
}

/** Teks tampilan: "@username" untuk Instagram, username biasa untuk lainnya. */
export function toDisplay(key: SocialKey, raw: string | null | undefined): string {
  const h = toHandle(key, raw)
  if (!h) return ''
  return SOCIAL_PLATFORMS[key].at ? `@${h}` : h
}
