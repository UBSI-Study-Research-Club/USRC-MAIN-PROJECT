// Pipeline cover karya otomatis (PRD: prd-karya-cover-otomatis.md, Jalur 1).
// Sumber gambar: meta og:image / twitter:image / favicon dari URL karya
// (project_links). Hasil disimpan ke Telegram Datacenter lewat pola /api/files.

import { createClient } from '@supabase/supabase-js'
import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const PAGE_TIMEOUT_MS = 8000
const PAGE_MAX_BYTES = 2 * 1024 * 1024
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const UA = 'USRC-KaryaCoverBot/1.0 (+https://usrc.my.id)'

export type KaryaLink = { link_type: string | null; url: string }
export type CoverResult = { ok: boolean; reason: string; image_url?: string }

// ── 1. PILIH URL SUMBER ─────────────────────────────────────────
// Prioritas link yang benar-benar "halaman web": live > web > demo > other >
// site > repo. Link sosial (instagram dll.) paling akhir karena og:image-nya
// sering dikunci login wall.
const SOCIAL_HOSTS = /(instagram\.com|facebook\.com|tiktok\.com|x\.com|twitter\.com)$/i

export function pickCoverSource(links: KaryaLink[]): string | null {
  const cleaned = links
    .map((l) => (l.url || '').trim())
    .filter(Boolean)
  if (cleaned.length === 0) return null

  const scored = cleaned
    .map((url) => {
      let host = ''
      try {
        host = new URL(url).hostname
      } catch {
        return null
      }
      return { url, host }
    })
    .filter((x): x is { url: string; host: string } => x !== null)

  const byType = (t: string) =>
    scored.find((x) => links.find((l) => l.url === x.url)?.link_type === t)

  for (const t of ['live', 'web', 'demo', 'other', 'site', 'repo']) {
    const hit = byType(t)
    if (hit && !SOCIAL_HOSTS.test(hit.host)) return hit.url
  }
  const nonSocial = scored.find((x) => !SOCIAL_HOSTS.test(x.host))
  // Upaya terakhir: meski sosmed (og-nya sering dikunci), tetap lebih baik daripada tanpa link.
  return nonSocial ? nonSocial.url : scored[0]?.url ?? null
}

// ── 2. VALIDASI ANTI-SSRF ───────────────────────────────────────
export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }
  const low = ip.toLowerCase()
  if (low === '::1' || low === '::') return true
  if (low.startsWith('fc') || low.startsWith('fd')) return true // unique local
  if (low.startsWith('fe80')) return true // link-local
  if (low.startsWith('::ffff:')) return isPrivateIp(low.slice(7))
  return false
}

/** Lempar Error kalau URL gak aman buat di-fetch dari server. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new Error('url tidak valid')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('skema harus http/https')
  }
  const host = u.hostname.toLowerCase().replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('hostname internal dilarang')
  }
  if (isIP(host) && isPrivateIp(host)) {
    throw new Error('IP privat dilarang')
  }
  // DNS resolve — cek semua hasil (anti DNS-rebinding versi sederhana)
  const addrs = await dnsLookup(host, { all: true }).catch(() => null)
  if (!addrs || addrs.length === 0) throw new Error('host tidak ditemukan')
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error('host mengarah ke IP privat')
  }
  return u
}

// ── 3. EKSTRAKSI KANDIDAT GAMBAR ────────────────────────────────
export function extractImageCandidates(html: string, baseUrl: string): string[] {
  const out: string[] = []
  const push = (raw: string | undefined) => {
    if (!raw) return
    try {
      const abs = new URL(raw.trim(), baseUrl).toString()
      if (abs.startsWith('http') && !out.includes(abs)) out.push(abs)
    } catch {
      /* URL rusak — lewati */
    }
  }

  const metas = html.match(/<meta\s+[^>]*>/gi) || []
  for (const tag of metas) {
    const prop = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase()
    const content = tag.match(/content=["']([^"']+)["']/i)?.[1]
    if (!content) continue
    if (prop === 'og:image' || prop === 'og:image:secure_url' || prop === 'twitter:image' || prop === 'twitter:image:src') {
      push(content)
    }
  }

  const icons = html.match(/<link\s+[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi) || []
  for (const tag of icons) {
    push(tag.match(/href=["']([^"']+)["']/i)?.[1])
  }
  if (out.length === 0) push('/favicon.ico')

  return out.slice(0, 4)
}

// ── 4. FETCH BANTU ──────────────────────────────────────────────
async function fetchCapped(url: string, maxBytes: number, asText: boolean) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const len = Number(res.headers.get('content-length') || 0)
  if (len > maxBytes) throw new Error('ukuran melebihi batas')

  const buf = await res.arrayBuffer()
  if (buf.byteLength > maxBytes) throw new Error('ukuran melebihi batas')
  return { buf, text: asText ? new TextDecoder().decode(buf.slice(0, 1_000_000)) : '' }
}

