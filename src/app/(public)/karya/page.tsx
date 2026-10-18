'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { withHttps } from '@/lib/url'
import {
  Star, ExternalLink, X, Plus, ArrowLeft,
  Loader2, AlertCircle, CheckCircle2, Palette, UploadCloud, ChevronDown, ChevronUp,
} from 'lucide-react'
import { PixelStoryContainer } from '@/components/pixel/PixelStoryContainer'

type KaryaLink = { link_type: string; url: string; label: string | null }
type Socials = { instagram: string | null; github: string | null; behance: string | null; linkedin: string | null }
type MemberInfo = { full_name: string; instagram: string | null; github: string | null; behance: string | null; linkedin: string | null }

type Karya = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  pdf_url: string | null
  category: string | null
  links: KaryaLink[] | null
  owner_id: string
  owner_name: string
  owner_socials: Socials | null
  members: MemberInfo[] | null
  detail_points: DetailPoint[] | null
  stars: number
  created_at: string
}

type Directory = { id: string; full_name: string; instagram: string | null; github: string | null; behance: string | null; linkedin: string | null }

const LINK_TYPES: [string, string][] = [
  ['repo', 'Repo'], ['live', 'Live'], ['instagram', 'Instagram'],
  ['youtube', 'YouTube'], ['behance', 'Behance'], ['figma', 'Figma'],
  ['portfolio', 'Portofolio'], ['image', 'Gambar'],
  ['dokumen', 'Artikel / Makalah / Riset (PDF)'], ['sosmed', 'Poster dari Sosmed'],
  ['tools', 'Project Tools / Aplikasi'], ['other', 'Lainnya'],
]
const SOCIAL_LABELS: [keyof Socials, string][] = [
  ['instagram', 'IG'], ['github', 'GitHub'], ['behance', 'Behance'], ['linkedin', 'LinkedIn'],
]
const MAX_LINKS = 6
const MAX_IMAGE_SIZE = 4 * 1024 * 1024 // 4 MB — cap request body Vercel (gudang Telegram)
const MAX_PDF_SIZE = 4 * 1024 * 1024 // 4 MB — naik jadi 2 GB begitu Local Bot API aktif
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PDF_TYPES = ['application/pdf']

// Upload file apa pun ke gudang Telegram via /api/files — balikin URL relatif
// /api/files/<id> yang disimpan langsung ke kolom image_url / pdf_url karya.
const uploadKaryaFile = async (file: File): Promise<string> => {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/files', { method: 'POST', body })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error || `unggah gagal (${res.status})`)
  }
  const data = await res.json()
  return `/api/files/${data.id}`
}

type FormLink = { link_type: string; url: string; label: string }
const emptyLink = (): FormLink => ({ link_type: 'repo', url: '', label: '' })

// ── Detail poin (Gelombang C): teks / chips / warna / link / tabel ──
type PointType = 'teks' | 'chips' | 'warna' | 'link' | 'tabel'
type PointValue = {
  text?: string; items?: string[]; colors?: string[]
  url?: string; label?: string; headers?: string[]; rows?: string[][]
}
type DetailPoint = { point_type: PointType; title: string | null; value: PointValue }

// Representasi form — tiap tipe punya input sendiri, diratakan jadi satu.
type FormPoint = {
  point_type: PointType; title: string; text: string; chips: string
  colors: string[]; url: string; linkLabel: string; columns: string; rowsText: string
}
const emptyPoint = (point_type: PointType = 'teks'): FormPoint => ({
  point_type, title: '', text: '', chips: '', colors: [], url: '', linkLabel: '', columns: '', rowsText: '',
})
const POINT_TYPES: [PointType, string][] = [
  ['teks', 'Teks'], ['chips', 'Chips'], ['warna', 'Warna'], ['link', 'Link'], ['tabel', 'Tabel'],
]

const CATEGORY_OPTIONS = [
  'Web', 'Aplikasi', 'Artikel / Makalah / Riset', 'Poster / Desain',
  'UI/UX', 'Tools', 'Game', 'Lainnya',
]

// Ubah isi form jadi value jsonb — balikin null kalau kosong/invalid.
const pointToValue = (p: FormPoint): PointValue | null => {
  switch (p.point_type) {
    case 'teks': return p.text.trim() ? { text: p.text.trim() } : null
    case 'chips': {
      const items = p.chips.split(',').map((s) => s.trim()).filter(Boolean)
      return items.length ? { items } : null
    }
    case 'warna': {
      const colors = p.colors.map((c) => c.trim()).filter(Boolean)
      return colors.length ? { colors } : null
    }
    case 'link': {
      const url = p.url.trim() ? normalizeUrl(p.url) : null
      return url ? { url, label: p.linkLabel.trim() || undefined } : null
    }
    case 'tabel': {
      const headers = p.columns.split(',').map((s) => s.trim()).filter(Boolean)
      const rows = p.rowsText.split('\n').map((line) => line.split(',').map((c) => c.trim())).filter((r) => r.some(Boolean))
      return headers.length && rows.length ? { headers, rows } : null
    }
  }
}

const emptyForm = {
  title: '',
  description: '',
  category: '',
  image_url: '',
  pdf_url: '',
}

// Lengkapi url tanpa skema jadi https:// — biar link sosmed bisa diisi
// bentuk apa pun ("instagram.com/aku" tetap jadi link yang bisa diklik).
const normalizeUrl = (raw: string): string | null => {
  const v = raw.trim()
  if (!v) return null
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try {
    return new URL(withScheme).toString()
  } catch {
    return null
  }
}

