'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Search, History, Check, X, Hourglass } from 'lucide-react'
import { GhostScreen, type Meeting, type Attendance } from '../shared'
import { AbsenTabs } from '../AbsenTabs'

const PAGE_SIZE = 10

function RiwayatContent() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [total, setTotal] = useState(0)
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({})
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [ghost, setGhost] = useState(false)

  const supabase = createClient()

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id, status')
        .eq('id', user.id)
        .maybeSingle()
      if (!myProfile || myProfile.status !== 'aktif') {
        setGhost(true)
        setLoading(false)
        return
      }
      setGhost(false)

      const { data: meetingsData, count, error: meetErr } = await supabase
        .from('meetings')
        .select('*', { count: 'exact' })
        .lt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: false })
        .range(0, visible - 1)

      if (meetErr) throw meetErr
      setMeetings(meetingsData || [])
      setTotal(count || 0)

      const { data: attData, error: attErr } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)

      if (attErr) throw attErr

      const attMap: Record<string, Attendance> = {}
      attData?.forEach((att) => {
        attMap[att.meeting_id] = att
      })
      setAttendances(attMap)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat sesi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId, visible])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('riwayat-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendances' },
        (payload) => {
          const att = ((payload.new ?? payload.old) as Attendance | null)
          if (!att || att.user_id !== userId) return
          if (payload.eventType === 'DELETE') {
            setAttendances((prev) => {
              const copy = { ...prev }
              delete copy[att.meeting_id]
              return copy
            })
          } else {
            setAttendances((prev) => ({
              ...prev,
              [att.meeting_id]: att,
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const filtered = meetings.filter((m) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const tanggal = new Date(m.starts_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Pontianak' })
    return `${m.title} ${tanggal}`.toLowerCase().includes(q)
  })

  // Calculate summary stats
  const totalHistoris = total
  const hadirCount = Object.values(attendances).filter(a => a.status === 'approved').length
  const rate = totalHistoris > 0 ? Math.round((hadirCount / totalHistoris) * 100) : 0

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" />
      </div>
    )
  }

  if (ghost) {
    return <GhostScreen />
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* SVG filter for rough stamp texture */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/>
        </filter>
      </svg>

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-white border-2 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] p-7 md:p-8">
        <div className="absolute top-0 right-0 bg-[#7A1B2E] text-white font-mono text-[11px] px-3.5 py-1 border-l-2 border-b-2 border-[#1A1A1A] font-bold uppercase tracking-wider">
          // AREA ANGGOTA
        </div>
        <h1 className="text-3xl md:text-4xl font-black uppercase font-['Outfit'] tracking-tight text-[#7A1B2E] mb-2">
          Riwayat Absensi
        </h1>
        <p className="text-sm md:text-base font-['Work_Sans'] text-[#1A1A1A]/80 max-w-xl leading-relaxed">
          Semua sesi yang sudah lewat beserta status kehadiranmu yang telah tervalidasi oleh sekretaris.
        </p>
      </div>

      <AbsenTabs />

      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[4px_4px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      {/* Summary Card ala absensi-v2 */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] border-2 border-[#1A1A1A] bg-white shadow-[6px_6px_0_#1A1A1A]">
        <div className="p-6 bg-[#F5F3EF] border-b-2 md:border-b-0 md:border-r-2 border-[#1A1A1A] flex flex-col justify-center">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/70">// Total Hadir</span>
          <b className="font-black font-['Outfit'] text-5xl md:text-6xl text-[#7A1B2E] my-1">
            {hadirCount}<small className="text-3xl text-[#1A1A1A]">/{totalHistoris}</small>
          </b>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">Sesi Terverifikasi</span>
          <div className="mt-4 h-3 border-2 border-[#1A1A1A] bg-white overflow-hidden">
            <div className="h-full bg-[#7A1B2E]" style={{ width: `${rate}%` }} />
          </div>
        </div>
        <div className="p-6 flex flex-col justify-center">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-3">
            // Statistik Kehadiran Anggota
          </p>
          <p className="text-sm font-['Work_Sans'] text-[#1A1A1A]/80 leading-relaxed">
            Tingkat kehadiran kamu saat ini adalah <span className="font-bold text-[#7A1B2E]">{rate}%</span> dari seluruh sesi pertemuan yang telah lampau. Pertahankan kehadiran dan keaktifanmu di USRC!
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#7A1B2E] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul sesi atau tanggal..."
          className="w-full pl-10 pr-4 py-3 border-2 border-[#1A1A1A] bg-white font-mono text-sm placeholder:text-gray-400 focus:outline-none focus:shadow-[4px_4px_0_#1A1A1A] transition-shadow"
        />
      </div>

      {/* Riwayat List (Format History Ticket Rows) */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 bg-[#7A1B2E] border-2 border-[#1A1A1A]" />
          <h2 className="text-xl font-black uppercase font-['Outfit'] tracking-wide text-[#1A1A1A]">
            Daftar Sesi Lampau ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="border-2 border-[#1A1A1A] bg-white p-10 text-center shadow-[6px_6px_0_#1A1A1A]">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-mono text-xs uppercase text-gray-500 font-bold">
              {search ? '// Tidak ada sesi yang cocok dengan pencarian.' : '// Belum ada riwayat sesi lampau.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((meeting) => {
              const att = attendances[meeting.id]
              const startDate = new Date(meeting.starts_at)
              const endDate = new Date(meeting.ends_at)

              const dayNum = startDate.toLocaleDateString('id-ID', { day: 'numeric', timeZone: 'Asia/Pontianak' })
              const monthStr = startDate.toLocaleDateString('id-ID', { month: 'short', timeZone: 'Asia/Pontianak' }).toUpperCase()

              const st = att ? att.status : 'alpa'
              const badgeConfig = 
                st === 'approved' ? { label: 'HADIR', cls: 'bg-[#D1E7DD] text-green-900', icon: Check } :
                st === 'pending' ? { label: 'PENDING', cls: 'bg-[#FFF3C4] text-yellow-900', icon: Hourglass } :
                st === 'rejected' ? { label: 'DITOLAK', cls: 'bg-[#F8D7DA] text-red-900', icon: X } :
                { label: 'TIDAK HADIR', cls: 'bg-gray-100 text-gray-600', icon: X }

              const BadgeIcon = badgeConfig.icon

              return (
                <div
                  key={meeting.id}
                  className="relative grid grid-cols-[76px_1fr_auto] md:grid-cols-[90px_1fr_auto] items-stretch bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#7A1B2E] transition-all overflow-hidden"
                >
                  {/* Stamp Overlay for History */}
                  {att && (
                    <div className={`absolute right-24 top-[30%] z-20 pointer-events-none px-3 py-1 border-3 border-current outline-1 outline-current outline-offset-2 rounded-md font-black uppercase font-['Outfit'] text-xl tracking-widest text-center rotate-[-10deg] origin-center opacity-85 mix-blend-multiply ${
                      att.status === 'approved' ? 'text-[#17543A]' : att.status === 'rejected' ? 'text-[#A62639]' : 'text-[#8A5A00]'
                    }`} style={{ filter: 'url(#rough)' }}>
                      {att.status === 'approved' ? 'HADIR' : att.status === 'rejected' ? 'DITOLAK' : 'PENDING'}
                    </div>
                  )}

                  {/* Date Stub */}
                  <div className="bg-[#F5F3EF] border-r-2 border-dashed border-[#1A1A1A] p-3 flex flex-col items-center justify-center text-center">
                    <b className="font-black font-['Outfit'] text-3xl text-[#7A1B2E] leading-none">
                      {dayNum}
                    </b>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] mt-1">
                      {monthStr}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4 md:p-5 flex flex-col justify-center min-w-0">
                    <h3 className="font-black uppercase font-['Outfit'] text-lg md:text-xl text-[#1A1A1A] truncate">
                      {meeting.title}
                    </h3>
                    <p className="font-mono text-xs text-[#1A1A1A]/70 mt-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#7A1B2E] shrink-0" />
                      <span className="truncate">
                        {startDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Pontianak' })} ·{' '}
                        {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })} – {endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })} WIB
                      </span>
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="px-4 flex items-center justify-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-1.5 border-[#1A1A1A] font-mono text-xs font-bold uppercase ${badgeConfig.cls}`}>
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>{badgeConfig.label}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load More */}
        {!search && meetings.length < total && (
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full py-3 px-4 bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] font-bold uppercase font-['Outfit'] shadow-[3px_3px_0_#1A1A1A] hover:bg-[#7A1B2E] hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : 'hidden'}`} />
            <span>Muat Lagi ({meetings.length}/{total})</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function RiwayatPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" /></div>}>
      <RiwayatContent />
    </Suspense>
  )
}
