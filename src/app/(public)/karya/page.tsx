'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { withHttps } from '@/lib/url'
import {
  Star, Users, ExternalLink, X, Plus, ArrowLeft,
  Loader2, AlertCircle, CheckCircle2, Palette,
} from 'lucide-react'

type KaryaLink = { link_type: string; url: string; label: string | null }
type Socials = { instagram: string | null; github: string | null; behance: string | null; linkedin: string | null }
type MemberInfo = { full_name: string; instagram: string | null; github: string | null; behance: string | null; linkedin: string | null }

type Karya = {
  id: string
  title: string
  description: string | null
  image_url: string | null
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
  ['portfolio', 'Portofolio'], ['image', 'Gambar'], ['other', 'Lainnya'],
]
const SOCIAL_LABELS: [keyof Socials, string][] = [
  ['instagram', 'IG'], ['github', 'GitHub'], ['behance', 'Behance'], ['linkedin', 'LinkedIn'],
]
const MAX_LINKS = 6

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

export default function KaryaPage() {
  const [karyaList, setKaryaList] = useState<Karya[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [myStars, setMyStars] = useState<Set<string>>(new Set())
  const [inactive, setInactive] = useState(false)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isKelompok, setIsKelompok] = useState(false)
  const [pickedMembers, setPickedMembers] = useState<string[]>([])
  const [formPoints, setFormPoints] = useState<FormPoint[]>([])
  const [directory, setDirectory] = useState<Directory[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formLinks, setFormLinks] = useState<FormLink[]>([emptyLink()])
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createClient()

  // Detail popup selalu diturunkan dari karyaList by id — bintang yang baru
  // diklik ikut ke-update di popup juga (dulu: snapshot objek, angkanya basi).
  const detail = karyaList.find((k) => k.id === detailId) ?? null

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
      setFormLinks([emptyLink()])
      setFormPoints([])
      setPickedMembers([])
      setIsKelompok(false)
      setShowForm(false)
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
      {/* Header */}
      <div className="border-[3px] border-dark bg-white p-6 md:p-8 neo-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-maroon text-white font-[family-name:var(--font-ibm-plex-mono)] text-[10px] px-3 py-1 border-l-[3px] border-b-[3px] border-dark">
          // ETALASE KARYA
        </div>
        <Link href="/" className="inline-flex items-center gap-1.5 border-2 border-dark bg-paper px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </Link>
        <h1 className="text-3xl md:text-4xl font-black uppercase font-[family-name:var(--font-outfit)] tracking-tight text-maroon">
          Karya Anggota
        </h1>
        <p className="text-sm font-[family-name:var(--font-ibm-plex-mono)] text-dark/70 mt-2 max-w-2xl">
          Hasil nyata anggota USRC. Kasih bintang buat karya favoritmu — karya terbaik tampil di halaman utama.
        </p>
        {userId && !inactive && (
          <button
            onClick={openForm}
            className="mt-4 inline-flex items-center gap-2 border-2 border-dark bg-maroon px-4 py-2 font-[family-name:var(--font-outfit)] text-sm font-bold uppercase text-white shadow-[3px_3px_0_var(--color-dark)] hover:bg-[#A62639] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Plus className="w-4 h-4" />
            Buat Karya
          </button>
        )}
        {userId && inactive && (
          <p className="mt-4 inline-block border-2 border-dark bg-[#FFF3C4] px-3 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold">
            Akun belum aktif — buat karya bisa setelah sekre menyetujui pendaftaranmu.
          </p>
        )}
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

      {/* Grid */}
      {karyaList.length === 0 ? (
        <div className="mt-8 border-2 border-dark bg-white p-10 text-center neo-shadow">
          <Palette className="w-10 h-10 text-maroon mx-auto mb-3" />
          <p className="font-[family-name:var(--font-ibm-plex-mono)] text-sm text-dark/60">
            Belum ada karya yang disetujui. {userId ? 'Jadi yang pertama bikin!' : 'Sebentar lagi terisi.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {karyaList.map((k, idx) => (
            <div
              key={k.id}
              onClick={() => setDetailId(k.id)}
              className={`group border-2 border-dark bg-white neo-shadow hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--color-maroon)] transition-all cursor-pointer flex flex-col overflow-hidden ${
                idx % 2 === 0 ? '-rotate-1' : 'rotate-1'
              }`}
            >
              {/* Header badge */}
              {k.category && (
                <div className="flex items-center justify-between bg-[#FFF3C4] border-b-2 border-dark px-3 py-2">
                  <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase text-dark">
                    {k.category}
                  </span>
                  <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[9px] text-dark/50">// karya</span>
                </div>
              )}

              {/* Image */}
              {k.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={k.image_url}
                  alt={k.title}
                  className="h-48 w-full object-cover border-b-2 border-dark"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="h-48 w-full bg-paper border-b-2 border-dark flex items-center justify-center">
                  <Palette className="w-12 h-12 text-dark/20" />
                </div>
              )}

              {/* Content */}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <h2 className="font-black uppercase font-[family-name:var(--font-outfit)] text-lg text-dark leading-tight line-clamp-2">
                  {k.title}
                </h2>

                <p className="flex items-start gap-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark/65">
                  <Users className="w-3.5 h-3.5 text-maroon shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{creatorsOf(k)}</span>
                </p>

                {k.description && (
                  <p className="text-xs text-dark/60 line-clamp-2 italic">
                    {k.description}
                  </p>
                )}

                <div className="mt-auto pt-2 flex items-center justify-between">
                  {starBtn(k)}
                  <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[9px] text-dark/40 group-hover:text-dark/60 transition-colors">
                    klik →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Detail Popup ── */}
      {detail && (
        <div
          className="fixed inset-0 z-[60] bg-dark/60 flex items-center justify-center p-4"
          onClick={() => setDetailId(null)}
        >
          <div
            className="border-[3px] border-dark bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto neo-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[3px] border-dark bg-paper px-4 py-3 sticky top-0">
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase text-dark/60">
                // Detail karya
              </span>
              <button
                onClick={() => setDetailId(null)}
                className="border-2 border-dark bg-white p-1 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 md:p-6 space-y-4">
              {detail.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.image_url}
                  alt={detail.title}
                  className="w-full max-h-72 object-cover border-2 border-dark"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}

              <div>
                {detail.category && (
                  <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase bg-[#FFF3C4] border border-dark px-2 py-0.5 inline-block mb-3">
                    {detail.category}
                  </span>
                )}
                <h2 className="text-2xl font-black uppercase font-[family-name:var(--font-outfit)] text-maroon">
                  {detail.title}
                </h2>
                <p className="mt-2 flex items-start gap-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark/70">
                  <Users className="w-3.5 h-3.5 text-maroon shrink-0 mt-0.5" />
                  <span>{creatorsOf(detail)}</span>
                </p>
              </div>

              {detail.description && (
                <p className="text-sm text-dark/80 leading-relaxed">
                  {detail.description}
                </p>
              )}

              {/* Detail poin (Gelombang C) */}
              {(detail.detail_points || []).length > 0 && (
                <div className="space-y-4">
                  {(detail.detail_points || []).map((pt, i) => (
                    <div key={i}>
                      {pt.title && (
                        <p className="mb-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase text-dark/50">
                          {'// '}{pt.title}
                        </p>
                      )}
                      {renderPoint(pt)}
                    </div>
                  ))}
                </div>
              )}

              {/* Sosmed chips pembuat */}
              <div>
                {socialChips(mergedSocials(detail))}
              </div>

              {/* Link & Action Footer */}
              <div className="border-t-2 border-dark pt-4 mt-6 flex flex-wrap items-center gap-2">
                {starBtn(detail, true)}
                {(detail.links || []).map((l, i) => (
                  <a
                    key={i}
                    href={withHttps(l.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-paper active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {l.label || LINK_TYPES.find(([v]) => v === l.link_type)?.[1] || 'Link'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs font-bold uppercase text-dark">Kategori</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                    placeholder="Web / Riset / UI"
                  />
                </div>
                <div>
                  <label className="font-mono text-xs font-bold uppercase text-dark">Gambar (URL)</label>
                  <input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="mt-1 w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Link fleksibel — sesuai jenis karya, maks 6 */}
              <div>
                <label className="font-mono text-xs font-bold uppercase text-dark">
                  Link Karya ({formLinks.filter((l) => l.url.trim()).length}/{MAX_LINKS})
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
                  className="mt-2 inline-flex items-center gap-1 border-2 border-dark bg-paper px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Link
                </button>
              </div>

              {/* Detail poin — Gelombang C */}
              <div>
                <label className="font-mono text-xs font-bold uppercase text-dark">
                  Detail Karya ({formPoints.length} poin)
                </label>
                <p className="mt-0.5 font-mono text-[10px] text-dark/50">
                  // opsional — jelaskan karyamu per poin, formatnya bebas
                </p>
                <div className="mt-2 space-y-3">
                  {formPoints.map((pt, i) => (
                    <div key={i} className="border-2 border-dark bg-paper/60 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={pt.point_type}
                          onChange={(e) => {
                            const next = [...formPoints]
                            next[i] = emptyPoint(e.target.value as PointType)
                            setFormPoints(next)
                          }}
                          className="border-2 border-dark bg-white px-2 py-1.5 font-mono text-xs font-bold"
                        >
                          {POINT_TYPES.map(([v, lbl]) => (
                            <option key={v} value={v}>{lbl}</option>
                          ))}
                        </select>
                        <input
                          value={pt.title}
                          onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                          className="min-w-0 flex-1 border-2 border-dark px-2 py-1.5 font-mono text-xs focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                          placeholder="Judul poin (mis. Bahasa / Palette / Rilis)"
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

                      {pt.point_type === 'teks' && (
                        <textarea
                          value={pt.text}
                          onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                          rows={3}
                          className="w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                          placeholder="Penjelasan..."
                        />
                      )}
                      {pt.point_type === 'chips' && (
                        <input
                          value={pt.chips}
                          onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, chips: e.target.value } : x)))}
                          className="w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                          placeholder="Python, JavaScript, Figma (pisah dengan koma)"
                        />
                      )}
                      {pt.point_type === 'warna' && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {pt.colors.map((c, ci) => (
                              <div key={ci} className="flex items-center gap-1">
                                <input
                                  type="color"
                                  value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#ffffff'}
                                  onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, colors: x.colors.map((cc, cj) => (cj === ci ? e.target.value : cc)) } : x)))}
                                  className="h-8 w-10 border-2 border-dark bg-white"
                                />
                                <span className="font-mono text-[10px] text-dark/60">{c}</span>
                                <button
                                  type="button"
                                  onClick={() => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, colors: x.colors.filter((_, cj) => cj !== ci) } : x)))}
                                  className="text-dark/50 hover:text-maroon"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, colors: [...x.colors, '#7A1B2E'] } : x)))}
                            className="inline-flex items-center gap-1 border-2 border-dark bg-white px-2 py-1 font-mono text-[10px] font-bold hover:bg-[#FFF3C4]"
                          >
                            <Plus className="w-3 h-3" /> Tambah Warna
                          </button>
                        </div>
                      )}
                      {pt.point_type === 'link' && (
                        <div className="flex flex-wrap gap-2">
                          <input
                            value={pt.url}
                            onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                            className="min-w-0 flex-1 border-2 border-dark px-3 py-1.5 font-mono text-xs focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                            placeholder="https://..."
                          />
                          <input
                            value={pt.linkLabel}
                            onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, linkLabel: e.target.value } : x)))}
                            className="w-32 border-2 border-dark px-2 py-1.5 font-mono text-xs focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                            placeholder="Label"
                          />
                        </div>
                      )}
                      {pt.point_type === 'tabel' && (
                        <div className="space-y-2">
                          <input
                            value={pt.columns}
                            onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, columns: e.target.value } : x)))}
                            className="w-full border-2 border-dark px-3 py-1.5 font-mono text-xs focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                            placeholder="Nama kolom, pisah koma: Versi, Tanggal, Catatan"
                          />
                          <textarea
                            value={pt.rowsText}
                            onChange={(e) => setFormPoints(formPoints.map((x, j) => (j === i ? { ...x, rowsText: e.target.value } : x)))}
                            rows={3}
                            className="w-full border-2 border-dark px-3 py-2 font-mono text-xs focus:outline-none focus:shadow-[2px_2px_0_var(--color-dark)]"
                            placeholder={'Satu baris per entri, sel pisah koma:\n1.0, 12 Okt, Rilis pertama'}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFormPoints([...formPoints, emptyPoint()])}
                  className="mt-2 inline-flex items-center gap-1 border-2 border-dark bg-paper px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-[#FFF3C4] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Poin
                </button>
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

              <button
                onClick={submitKarya}
                disabled={submitting}
                className="w-full py-3 border-2 border-dark bg-maroon font-bold uppercase font-[family-name:var(--font-outfit)] text-white shadow-[3px_3px_0_var(--color-dark)] hover:bg-[#A62639] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Kirim Karya (Menunggu Persetujuan)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
