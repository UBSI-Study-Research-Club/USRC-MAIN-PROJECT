import { ExternalLink, FileText } from 'lucide-react'
import { withHttps, getPdfViewUrl } from '@/lib/url'
import { KaryaCover } from '@/components/KaryaCover'
import { SOCIAL_KEYS, SOCIAL_PLATFORMS, toDisplay, toProfileUrl } from '@/lib/social'

/* Isi lengkap detail karya — dipakai panel detail di homepage DAN halaman karya,
   supaya informasinya sama persis di mana pun karya dibuka. */

export type KaryaLink = { link_type: string; url: string; label: string | null }
export type Socials = { instagram: string | null; github: string | null; behance: string | null; linkedin: string | null }
export type MemberInfo = Socials & { full_name: string }

export type PointType = 'teks' | 'chips' | 'warna' | 'link' | 'tabel'
export type PointValue = {
  text?: string; items?: string[]; colors?: string[]
  url?: string; label?: string; headers?: string[]; rows?: string[][]
}
export type DetailPoint = { point_type: PointType; title: string | null; value: PointValue }

export type KaryaDetailData = {
  title: string
  description: string | null
  image_url: string | null
  pdf_url?: string | null
  category: string | null
  links: KaryaLink[] | null
  owner_name?: string | null
  owner_socials?: Socials | null
  members?: MemberInfo[] | null
  detail_points?: DetailPoint[] | null
}

export const LINK_TYPES: [string, string][] = [
  ['repo', 'Repo'], ['live', 'Live'], ['instagram', 'Instagram'],
  ['youtube', 'YouTube'], ['behance', 'Behance'], ['figma', 'Figma'],
  ['portfolio', 'Portofolio'], ['image', 'Gambar'],
  ['dokumen', 'Artikel / Makalah / Riset (PDF)'], ['sosmed', 'Poster dari Sosmed'],
  ['tools', 'Project Tools / Aplikasi'], ['other', 'Lainnya'],
]

const SOCIALS = SOCIAL_KEYS.map((key) => ({ key, label: SOCIAL_PLATFORMS[key].label }))

const POINT_FALLBACK: Record<string, string> = {
  teks: 'catatan', chips: 'gaya', warna: 'palet warna', link: 'tautan', tabel: 'tabel',
}

const FONT_D = 'font-[family-name:var(--font-outfit)]'


// Gabung sosmed pembuat (owner dulu, anggota mengisi yang kosong) per platform.
function mergedSocials(k: KaryaDetailData): Socials {
  const sources: (Socials | null | undefined)[] = [k.owner_socials, ...(k.members || [])]
  const out = { instagram: null, github: null, behance: null, linkedin: null } as Socials
  for (const { key } of SOCIALS) out[key] = sources.map((s) => s?.[key] ?? null).find(Boolean) ?? null
  return out
}