// Chip sosmed kecil (mono) — brand icons gak ada di lucide-react versi baru.
const socialChips = (s: Socials | null) => {
  if (!s) return null
  const chips = SOCIAL_LABELS.map(([key, label]) =>
    s[key] ? (
      <a
        key={key}
        href={withHttps(s[key] as string)}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-dark bg-paper px-1.5 py-0.5 font-mono text-[10px] font-bold hover:bg-[#FFF3C4]"
      >
        {label}
      </a>
    ) : null
  ).filter(Boolean)
  return chips.length > 0 ? <span className="inline-flex flex-wrap gap-1">{chips}</span> : null
}

// Gabung sosmed pembuat (owner dulu, anggota ngisi yang kosong) per platform.
const mergedSocials = (k: Karya): Socials => {
  const sources: (Socials | null)[] = [
    k.owner_socials,
    ...(k.members || []).map((m) => ({
      instagram: m.instagram, github: m.github, behance: m.behance, linkedin: m.linkedin,
    })),
  ]
  const out = { instagram: null, github: null, behance: null, linkedin: null } as Socials
  for (const [key] of SOCIAL_LABELS) {
    out[key] = sources.map((s) => s?.[key] ?? null).find(Boolean) ?? null
  }
  return out
}

// Renderer satu poin detail sesuai tipe (Gelombang C).
const renderPoint = (pt: DetailPoint) => {
  const v = pt.value || {}
  switch (pt.point_type) {
    case 'teks':
      return <p className="text-sm text-dark/80 leading-relaxed whitespace-pre-wrap">{v.text}</p>
    case 'chips':
      return (
        <div className="flex flex-wrap gap-1.5">
          {(v.items || []).map((c, i) => (
            <span key={i} className="border-2 border-dark bg-[#FFF3C4] px-2 py-0.5 font-mono text-xs font-bold">
              {c}
            </span>
          ))}
        </div>
      )
    case 'warna':
      return (
        <div className="flex flex-wrap gap-3">
          {(v.colors || []).map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="h-10 w-10 border-2 border-dark" style={{ backgroundColor: c }} />
              <span className="font-mono text-[9px] text-dark/50">{c}</span>
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
          <ExternalLink className="w-3.5 h-3.5" />
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

// ── Etalase: warna cover per kategori (deterministik) + inisial ──
const FONT_D = "font-[family-name:var(--font-outfit)]"
const FONT_M = "font-[family-name:var(--font-ibm-plex-mono)]"
const CAT_COLORS: Record<string, [string, string]> = {
  web: ['#6E9A6B', '#B7D3A8'],
  design: ['#2B2118', '#C4622D'],
  foto: ['#E38595', '#F2A31B'],
  video: ['#1A1A1A', '#7A1B2E'],
  game: ['#2B4EA2', '#8DB4E8'],
  riset: ['#2B4EA2', '#8DB4E8'],
  ui: ['#7A1B2E', '#E38595'],
}
const catColor = (c?: string | null): [string, string] => {
  if (!c) return ['#7A1B2E', '#E38595']
  const k = c.toLowerCase()
  if (CAT_COLORS[k]) return CAT_COLORS[k]
  let h = 0
  for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) % 360
  return [`hsl(${h},45%,38%)`, `hsl(${(h + 40) % 360},50%,66%)`]
}
const initials = (name: string) =>
  name.split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase()
const p2 = (n: number) => String(n).padStart(2, '0')
// Label fallback per tipe poin kalau penulis gak isi judul seksi
const POINT_FALLBACK: Record<string, string> = {
  teks: 'catatan', chips: 'gaya', warna: 'palet warna', link: 'tautan', tabel: 'tabel',
}

export default function KaryaPage() {
  const [karyaList, setKaryaList] = useState<Karya[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [myStars, setMyStars] = useState<Set<string>>(new Set())
  const [inactive, setInactive] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('Semua')
  const [showForm, setShowForm] = useState(false)
  const [isKelompok, setIsKelompok] = useState(false)
  const [pickedMembers, setPickedMembers] = useState<string[]>([])
  const [formPoints, setFormPoints] = useState<FormPoint[]>([])
  const [directory, setDirectory] = useState<Directory[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formLinks, setFormLinks] = useState<FormLink[]>([emptyLink()])
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfName, setPdfName] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  const supabase = createClient()

  // Load draft dari localStorage saat komponen dipasang
  useEffect(() => {
    try {
      const saved = localStorage.getItem('usrc_karya_draft')
      if (saved) {
        setHasDraft(true)
      }
    } catch {}
  }, [])

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem('usrc_karya_draft')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.form) setForm(d.form)
        if (d.formLinks) setFormLinks(d.formLinks)
        if (d.formPoints) setFormPoints(d.formPoints)
        if (d.isKelompok !== undefined) setIsKelompok(d.isKelompok)
        if (d.pickedMembers) setPickedMembers(d.pickedMembers)
        if (d.pdfName) setPdfName(d.pdfName)
        setShowForm(true)
      }
      setHasDraft(false)
    } catch {}
  }

  const discardDraft = () => {
    try {
      localStorage.removeItem('usrc_karya_draft')
    } catch {}
    setHasDraft(false)
  }

  // Auto-save draft saat form berubah (jika form sedang dibuka)
  useEffect(() => {
    if (!showForm) return
    try {
      const payload = { form, formLinks, formPoints, isKelompok, pickedMembers, pdfName }
      localStorage.setItem('usrc_karya_draft', JSON.stringify(payload))
    } catch {}
  }, [form, formLinks, formPoints, isKelompok, pickedMembers, showForm, pdfName])

  // Detail popup selalu diturunkan dari karyaList by id — bintang yang baru
  // diklik ikut ke-update di popup juga (dulu: snapshot objek, angkanya basi).
  const detail = karyaList.find((k) => k.id === detailId) ?? null

  // Filter kategori + statistik jujur (dataset dimuat utuh via get_public_karya)
  const cats = ['Semua', ...Array.from(new Set(karyaList.map((k) => k.category).filter(Boolean) as string[]))]
  const filtered = catFilter === 'Semua' ? karyaList : karyaList.filter((k) => k.category === catFilter)
  const totalBintang = karyaList.reduce((a, k) => a + k.stars, 0)

  // Kunci scroll halaman saat popup detail/form terbuka
  useEffect(() => {
    document.body.style.overflow = detailId || showForm ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [detailId, showForm])

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      // Pendaftar pending/rejected: OTP berhasil tapi belum punya baris profiles.
      // Halaman karya publik — tetap boleh lihat, tapi aksi tulis ditutup.
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, status')
          .eq('id', user.id)
          .maybeSingle()
        // Nonaktif (dijeda admin) diperlakukan sama dengan belum aktif.
        setInactive(!prof || prof.status !== 'aktif')
      } else {
        setInactive(false)
      }

      const { data, error: rpcErr } = await supabase.rpc('get_public_karya')
      if (rpcErr) throw rpcErr
      const loadedKarya = (data as unknown as Karya[]) || []
      setKaryaList(loadedKarya)
      // Auto-open detail popup jika ada hash di URL (dari /karya#id di feed)
      if (typeof window !== 'undefined' && window.location.hash) {
        const targetId = window.location.hash.replace('#', '')
        if (loadedKarya.some((k) => k.id === targetId)) {
          setDetailId(targetId)
        }
      }

      if (user) {
        const { data: mine } = await supabase
          .from('project_stars')
          .select('project_id')
          .eq('user_id', user.id)
        setMyStars(new Set((mine || []).map((r) => r.project_id)))
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat karya.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()

    // Realtime: karya baru/approved, anggota kelompok, dan bintang berubah → card update tanpa refresh.
    const channel = supabase
      .channel('karya-page-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_links' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_detail_points' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_stars' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, supabase])

  const creatorsOf = (k: Karya) =>
    [k.owner_name, ...(k.members || []).map((m) => m.full_name)].join(', ')

  // Toggle bintang: cuma anggota login, dan gak bisa bintang karya sendiri.
  // RLS juga nolak kalau macem-macem — optimis update, gagal = rollback.
  const toggleStar = async (k: Karya) => {
    if (!userId || inactive || k.owner_id === userId) return
    const starred = myStars.has(k.id)

    // optimis
    setMyStars((prev) => {
      const next = new Set(prev)
      starred ? next.delete(k.id) : next.add(k.id)
      return next
    })
    setKaryaList((prev) =>
      prev.map((x) => (x.id === k.id ? { ...x, stars: x.stars + (starred ? -1 : 1) } : x))
    )

    try {
      if (starred) {
        const { error: delErr } = await supabase
          .from('project_stars')
          .delete()
          .eq('project_id', k.id)
          .eq('user_id', userId)
        if (delErr) throw delErr
      } else {
        const { error: insErr } = await supabase
          .from('project_stars')
          .insert({ project_id: k.id, user_id: userId })
        if (insErr) throw insErr
      }
    } catch {
      // rollback
      setMyStars((prev) => {
        const next = new Set(prev)
        starred ? next.add(k.id) : next.delete(k.id)
        return next
      })
      setKaryaList((prev) =>
        prev.map((x) => (x.id === k.id ? { ...x, stars: x.stars + (starred ? 1 : -1) } : x))
      )
      setError('Gagal memberi bintang. Coba lagi.')
    }
  }

  const openForm = async () => {
    setShowForm(true)
    setSuccessMsg(null)
    if (userId && !directory) {
      const { data } = await supabase.rpc('get_member_directory')
      // buang diri sendiri dari pilihan
      setDirectory(((data as unknown as Directory[]) || []).filter((d) => d.id !== userId))
    }
  }

  const submitKarya = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!userId || inactive) return
    if (!form.title.trim()) {
      setError('Judul karya wajib diisi.')
      return
    }

    // Validasi link: normalisasi + tolak yang gak bisa jadi URL.
    const filledLinks = formLinks
      .map((l) => ({ ...l, url: l.url.trim(), label: l.label.trim() }))
      .filter((l) => l.url)
    if (filledLinks.length > MAX_LINKS) {
      setError(`Maksimal ${MAX_LINKS} link per karya.`)
      return
    }
    const linksToSave = filledLinks.map((l) => {
      const url = normalizeUrl(l.url)
      if (!url) {
        return { ...l, bad: true }
      }
      return { ...l, url, bad: false }
    })
    if (linksToSave.some((l) => l.bad)) {
      setError('Ada link yang gak valid — cek lagi penulisannya.')
      return
    }

    setSubmitting(true)
    try {
      const { data: inserted, error: insErr } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          image_url: form.image_url.trim() || null,
          pdf_url: form.pdf_url.trim() || null,
          status: 'pending',
        })
        .select('id')
        .single()
      if (insErr) throw insErr

      if (linksToSave.length > 0) {
        const { error: linkErr } = await supabase.from('project_links').insert(
          linksToSave.map((l) => ({
            project_id: inserted.id,
            link_type: l.link_type,
            url: l.url,
            label: l.label || null,
          }))
        )
        if (linkErr) {
          // Rollback: gak boleh ada karya tanpa link yang sudah ke-submit.
          await supabase.from('projects').delete().eq('id', inserted.id)
          throw new Error('Gagal menyimpan link karya — karya dibatalkan. Coba lagi.')
        }
      }

      // Detail poin (Gelombang C) — kosong/invalid otomatis dilewati.
      const points = formPoints
        .map((p, i) => ({ p, v: pointToValue(p), i }))
        .filter((x): x is { p: FormPoint; v: PointValue; i: number } => x.v !== null)
      if (points.length > 0) {
        const { error: ptsErr } = await supabase.from('project_detail_points').insert(
          points.map(({ p, v, i }) => ({
            project_id: inserted.id,
            point_type: p.point_type,
            title: p.title.trim() || null,
            value: v,
            sort_order: i,
          }))
        )
        if (ptsErr) {
          // Rollback: gak boleh ada karya setengah keisi.
          await supabase.from('projects').delete().eq('id', inserted.id)
          throw new Error('Gagal menyimpan detail karya — karya dibatalkan. Coba lagi.')
        }
      }

      if (isKelompok && pickedMembers.filter(Boolean).length > 0) {
        const { error: memErr } = await supabase.from('project_members').insert(
          pickedMembers.filter(Boolean).map((uid) => ({ project_id: inserted.id, user_id: uid }))
        )
        if (memErr) {
          // Rollback: jangan sisain karya yatim tanpa anggota — batalkan insert
          // karyanya biar user coba lagi bersih (RLS: owner boleh hapus karyanya).
          await supabase.from('projects').delete().eq('id', inserted.id)
          throw new Error('Gagal menyimpan anggota kelompok — karya dibatalkan. Coba lagi.')
        }
      }

      setForm(emptyForm)
      setPdfName('')
      setFormLinks([emptyLink()])
      setFormPoints([])
      setPickedMembers([])
      setIsKelompok(false)
      setShowForm(false)
      try { localStorage.removeItem('usrc_karya_draft') } catch {}
      setSuccessMsg('Karya terkirim! Menunggu persetujuan admin sebelum tampil publik.')
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim karya.')
    } finally {
      setSubmitting(false)
    }
  }

  const starBtn = (k: Karya, big = false) => {
    const starred = myStars.has(k.id)
    const own = userId != null && k.owner_id === userId
    const guest = userId == null
    const blocked = own || guest || inactive
    const hint = own
      ? 'Gak bisa bintang karya sendiri'
      : guest
        ? 'Login dulu buat kasih bintang'
        : inactive
          ? 'Akun belum aktif — tunggu sekre menyetujui pendaftaranmu'
          : starred ? 'Cabut bintang' : 'Kasih bintang'
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleStar(k)
        }}
        disabled={blocked}
        title={hint}
        className={`flex items-center gap-1.5 border-2 border-dark px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed ${
          starred ? 'bg-[#FFF3C4] text-dark' : 'bg-white text-dark hover:bg-[#FFF3C4]'
        } ${big ? 'text-sm px-4 py-2' : ''}`}
      >
        <Star className={`w-4 h-4 ${starred ? 'fill-[#E8A100] text-[#E8A100]' : 'text-dark'}`} />
        <span>{k.stars}</span>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-maroon" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12">
      {/* Header — arsip etalase */}
      <div className="archive-stack mt-2">
        <i className="archive-lay c" />
        <i className="archive-lay b" />
        <i className="archive-lay a" />
        <div className="archive-sheet relative border-[3px] border-dark bg-[#FFFDF7] p-6 md:p-9">
          <div className="absolute top-[-3px] right-[-3px] bg-maroon text-white font-mono text-[10px] uppercase tracking-[.1em] px-3 py-1 border-[3px] border-dark">
            // etalase karya
          </div>
          <Link href="/" className="inline-flex items-center gap-1.5 border-[3px] border-dark bg-white px-3 py-1.5 font-display text-[13px] font-black uppercase text-dark shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} />
            Kembali
          </Link>
          <h1 className={`${FONT_D} mt-4 text-[clamp(44px,10vw,88px)] font-black uppercase leading-[.88] tracking-tight text-dark`}>
            Karya<br />
            <span className="text-maroon [text-shadow:4px_4px_0_#1A1A1A]">Anggota</span>
          </h1>
          <p className="mt-4 max-w-[52ch] font-mono text-sm text-dark/80">
            Hasil nyata anggota USRC. Kasih bintang buat karya favoritmu, karya terbaik tampil di halaman utama.
          </p>
          {userId && !inactive && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={openForm}
                className="inline-flex items-center gap-2 border-[3px] border-dark bg-maroon px-5 py-2.5 font-display text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_#1A1A1A] hover:bg-hot active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                Buat karya
              </button>
              {hasDraft && (
                <div className="flex items-center gap-2 border-2 border-dark bg-[#FFF3C4] px-3 py-2 shadow-[3px_3px_0_#1A1A1A]">
                  <span className="font-mono text-xs font-bold text-dark">
                    [Draf tersimpan]
                  </span>
                  <button
                    type="button"
                    onClick={loadDraft}
                    className="border border-dark bg-white px-2 py-0.5 font-mono text-xs font-bold hover:bg-maroon hover:text-white"
                  >
                    Lanjutkan
                  </button>
                  <button
                    type="button"
                    onClick={discardDraft}
                    className="text-xs font-bold text-maroon hover:underline px-1"
                    title="Hapus draf"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
          {userId && inactive && (
            <p className="mt-5 inline-block border-2 border-dark bg-[#FFF3C4] px-3 py-1.5 font-mono text-xs font-bold">
              Akun belum aktif — buat karya bisa setelah sekre menyetujui pendaftaranmu.
            </p>
          )}
        </div>
      </div>

      {/* Statistik miring */}
      <div className="mt-6 flex gap-4" aria-label="Ringkasan">
        <div className="-rotate-2 border-[3px] border-dark bg-[#FFF3C4] px-4 py-2.5 text-center shadow-[4px_4px_0_#1A1A1A]">
          <b className={`${FONT_D} block text-[44px] font-black leading-none text-maroon`}>{p2(karyaList.length)}</b>
          <small className="font-mono text-[10px] uppercase tracking-[.14em] text-dark">karya</small>
        </div>
        <div className="rotate-2 border-[3px] border-dark bg-white px-4 py-2.5 text-center shadow-[4px_4px_0_#1A1A1A]">
          <b className={`${FONT_D} block text-[44px] font-black leading-none text-maroon`}>{p2(totalBintang)}</b>
          <small className="font-mono text-[10px] uppercase tracking-[.14em] text-dark">bintang</small>
        </div>
      </div>

      {error && (
        <div className="mt-6 border-2 border-dark bg-[#F8D7DA] p-4 shadow-[3px_3px_0_var(--color-dark)] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-maroon shrink-0" />
          <p className="text-sm font-bold font-[family-name:var(--font-ibm-plex-mono)]">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="mt-6 border-2 border-dark bg-[#D1E7DD] p-4 shadow-[3px_3px_0_var(--color-dark)] flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-800 shrink-0" />
          <p className="text-sm font-bold font-[family-name:var(--font-ibm-plex-mono)]">{successMsg}</p>
        </div>
      )}

      {/* Pixel Story Anggota */}
      <div className="mt-8">
        <PixelStoryContainer />
      </div>

      {/* Filter kategori */}
      <div className="mt-10 mb-6 flex flex-wrap items-center gap-3">
        <h2 className={`${FONT_D} m-0 flex items-center gap-2.5 text-xl font-black uppercase text-dark`}>
          <i className="h-[13px] w-[13px] border-2 border-dark bg-maroon" />
          {catFilter === 'Semua' ? 'Semua karya' : catFilter}
        </h2>
        <i className="h-[3px] min-w-5 flex-1 bg-dark" />
        <div className="flex flex-wrap gap-2.5" role="group" aria-label="Filter kategori">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={catFilter === c}
              onClick={() => setCatFilter(c)}
              className={`border-2 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wide shadow-[3px_3px_0_#1A1A1A] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                catFilter === c ? 'border-dark bg-maroon text-white' : 'border-dark bg-white text-dark hover:bg-[#FFF3C4]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {karyaList.length === 0 ? (
        <div className="border-[3px] border-dashed border-dark bg-[#FFFDF7] p-10 text-center">
          <Palette className="mx-auto mb-3 h-10 w-10 text-maroon" />
          <p className={`${FONT_M} text-sm text-dark/60`}>
            Belum ada karya yang disetujui. {userId ? 'Jadi yang pertama bikin!' : 'Sebentar lagi terisi.'}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-[3px] border-dashed border-dark bg-[#FFFDF7] p-10 text-center">
          <p className={`${FONT_M} text-sm text-dark/60`}>Belum ada karya di kategori ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-7 gap-y-9 py-2.5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((k) => {
            const idx = karyaList.indexOf(k)
            const [g0, g1] = catColor(k.category)
            return (
              <article
                key={k.id}
                onClick={() => setDetailId(k.id)}
                className="kg-card relative flex cursor-pointer flex-col border-[3px] border-dark bg-[#FFFDF7] shadow-[6px_6px_0_#7A1B2E]"
              >
                {idx % 2 === 0 && <span className="archive-tape" aria-hidden="true" />}

                {/* strip kategori */}
                <div className="flex items-center justify-between border-b-[3px] border-dark bg-[#FFF3C4] px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[.08em]">
                  <b className="text-dark">{k.category || 'Lainnya'}</b>
                  <span className="text-maroon">#{p2(idx + 1)}</span>
                </div>

                {/* cover */}
                {k.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={k.image_url}
                    alt={k.title}
                    className="aspect-[4/3] w-full border-b-[3px] border-dark object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="kg-img aspect-[4/3] border-b-[3px] border-dark" style={{ '--g0': g0, '--g1': g1 } as React.CSSProperties}>
                    <span className={`${FONT_D} line-clamp-3 text-[clamp(30px,5vw,42px)] font-black uppercase leading-none text-white [text-shadow:3px_3px_0_#1A1A1A]`}>
                      {k.title}
                    </span>
                  </div>
                )}

                {/* isi */}
                <div className="flex flex-1 flex-col px-4 pb-2 pt-3.5">
                  <h3 className={`${FONT_D} m-0 text-[22px] font-black uppercase leading-[1.05] text-dark`}>
                    {k.title}
                  </h3>
                  <div className="mt-2.5 mb-1.5 flex items-center gap-2 font-mono text-xs text-dark">
                    <i className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full border-2 border-dark bg-[#E38595] font-display text-[10px] font-black not-italic text-dark">
                      {initials(k.owner_name)}
                    </i>
                    <span className="line-clamp-1">{creatorsOf(k)}</span>
                  </div>
                  {k.description && (
                    <p className="m-0 line-clamp-2 font-mono text-xs italic text-dark/75">{k.description}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2.5 pb-4 pt-3">
                    {starBtn(k)}
                    <span className={`${FONT_M} text-xs font-medium uppercase tracking-wide underline decoration-2 underline-offset-4 hover:text-maroon`}>
                      Lihat karya →
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ── Detail Popup ── */}
      {detail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(26,26,26,.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setDetailId(null)}
        >
          <div
            className="max-h-[calc(100dvh-40px)] w-full max-w-2xl overflow-y-auto overscroll-contain border-[3px] border-dark bg-[#FFFDF7] shadow-[8px_8px_0_#7A1B2E]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* sticky header kuning */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-[3px] border-dark bg-[#FFF3C4] py-2 pl-4 pr-3 font-mono text-[11px] font-medium uppercase tracking-[.1em]">
              <span>// detail karya</span>
              <button
                onClick={() => setDetailId(null)}
                aria-label="Tutup"
                className="h-[38px] w-[38px] border-[3px] border-dark bg-white font-bold shadow-[3px_3px_0_#1A1A1A] transition-colors hover:bg-maroon hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                ✕
              </button>
            </div>

            <div className="p-5 md:p-6">
              {/* cover besar */}
              {detail.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.image_url}
                  alt={detail.title}
                  className="aspect-video w-full border-[3px] border-dark object-cover shadow-[5px_5px_0_#1A1A1A]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                (() => {
                  const [g0, g1] = catColor(detail.category)
                  return (
                    <div className="kg-img aspect-video w-full border-[3px] border-dark shadow-[5px_5px_0_#1A1A1A]" style={{ '--g0': g0, '--g1': g1 } as React.CSSProperties}>
                      <span className={`${FONT_D} text-[clamp(34px,8vw,64px)] font-black uppercase leading-none text-white [text-shadow:3px_3px_0_#1A1A1A]`}>
                        {detail.title}
                      </span>
                    </div>
                  )
                })()
              )}

              <span className="mt-6 inline-block rotate-[-2deg] border-2 border-dark bg-[#FFF3C4] px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[.08em]">
                {detail.category || 'Lainnya'}
              </span>
              <h2 className={`${FONT_D} mt-2.5 text-[clamp(30px,6vw,46px)] font-black uppercase leading-[.95] text-maroon [text-shadow:3px_3px_0_rgba(26,26,26,.15)]`}>
                {detail.title}
              </h2>
              <div className="mt-2.5 flex items-center gap-2 font-mono text-xs text-dark">
                <i className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full border-2 border-dark bg-[#E38595] font-display text-[10px] font-black not-italic">
                  {initials(detail.owner_name)}
                </i>
                <span>{creatorsOf(detail)}</span>
              </div>
              {detail.description && (
                <p className="mt-2.5 text-sm leading-relaxed text-dark/85">{detail.description}</p>
              )}

              {/* Detail poin (Gelombang C) — seksi // label bergaris */}
              {(detail.detail_points || []).length > 0 && (
                <div className="mt-6 space-y-5">
                  {(detail.detail_points || []).map((pt, i) => (
                    <div key={i}>
                      <p className="kg-lbl">
                        {'// '}{pt.title || POINT_FALLBACK[pt.point_type] || 'detail'}
                      </p>
                      {renderPoint(pt)}
                    </div>
                  ))}
                </div>
              )}

              {/* Sosmed chips pembuat */}
              <div className="mt-6">
                {socialChips(mergedSocials(detail))}
              </div>

              {/* Footer: bintang + tautan + tombol PDF jika ada */}
              <div className="mt-7 flex flex-wrap items-center gap-3.5 border-t-[3px] border-dashed border-dark pt-5">
                {starBtn(detail, true)}
                {detail.pdf_url && (
                  <a
                    href={withHttps(detail.pdf_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border-[3px] border-dark bg-[#FFF3C4] px-3.5 py-2 font-display text-[13px] font-black uppercase text-dark shadow-[3px_3px_0_#1A1A1A] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    // UNDUH MAKALAH / RISET (PDF)
                  </a>
                )}
                {(detail.links || []).map((l, i) => (
                  <a
                    key={i}
                    href={withHttps(l.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border-[3px] border-dark bg-white px-3.5 py-2 font-display text-[13px] font-black uppercase text-dark shadow-[3px_3px_0_#1A1A1A] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    ↗ {l.label || LINK_TYPES.find(([v]) => v === l.link_type)?.[1] || 'Link'}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Buat Karya ── */}
      {showForm && (
        <div className="fixed inset-0 z-[60] bg-dark/60 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div
            className="border-[3px] border-dark bg-white max-w-xl w-full max-h-[90vh] overflow-y-auto neo-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[3px] border-dark bg-paper px-4 py-3 sticky top-0">
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase text-dark/60">
                KARYA BARU
              </span>
              <button
                onClick={() => setShowForm(false)}
                className="border-2 border-dark bg-white p-1 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="font-mono text-xs font-bold uppercase text-dark">Judul *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                  placeholder="Nama karya / project"
                />
              </div>
              <div>
                <label className="font-mono text-xs font-bold uppercase text-dark">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                  placeholder="Ceritakan karyamu"
                />
              </div>
              {/* Kategori & Input Dinamis Berdasarkan Kategori */}
              <div>
                <label className="font-mono text-xs font-bold uppercase text-dark">Kategori *</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const selected = form.category === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat })}
                        className={`border-2 border-dark px-3.5 py-1.5 font-mono text-xs font-bold uppercase transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                          selected
                            ? 'bg-maroon text-white shadow-[3px_3px_0_#1A1A1A]'
                            : 'bg-white text-dark hover:bg-paper shadow-[2px_2px_0_#1A1A1A]'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
                {!form.category && (
                  <p className="mt-1 font-mono text-[10px] text-maroon">
                    // Pilih salah satu kategori di atas.
                  </p>
                )}
              </div>

              {/* 1. Gambar Karya: Muncul HANYA jika Kategori Poster / Desain, UI/UX, atau Lainnya */}
              {form.category && (form.category === 'Poster / Desain' || form.category === 'UI/UX' || form.category === 'Lainnya') && (
                <div>
                  <label className="font-mono text-xs font-bold uppercase text-dark">Gambar Karya</label>
                  {form.image_url ? (
                    <div className="relative mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.image_url}
                        alt="Preview gambar karya"
                        className="w-full h-40 object-cover border-2 border-dark"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image_url: '' })}
                        className="absolute top-2 right-2 border-2 border-dark bg-white p-1.5 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        title="Hapus gambar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-dark bg-white px-4 py-8 cursor-pointer transition-colors hover:bg-[#FFF3C4] ${uploadingImage ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin text-maroon" />
                          <span className="font-mono text-xs font-bold text-dark/70">Mengunggah gambar...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-8 h-8 text-maroon" />
                          <span className="font-mono text-xs font-bold text-dark/70">
                            Klik pilih gambar — atau seret ke sini
                          </span>
                          <span className="font-mono text-[10px] text-dark/50">
                            JPG / PNG / WEBP · maks 5 MB
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept={IMAGE_TYPES.join(',')}
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          if (!IMAGE_TYPES.includes(file.type)) {
                            setError('Format gambar harus JPG, PNG, atau WEBP.')
                            return
                          }
                          if (file.size > MAX_IMAGE_SIZE) {
                            setError('Ukuran gambar maksimal 4 MB.')
                            return
                          }
                          setError(null)
                          setUploadingImage(true)
                          try {
                            const url = await uploadKaryaFile(file)
                            setForm((f) => ({ ...f, image_url: url }))
                          } catch (err: any) {
                            console.error('Gagal unggah gambar:', err)
                            setError(err?.message || 'Gagal mengunggah gambar. Coba lagi.')
                          } finally {
                            setUploadingImage(false)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* 2. Dokumen Makalah / Riset / Artikel (PDF): Muncul HANYA jika Kategori Artikel / Makalah / Riset atau Lainnya */}
              {form.category && (form.category === 'Artikel / Makalah / Riset' || form.category === 'Lainnya') && (
                <div className="border-t-2 border-dashed border-dark/30 pt-4">
                  <label className="font-mono text-xs font-bold uppercase text-dark">Dokumen Makalah / Riset / Artikel (PDF)</label>
                  {form.pdf_url ? (
                    <div className="relative mt-1 flex items-center justify-between border-2 border-dark bg-paper p-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-xs font-bold text-maroon">// PDF</span>
                        <a href={form.pdf_url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-dark underline truncate">
                          {pdfName || 'Dokumen tersimpan'}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setForm({ ...form, pdf_url: '' }); setPdfName('') }}
                        className="flex-none border-2 border-dark bg-white p-1.5 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        title="Hapus PDF"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`mt-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-dark bg-white px-4 py-6 cursor-pointer transition-colors hover:bg-[#FFF3C4] ${uploadingPdf ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      {uploadingPdf ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-maroon" />
                          <span className="font-mono text-xs font-bold text-dark/70">Mengunggah dokumen PDF...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-6 h-6 text-maroon" />
                          <span className="font-mono text-xs font-bold text-dark/70">
                            Klik pilih file PDF — atau seret ke sini
                          </span>
                          <span className="font-mono text-[10px] text-dark/50">
                            Format PDF · maks 4 MB
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept={PDF_TYPES.join(',')}
                        className="hidden"
                        disabled={uploadingPdf}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          if (!PDF_TYPES.includes(file.type)) {
                            setError('Format file harus PDF.')
                            return
                          }
                          if (file.size > MAX_PDF_SIZE) {
                            setError('Ukuran file PDF maksimal 4 MB.')
                            return
                          }
                          setError(null)
                          setUploadingPdf(true)
                          try {
                            const url = await uploadKaryaFile(file)
                            setForm((f) => ({ ...f, pdf_url: url }))
                            setPdfName(file.name)
                          } catch (err: any) {
                            console.error('Gagal unggah PDF:', err)
                            const pesan = err?.message || 'Gagal mengunggah PDF. Coba lagi.'
                            setError(pesan.includes('4MB') ? `${pesan} — coba kompres PDF kamu dulu.` : pesan)
                          } finally {
                            setUploadingPdf(false)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* ── Tombol Collapse / Bagian Opsional (F3) ── */}
              <div className="border-t-2 border-dashed border-dark/30 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex w-full items-center justify-between border-2 border-dark bg-paper px-4 py-2.5 font-mono text-xs font-bold uppercase text-dark shadow-[2px_2px_0_var(--color-dark)] hover:bg-[#FFF3C4] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <span className="flex items-center gap-2">
                    <span>// Detail Lanjutan & Tautan</span>
                    <span className="bg-white border border-dark px-1.5 py-0.2 text-[10px] text-maroon">
                      {showAdvanced ? 'Tutup' : 'Opsional'}
                    </span>
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 border-2 border-dark bg-paper/30 p-4">
                    {/* Link fleksibel — sesuai jenis karya, maks 6 */}
                    <div>
                      <label className="font-mono text-xs font-bold uppercase text-dark">
                        Link Tautan / Repository ({formLinks.filter((l) => l.url.trim()).length}/{MAX_LINKS})
                      </label>
                      <div className="mt-1 space-y-2">
                        {formLinks.map((l, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-2">
                            <select
                              value={l.link_type}
                              onChange={(e) => setFormLinks(formLinks.map((x, j) => (j === i ? { ...x, link_type: e.target.value } : x)))}
                              className="border-2 border-dark bg-white px-2 py-2 font-mono text-xs font-bold"
                            >
                              {LINK_TYPES.map(([v, lbl]) => (
                                <option key={v} value={v}>{lbl}</option>
                              ))}
                            </select>
                            <input
                              value={l.url}
                              onChange={(e) => setFormLinks(formLinks.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                              className="min-w-0 flex-1 border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                              placeholder="https://..."
                            />
                            <input
                              value={l.label}
                              onChange={(e) => setFormLinks(formLinks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                              className="w-28 border-2 border-dark px-2 py-2 font-mono text-xs focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                              placeholder="Label (opsional)"
                            />
                            {formLinks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setFormLinks(formLinks.filter((_, j) => j !== i))}
                                className="border-2 border-dark bg-white p-1.5 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                title="Hapus link"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormLinks([...formLinks, emptyLink()])}
                        disabled={formLinks.length >= MAX_LINKS}
                        className="mt-2 inline-flex items-center gap-1 border-2 border-dark bg-white px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Link
                      </button>
                    </div>

                    {/* Detail poin — Gelombang C */}
                    <div>
                      <label className="font-mono text-xs font-bold uppercase text-dark">
                        Detail Poin Karya ({formPoints.length} poin)
                      </label>
                      <p className="mt-0.5 font-mono text-[10px] text-dark/50">
                        // opsional — jelaskan karyamu per bagian (teks, chips warna, link, tabel)
                      </p>
                      <div className="mt-2 space-y-3">
                        {formPoints.map((pt, i) => (
                          <div key={i} className="border-2 border-dark bg-white p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={pt.point_type}
                                onChange={(e) => {
                                  const next = [...formPoints]
                                  next[i] = emptyPoint(e.target.value as PointType)
                                  setFormPoints(next)
                                }}
                                className="border-2 border-dark bg-paper px-2 py-1.5 font-mono text-xs font-bold"
                              >
                                {POINT_TYPES.map(([v, lbl]) => (
                                  <option key={v} value={v}>{lbl}</option>
                                ))}
                              </select>
                              <input
                                value={pt.title}
                                onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                                className="min-w-0 flex-1 border-2 border-dark px-2.5 py-1.5 font-mono text-xs focus:outline-none"
                                placeholder="Judul Poin (opsional)"
                              />
                              <button
                                type="button"
                                onClick={() => setFormPoints(formPoints.filter((_, j) => j !== i))}
                                className="border-2 border-dark bg-white p-1 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                title="Hapus poin"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Render input sesuai point_type */}
                            {pt.point_type === 'teks' && (
                              <textarea
                                value={pt.text}
                                onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                                rows={2}
                                className="w-full border-2 border-dark px-2.5 py-1.5 font-mono text-xs focus:outline-none"
                                placeholder="Tulis isi paragraf poin..."
                              />
                            )}
                            {pt.point_type === 'chips' && (
                              <input
                                value={pt.chips}
                                onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, chips: e.target.value } : x)))}
                                className="w-full border-2 border-dark px-2.5 py-1.5 font-mono text-xs focus:outline-none"
                                placeholder="Chip 1, Chip 2, Chip 3 (pisahkan koma)"
                              />
                            )}
                            {pt.point_type === 'warna' && (
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-2">
                                  {pt.colors.map((c, ci) => (
                                    <div key={ci} className="flex items-center gap-1 border-2 border-dark bg-paper p-1">
                                      <input
                                        type="color"
                                        value={c}
                                        onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, colors: x.colors.map((cc, cj) => (cj === ci ? e.target.value : cc)) } : x)))}
                                        className="h-6 w-6 border-0 cursor-pointer bg-transparent"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, colors: x.colors.filter((_, cj) => cj !== ci) } : x)))}
                                        className="text-xs font-bold text-maroon px-1"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, colors: [...x.colors, '#7A1B2E'] } : x)))}
                                  className="border-2 border-dark bg-white px-2 py-1 font-mono text-[10px] font-bold"
                                >
                                  + Warna
                                </button>
                              </div>
                            )}
                            {pt.point_type === 'link' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  value={pt.url}
                                  onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                                  className="border-2 border-dark px-2 py-1 font-mono text-xs"
                                  placeholder="https://..."
                                />
                                <input
                                  value={pt.linkLabel}
                                  onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, linkLabel: e.target.value } : x)))}
                                  className="border-2 border-dark px-2 py-1 font-mono text-xs"
                                  placeholder="Label Link"
                                />
                              </div>
                            )}
                            {pt.point_type === 'tabel' && (
                              <div className="space-y-2">
                                <input
                                  value={pt.columns}
                                  onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, columns: e.target.value } : x)))}
                                  className="w-full border-2 border-dark px-2 py-1 font-mono text-xs"
                                  placeholder="Kolom 1, Kolom 2, Kolom 3 (pisahkan koma)"
                                />
                                <textarea
                                  value={pt.rowsText}
                                  onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, rowsText: e.target.value } : x)))}
                                  rows={2}
                                  className="w-full border-2 border-dark px-2 py-1 font-mono text-xs"
                                  placeholder="Baris 1A, Baris 1B, Baris 1C&#10;Baris 2A, Baris 2B, Baris 2C"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormPoints([...formPoints, emptyPoint()])}
                        className="mt-2 inline-flex items-center gap-1 border-2 border-dark bg-white px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Poin Detail
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tipe karya */}
              <div>
                <label className="font-mono text-xs font-bold uppercase text-dark">Tipe</label>
                <div className="mt-1 flex gap-2">
                  {[['individual', 'INDIVIDUAL'], ['kelompok', 'KELOMPOK']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setIsKelompok(val === 'kelompok')}
                      className={`border-2 border-dark px-4 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] transition-colors ${
                        (val === 'kelompok') === isKelompok ? 'bg-maroon text-white' : 'bg-white hover:bg-[#FFF3C4]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {isKelompok && (
                <div>
                  <label className="font-mono text-xs font-bold uppercase text-dark">
                    Anggota Kelompok ({pickedMembers.filter(Boolean).length} dipilih)
                  </label>
                  {directory == null ? (
                    <p className="mt-1 font-mono text-xs text-dark/50">Memuat daftar anggota...</p>
                  ) : (
                    <div className="mt-1 space-y-2">
                      {/* Kotak per anggota — kosong = belum dipilih */}
                      {pickedMembers.map((id, i) => {
                        const d = directory.find((x) => x.id === id)
                        return d ? (
                          <div key={i} className="flex items-center justify-between border-2 border-dark bg-white px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-sm font-bold">{d.full_name}</span>
                              {socialChips(d)}
                            </div>
                            <button
                              type="button"
                              onClick={() => setPickedMembers(pickedMembers.filter((_, j) => j !== i))}
                              className="border-2 border-dark bg-white p-1 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                              title="Keluarkan dari kelompok"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <select
                            key={i}
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return
                              const next = [...pickedMembers]
                              next[i] = e.target.value
                              setPickedMembers(next)
                            }}
                            className="w-full border-2 border-dark bg-white px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                          >
                            <option value="">Pilih anggota…</option>
                            {directory
                              .filter((x) => !pickedMembers.includes(x.id))
                              .map((x) => (
                                <option key={x.id} value={x.id}>{x.full_name}</option>
                              ))}
                          </select>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setPickedMembers([...pickedMembers, ''])}
                        disabled={directory.filter((x) => !pickedMembers.includes(x.id)).length <= 0}
                        className="inline-flex items-center gap-1 border-2 border-dark bg-paper px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Orang
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex-1 py-3 border-2 border-dark bg-white font-bold uppercase font-[family-name:var(--font-outfit)] text-dark shadow-[3px_3px_0_var(--color-dark)] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  Pratinjau
                </button>
                <button
                  onClick={submitKarya}
                  disabled={submitting}
                  className="flex-1 py-3 border-2 border-dark bg-maroon font-bold uppercase font-[family-name:var(--font-outfit)] text-white shadow-[3px_3px_0_var(--color-dark)] hover:bg-[#A62639] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Kirim Karya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pratinjau Karya (F4) ── */}
      {showPreview && (
        <div className="fixed inset-0 z-[70] bg-dark/70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowPreview(false)}>
          <div
            className="border-[3px] border-dark bg-white max-w-lg w-full max-h-[90vh] overflow-y-auto neo-shadow p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-dark pb-3">
              <span className="font-mono text-xs font-bold uppercase text-maroon">
                // Pratinjau Tampilan Kartu Karya
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="border-2 border-dark bg-white p-1 shadow-[2px_2px_0_var(--color-dark)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulasi kartu */}
            <div className="border-[3px] border-dark bg-white p-5 shadow-[6px_6px_0_#1A1A1A]">
              {form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="Preview" className="w-full h-48 object-cover border-2 border-dark mb-4" />
              ) : (
                <div className="w-full h-48 border-2 border-dark bg-paper flex items-center justify-center font-mono text-xs text-dark/40 mb-4">
                  [ Belum ada gambar diunggah ]
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="border-2 border-dark bg-[#FFF3C4] px-2.5 py-0.5 font-mono text-xs font-bold uppercase">
                  {form.category || 'Kategori'}
                </span>
                <span className="font-mono text-xs text-dark/60">Baru saja</span>
              </div>
              <h3 className={`${FONT_D} mt-2 text-2xl font-black uppercase text-dark`}>
                {form.title.trim() || 'Judul Karya Anda'}
              </h3>
              <p className="mt-2 font-['Work_Sans'] text-sm text-dark/80 line-clamp-3">
                {form.description.trim() || 'Deskripsi atau ringkasan karya akan tampil di sini...'}
              </p>
            </div>

            <p className="font-mono text-xs text-dark/70 text-center">
              Pastikan judul, kategori, dan gambar sudah sesuai sebelum dikirim ke sekre.
            </p>

            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="w-full py-2.5 border-2 border-dark bg-paper font-mono text-xs font-bold uppercase hover:bg-[#FFF3C4]"
            >
              Kembali Edit Form
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
