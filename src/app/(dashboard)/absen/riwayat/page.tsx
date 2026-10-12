'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Search, History } from 'lucide-react'
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

      // Cek profil — kalau gak ada, pendaftarannya belum di-approve (akun hantu)
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      if (!myProfile) {
        setGhost(true)
        setLoading(false)
        return
      }
      setGhost(false)

      // Sesi lampau saja, terbaru dulu, paging di level query (bukan fetch-all)
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

  // Realtime: status absen berubah (sekre approve/revoke) → badge langsung update
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
    const tanggal = new Date(m.starts_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return `${m.title} ${tanggal}`.toLowerCase().includes(q)
  })

  const badge = (meetingId: string) => {
    const att = attendances[meetingId]
    if (!att)
      return { label: 'TIDAK ABSEN', cls: 'bg-gray-100 text-gray-500' }
    return att.status === 'approved'
      ? { label: 'HADIR', cls: 'bg-[#D1E7DD] text-green-900' }
      : { label: 'PENDING', cls: 'bg-[#FFF3C4] text-yellow-900' }
  }

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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0_#1A1A1A] relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#7A1B2E] text-white font-mono text-[10px] px-3 py-1 border-l-2 border-b-2 border-[#1A1A1A]">
          // AREA ANGGOTA
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase font-['Outfit'] tracking-wide text-[#7A1B2E]">
          Riwayat Absensi
        </h1>
        <p className="text-sm font-['Work_Sans'] text-[#1A1A1A] mt-1 max-w-2xl">
          Semua sesi yang sudah lewat beserta status kehadiranmu.
        </p>
      </div>

      <AbsenTabs />

      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[3px_3px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#7A1B2E] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul sesi atau tanggal..."
          className="w-full pl-9 pr-3 py-2.5 border-2 border-[#1A1A1A] bg-white font-mono text-sm placeholder:text-gray-400 focus:outline-none focus:shadow-[3px_3px_0_#1A1A1A] transition-shadow"
        />
      </div>

      {/* Riwayat List */}
      <div className="space-y-4">
        <h2 className="text-lg font-black uppercase font-['Outfit'] border-b-2 border-[#1A1A1A] pb-2 flex items-center gap-2">
          <History className="w-5 h-5 text-[#7A1B2E]" />
          Sesi Lampau
        </h2>

        {filtered.length === 0 ? (
          <div className="border-2 border-[#1A1A1A] bg-white p-8 text-center shadow-[4px_4px_0_#1A1A1A]">
            <p className="font-mono text-sm text-gray-600">
              {search ? 'Tidak ada sesi yang cocok dengan pencarian.' : 'Belum ada sesi yang sudah lewat.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((meeting) => {
              const b = badge(meeting.id)
              const startDate = new Date(meeting.starts_at)
              const endDate = new Date(meeting.ends_at)

              return (
                <div
                  key={meeting.id}
                  className="border-2 border-[#1A1A1A] bg-white p-5 shadow-[4px_4px_0_#1A1A1A] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`font-mono text-[10px] px-2 py-0.5 border border-[#1A1A1A] font-bold uppercase ${b.cls}`}>
                        {b.label}
                      </span>
                    </div>

                    <h3 className="font-black text-lg uppercase font-['Outfit'] text-[#1A1A1A] mb-1">
                      {meeting.title}
                    </h3>

                    {meeting.description && (
                      <p className="text-sm text-gray-700 mb-3 font-['Work_Sans'] line-clamp-2">
                        {meeting.description}
                      </p>
                    )}

                    <div className="space-y-1 font-mono text-xs text-[#1A1A1A] bg-[#F5F3EF] p-2.5 border border-[#1A1A1A]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#7A1B2E]" />
                        <span>{startDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#7A1B2E]" />
                        <span>{startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Muat Lagi — paging di level query */}
        {!search && meetings.length < total && (
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full py-3 px-4 bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] font-bold uppercase font-['Outfit'] shadow-[3px_3px_0_#1A1A1A] hover:bg-[#7A1B2E] hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#1A1A1A] transition-all flex items-center justify-center gap-2"
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