function Point({ pt }: { pt: DetailPoint }) {
  const v = pt.value || {}
  switch (pt.point_type) {
    case 'teks':
      return <p className="whitespace-pre-wrap text-sm leading-relaxed text-dark/80">{v.text}</p>
    case 'chips':
      return (
        <div className="flex flex-wrap gap-1.5">
          {(v.items || []).map((c, i) => (
            <span key={i} className="border-2 border-dark bg-[#FFF3C4] px-2 py-0.5 font-mono text-xs font-bold">{c}</span>
          ))}
        </div>
      )
    case 'warna':
      return (
        <div className="flex flex-wrap gap-3">
          {(v.colors || []).map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="h-10 w-10 border-2 border-dark shadow-[2px_2px_0_#1A1A1A]" style={{ backgroundColor: c }} />
              <span className="font-mono text-[9px] uppercase text-dark/55">{c}</span>
            </div>
          ))}
        </div>
      )
    case 'link':
      return v.url ? (
        <a
          href={withHttps(v.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-paper active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {v.label || v.url}
        </a>
      ) : null
    case 'tabel':
      return (
        <div className="overflow-x-auto border-2 border-dark">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-dark bg-paper">
                {(v.headers || []).map((h, i) => (
                  <th key={i} className="px-3 py-2 font-bold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(v.rows || []).map((r, i) => (
                <tr key={i} className="border-b border-dark/10 last:border-0">
                  {(v.headers || []).map((_, j) => (
                    <td key={j} className="px-3 py-1.5 text-dark/80">{r[j] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

export function KaryaDetail({
  karya,
  ownerAvatar,
  actions,
  fallbackCover,
}: {
  karya: KaryaDetailData
  /** avatar pembuat (opsional, halaman karya punya data pixel avatar) */
  ownerAvatar?: React.ReactNode
  /** aksi tambahan di baris paling bawah, mis. tombol bintang */
  actions?: React.ReactNode
  /** cover pengganti saat karya tidak punya gambar */
  fallbackCover?: React.ReactNode
}) {
  const creators = [karya.owner_name, ...(karya.members || []).map((m) => m.full_name)].filter(Boolean).join(', ')
  const socials = mergedSocials(karya)
  const socialList = SOCIALS.filter(({ key }) => socials[key])
  const points = karya.detail_points || []
  const links = karya.links || []

  return (
    <div className="p-4 sm:p-6">
      {karya.image_url ? (
        <KaryaCover
          src={karya.image_url}
          alt={karya.title}
          className="aspect-[4/5] max-h-[62vh] border-[3px] border-dark shadow-[5px_5px_0_#1A1A1A] sm:aspect-[4/3]"
        />
      ) : (
        fallbackCover ?? (
          <div className="flex aspect-video w-full items-center justify-center border-[3px] border-dark bg-paper">
            <span className="font-mono text-sm text-dark/30">tanpa gambar</span>
          </div>
        )
      )}

      <span className="mt-6 inline-block -rotate-2 border-2 border-dark bg-[#FFF3C4] px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[.08em]">
        {karya.category || 'Lainnya'}
      </span>
      <h2 className={`${FONT_D} mt-2.5 text-[clamp(28px,6vw,44px)] font-black uppercase leading-[.95] text-maroon`}>
        {karya.title}
      </h2>
      {creators && (
        <div className="mt-3 flex items-center gap-2 font-mono text-xs text-dark">
          {ownerAvatar}
          <span>oleh <b>{creators}</b></span>
        </div>
      )}

      {karya.description && (
        <section className="mt-6">
          <p className="kg-lbl">Deskripsi</p>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-dark/85">{karya.description}</p>
        </section>
      )}

      {points.map((pt, i) => (
        <section key={i} className="mt-6">
          <p className="kg-lbl">{pt.title || POINT_FALLBACK[pt.point_type] || 'Detail'}</p>
          <Point pt={pt} />
        </section>
      ))}

      {socialList.length > 0 && (
        <section className="mt-6">
          <p className="kg-lbl">Sosmed pembuat</p>
          <div className="flex flex-wrap gap-2">
            {socialList.map(({ key, label }) => (
              <a
                key={key}
                href={toProfileUrl(key, socials[key]) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-dark bg-white px-3 py-1.5 shadow-[2px_2px_0_#1A1A1A] transition-colors hover:bg-[#FFF3C4]"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-maroon">{label}</span>
                <span className="text-xs font-semibold text-dark">{toDisplay(key, socials[key])}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {(links.length > 0 || karya.pdf_url || actions) && (
        <div className="mt-7 flex flex-wrap items-center gap-3 border-t-[3px] border-dashed border-dark pt-5">
          {actions}
          {karya.pdf_url && (
            <a
              href={getPdfViewUrl(karya.pdf_url)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${FONT_D} inline-flex items-center gap-1.5 border-[3px] border-dark bg-[#FFF3C4] px-3.5 py-2 text-[13px] font-black uppercase text-dark shadow-[3px_3px_0_#1A1A1A] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
            >
              <FileText className="h-4 w-4" strokeWidth={2.5} />
              Lihat PDF
            </a>
          )}
          {links.map((l, i) => (
            <a
              key={i}
              href={withHttps(l.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${FONT_D} inline-flex items-center gap-1.5 border-[3px] border-dark bg-white px-3.5 py-2 text-[13px] font-black uppercase text-dark shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
              {l.label || LINK_TYPES.find(([v]) => v === l.link_type)?.[1] || 'Link'}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