async function fetchCoverImage(candidates: string[]) {
  for (const url of candidates) {
    try {
      const { buf } = await fetchCapped(url, IMAGE_MAX_BYTES, false)
      if (buf.byteLength < 500) continue // terlalu kecil = bukan gambar beneran
      const head = new Uint8Array(buf.slice(0, 12))
      const isPng = head[0] === 0x89 && head[1] === 0x50
      const isJpg = head[0] === 0xff && head[1] === 0xd8
      const isWebp = head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
      const isGif = head[0] === 0x47 && head[1] === 0x49
      if (!isPng && !isJpg && !isWebp && !isGif) continue // svg/teks ditolak
      const mime = isPng ? 'image/png' : isJpg ? 'image/jpeg' : isWebp ? 'image/webp' : 'image/gif'
      return { bytes: buf, mime }
    } catch {
      /* kandidat gagal — coba berikutnya */
    }
  }
  return null
}

async function fetchFallbackScreenshot(targetUrl: string) {
  try {
    const api = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true`
    const res = await fetch(api, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    const shotUrl = json?.data?.screenshot?.url
    if (!shotUrl || typeof shotUrl !== 'string') return null

    const { buf } = await fetchCapped(shotUrl, IMAGE_MAX_BYTES, false)
    if (buf.byteLength < 1000) return null
    return { bytes: buf, mime: 'image/png' }
  } catch {
    return null
  }
}

// ── 5. ORKESTRASI ──────────────────────────────────────────────
function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'karya'
  )
}

/**
 * Ambil cover untuk satu karya. Aman dipanggil berkali-kali:
 * karya yang sudah punya image_url akan di-skip.
 * Tidak pernah melempar — selalu return hasil.
 */
export async function generateOgCover(
  projectId: string,
  callerClient?: any,
  callerUserId?: string
): Promise<CoverResult> {
  try {
    const { uploadDocumentToTelegram, saveFileRow, fileUrl } = await import('@/lib/files/upload')

    let supabase = callerClient
    if (!supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) return { ok: false, reason: 'env Supabase tidak lengkap' }
      supabase = createClient(url, key, { auth: { persistSession: false } })
    }

    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, user_id, title, image_url, status, project_links(link_type, url, label)')
      .eq('id', projectId)
      .single()
    if (projErr || !project) return { ok: false, reason: projErr?.message || 'karya tidak ditemukan' }
    if (project.image_url) return { ok: true, reason: 'sudah punya cover', image_url: project.image_url }

    const links: KaryaLink[] = project.project_links || []
    const source = pickCoverSource(links)
    if (!source) return { ok: false, reason: 'karya tidak punya link web' }

    await assertPublicHttpUrl(source)

    const page = await fetchCapped(source, PAGE_MAX_BYTES, true)
    const candidates = extractImageCandidates(page.text, source)

    let img = candidates.length > 0 ? await fetchCoverImage(candidates) : null
    if (!img) {
      // Fallback Opsi 1: ambil live snapshot screenshot jika web tidak memiliki og:image/favicon valid
      img = await fetchFallbackScreenshot(source)
    }
    if (!img) return { ok: false, reason: 'gambar preview & screenshot gagal diambil' }

    const doc = await uploadDocumentToTelegram(
      new Blob([img.bytes], { type: img.mime }),
      `${slug(project.title)}-cover.${img.mime === 'image/png' ? 'png' : img.mime === 'image/jpeg' ? 'jpg' : img.mime === 'image/webp' ? 'webp' : 'gif'}`,
      img.mime
    )
    if (!doc) return { ok: false, reason: 'upload ke datacenter gagal' }

    const targetOwnerId = callerUserId || project.user_id
    const row = await saveFileRow(supabase, targetOwnerId, doc, `${slug(project.title)}-cover`, img.mime, img.bytes.byteLength)
    if (!row) return { ok: false, reason: 'gagal menyimpan metadata file' }

    const { error: updErr } = await supabase
      .from('projects')
      .update({ image_url: fileUrl(row.id) })
      .eq('id', projectId)
      .is('image_url', null) // jangan timpa cover yang sudah ada (race-safe)
    if (updErr) return { ok: false, reason: `gagal pasang cover: ${updErr.message}` }

    return { ok: true, reason: 'cover terpasang', image_url: fileUrl(row.id) }
  } catch (err: unknown) {
    return { ok: false, reason: err instanceof Error ? err.message : 'kesalahan tak terduga' }
  }
}
