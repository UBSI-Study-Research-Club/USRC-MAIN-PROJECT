'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Star, Users, ExternalLink, Code2, X, Plus, ArrowLeft,
  Loader2, AlertCircle, CheckCircle2, Palette,
} from 'lucide-react'

type Karya = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  category: string | null
  links: Array<{ id: string; type: string; url: string; label?: string }> | null
  owner_id: string
  owner_name: string
  members: string[] | null
  stars: number
  created_at: string
}

type Directory = { id: string; full_name: string }

const emptyForm = {
  title: '',
  description: '',
  category: '',
  image_url: '',
  repo_url: '',
  live_url: '',
}

export default function KaryaPage() {
  const [karyaList, setKaryaList] = useState<Karya[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [myStars, setMyStars] = useState<Set<string>>(new Set())

  const [detail, setDetail] = useState<Karya | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isKelompok, setIsKelompok] = useState(false)
  const [pickedMembers, setPickedMembers] = useState<Set<string>>(new Set())
  const [directory, setDirectory] = useState<Directory[] | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const { data, error: rpcErr } = await supabase.rpc('get_public_karya')
      if (rpcErr) throw rpcErr
      setKaryaList((data as unknown as Karya[]) || [])

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_stars' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, supabase])

  const creatorsOf = (k: Karya) =>
    [k.owner_name, ...(k.members || [])].join(', ')

  // Toggle bintang: cuma anggota login, dan gak bisa bintang karya sendiri.
  // RLS juga nolak kalau macem-macem — optimis update, gagal = rollback.
  const toggleStar = async (k: Karya) => {
    if (!userId || k.owner_id === userId) return
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
    if (!userId) return
    if (!form.title.trim()) {
      setError('Judul karya wajib diisi.')
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
          repo_url: form.repo_url.trim() || null,
          live_url: form.live_url.trim() || null,
          status: 'pending',
        })
        .select('id')
        .single()
      if (insErr) throw insErr

      if (isKelompok && pickedMembers.size > 0) {
        const { error: memErr } = await supabase.from('project_members').insert(
          Array.from(pickedMembers).map((uid) => ({ project_id: inserted.id, user_id: uid }))
        )
        if (memErr) throw memErr
      }

      setForm(emptyForm)
      setPickedMembers(new Set())
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
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleStar(k)
        }}
        disabled={own || guest}
        title={own ? 'Gak bisa bintang karya sendiri' : guest ? 'Login dulu buat kasih bintang' : starred ? 'Cabut bintang' : 'Kasih bintang'}
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
        {userId && (
          <button
            onClick={openForm}
            className="mt-4 inline-flex items-center gap-2 border-2 border-dark bg-maroon px-4 py-2 font-[family-name:var(--font-outfit)] text-sm font-bold uppercase text-white shadow-[3px_3px_0_var(--color-dark)] hover:bg-[#A62639] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
          >
            <Plus className="w-4 h-4" />
            Buat Karya
          </button>
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
          {karyaList.map((k) => (
            <div
              key={k.id}
              onClick={() => setDetail(k)}
              className="border-[3px] border-dark bg-white neo-shadow hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--color-dark)] transition-all cursor-pointer flex flex-col"
            >
              {k.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={k.image_url}
                  alt={k.title}
                  className="h-44 w-full object-cover border-b-[3px] border-dark"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="h-44 w-full bg-paper border-b-[3px] border-dark flex items-center justify-center">
                  <Palette className="w-10 h-10 text-dark/30" />
                </div>
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                {k.category && (
                  <span className="w-fit font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase bg-[#FFF3C4] border border-dark px-2 py-0.5">
                    {k.category}
                  </span>
                )}
                <h2 className="font-black uppercase font-[family-name:var(--font-outfit)] text-lg text-dark leading-snug">
                  {k.title}
                </h2>
                <p className="flex items-start gap-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark/70">
                  <Users className="w-3.5 h-3.5 text-maroon shrink-0 mt-0.5" />
                  <span>Dibuat oleh {creatorsOf(k)}</span>
                </p>
                <div className="mt-auto pt-2">
                  {starBtn(k)}
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
          onClick={() => setDetail(null)}
        >
          <div
            className="border-[3px] border-dark bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto neo-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[3px] border-dark bg-paper px-4 py-3 sticky top-0">
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase text-dark/60">
                DETAIL KARYA
              </span>
              <button
                onClick={() => setDetail(null)}
                className="border-2 border-dark bg-white p-1 shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 md:p-6">
              {detail.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.image_url}
                  alt={detail.title}
                  className="w-full max-h-72 object-cover border-2 border-dark mb-4"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              {detail.category && (
                <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold uppercase bg-[#FFF3C4] border border-dark px-2 py-0.5">
                  {detail.category}
                </span>
              )}
              <h2 className="mt-2 text-2xl font-black uppercase font-[family-name:var(--font-outfit)] text-maroon">
                {detail.title}
              </h2>
              <p className="mt-1 flex items-start gap-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark/70">
                <Users className="w-3.5 h-3.5 text-maroon shrink-0 mt-0.5" />
                <span>Dibuat oleh {creatorsOf(detail)}</span>
              </p>
              {detail.description && (
                <p className="mt-4 text-sm font-[family-name:var(--font-ibm-plex-mono)] text-dark/80 whitespace-pre-wrap">
                  {detail.description}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {starBtn(detail, true)}
                {detail.repo_url && (
                  <a
                    href={detail.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0_var(--color-dark)] hover:bg-paper active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <Code2 className="w-4 h-4" /> Repo
                  </a>
                )}
                {detail.live_url && (
                  <a
                    href={detail.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border-2 border-dark bg-dark px-3 py-1.5 font-mono text-xs font-bold text-white shadow-[2px_2px_0_var(--color-dark)] hover:bg-maroon active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <ExternalLink className="w-4 h-4" /> Live
                  </a>
                )}
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
                <div>
                  <label className="font-mono text-xs font-bold uppercase text-dark">Link Repo</label>
                  <input
                    value={form.repo_url}
                    onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
                    className="mt-1 w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <label className="font-mono text-xs font-bold uppercase text-dark">Link Live</label>
                  <input
                    value={form.live_url}
                    onChange={(e) => setForm({ ...form, live_url: e.target.value })}
                    className="mt-1 w-full border-2 border-dark px-3 py-2 font-mono text-sm focus:outline-none focus:shadow-[3px_3px_0_var(--color-dark)]"
                    placeholder="https://..."
                  />
                </div>
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
                    Anggota Kelompok ({pickedMembers.size} dipilih)
                  </label>
                  {directory == null ? (
                    <p className="mt-1 font-mono text-xs text-dark/50">Memuat daftar anggota...</p>
                  ) : (
                    <div className="mt-1 max-h-44 overflow-y-auto border-2 border-dark divide-y-2 divide-dark/10">
                      {directory.map((d) => (
                        <label key={d.id} className="flex items-center gap-2 px-3 py-2 font-mono text-sm cursor-pointer hover:bg-[#FFF3C4]/50">
                          <input
                            type="checkbox"
                            checked={pickedMembers.has(d.id)}
                            onChange={(e) => {
                              setPickedMembers((prev) => {
                                const next = new Set(prev)
                                e.target.checked ? next.add(d.id) : next.delete(d.id)
                                return next
                              })
                            }}
                            className="accent-[#7A1B2E] w-4 h-4"
                          />
                          {d.full_name}
                        </label>
                      ))}
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
