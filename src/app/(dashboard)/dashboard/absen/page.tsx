'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Send, Ticket } from 'lucide-react'
import { isWithinWindow, GhostScreen, type Meeting, type Attendance } from './shared'
import { AbsenTabs } from './AbsenTabs'

function SesiAktifContent() {
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>([])
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([])
  const [attendances, setAttendances] = useState<Record<string, Attendance>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
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

      const { data: meetingsData, error: meetErr } = await supabase
        .from('meetings')
        .select('*')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true })

      if (meetErr) throw meetErr
      const all = meetingsData || []
      const nowIso = Date.now()
      setActiveMeetings(all.filter((m) => isWithinWindow(m.starts_at, m.ends_at)))
      setUpcomingMeetings(all.filter((m) => new Date(m.starts_at).getTime() > nowIso))

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
      setError(err.message || 'Gagal memuat data sesi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('absen-page-changes')
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

  const handleAbsen = async (meetingId: string) => {
    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      try {
        if (!userId) throw new Error('User tidak ditemukan.')

        const { error: insertErr } = await supabase
          .from('attendances')
          .insert({
            meeting_id: meetingId,
            user_id: userId,
            status: 'pending',
          })

        if (insertErr) {
          throw new Error(insertErr.message || 'Gagal melakukan absen. Pastikan dalam window absen.')
        }

        setSuccessMsg('Absen berhasil dikirim! Menunggu persetujuan Sekretaris.')
        fetchData()
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat absen.')
      }
    })
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Banner ala Absensi v2 */}
      <div className="relative overflow-hidden bg-white border-2 border-[#1A1A1A] shadow-[6px_6px_0_#1A1A1A] p-7 md:p-8">
        <div className="absolute top-0 right-0 bg-[#7A1B2E] text-white font-mono text-[11px] px-3.5 py-1 border-l-2 border-b-2 border-[#1A1A1A] font-bold uppercase tracking-wider">
          // AREA ANGGOTA
        </div>
        <h1 className="text-3xl md:text-4xl font-black uppercase font-['Outfit'] tracking-tight text-[#7A1B2E] mb-2">
          Absensi Sesi USRC
        </h1>
        <p className="text-sm md:text-base font-['Work_Sans'] text-[#1A1A1A]/80 max-w-xl leading-relaxed">
          Lakukan presensi pada tiket sesi yang sedang berlangsung. Riwayat kehadiran lengkap dapat dicek melalui tab <span className="font-bold underline text-[#7A1B2E]">Riwayat</span>.
        </p>
      </div>

      <AbsenTabs />

      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[4px_4px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="border-2 border-[#1A1A1A] bg-[#D1E7DD] p-4 shadow-[4px_4px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <CheckCircle2 className="w-5 h-5 text-green-800 shrink-0" />
          <p className="text-sm font-bold font-mono">{successMsg}</p>
        </div>
      )}

      {/* Sesi Aktif (Format Tiket Neobrutalist) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 bg-[#7A1B2E] border-2 border-[#1A1A1A]" />
          <h2 className="text-xl font-black uppercase font-['Outfit'] tracking-wide text-[#1A1A1A]">
            Tiket Sesi Aktif ({activeMeetings.length})
          </h2>
        </div>

        {activeMeetings.length === 0 ? (
          <div className="border-2 border-[#1A1A1A] bg-white p-10 text-center shadow-[6px_6px_0_#1A1A1A]">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-mono text-xs uppercase text-gray-500 font-bold">
              // Belum ada sesi absensi yang dibuka saat ini.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeMeetings.map((meeting) => {
              const attendance = attendances[meeting.id]
              const startDate = new Date(meeting.starts_at)
              const endDate = new Date(meeting.ends_at)

              const dow = startDate.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'Asia/Pontianak' }).toUpperCase()
              const dayNum = startDate.toLocaleDateString('id-ID', { day: 'numeric', timeZone: 'Asia/Pontianak' })
              const monthStr = startDate.toLocaleDateString('id-ID', { month: 'short', timeZone: 'Asia/Pontianak' }).toUpperCase()

              return (
                <div
                  key={meeting.id}
                  className="relative grid grid-cols-1 md:grid-cols-[1fr_180px] bg-white border-2 border-[#1A1A1A] shadow-[7px_7px_0_#7A1B2E] overflow-hidden"
                >
                  {/* Main Ticket Info */}
                  <div className="p-6 md:p-7 flex flex-col justify-between gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#D1E7DD] border-1.5 border-[#1A1A1A] font-mono text-[11px] font-bold uppercase">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-[#1A1A1A] animate-pulse" />
                        <span>WINDOW ABSEN DIBUKA</span>
                      </div>

                      {attendance && (
                        <span className={`font-mono text-[11px] px-2.5 py-1 border-1.5 border-[#1A1A1A] font-bold uppercase ${
                          attendance.status === 'approved' ? 'bg-[#D1E7DD] text-green-900' : 'bg-[#FFF3C4] text-yellow-900'
                        }`}>
                          STATUS: {attendance.status === 'approved' ? 'HADIR (APPROVED)' : 'MENUNGGU APPROVAL'}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl md:text-3xl font-black uppercase font-['Outfit'] tracking-tight text-[#1A1A1A] mb-2">
                        {meeting.title}
                      </h3>
                      {meeting.description && (
                        <p className="text-sm font-['Work_Sans'] text-[#1A1A1A]/70 mb-4">
                          {meeting.description}
                        </p>
                      )}
                      <div className="inline-flex items-center gap-2 font-mono text-xs text-[#7A1B2E] bg-[#FFF9DC] px-3 py-1.5 border border-[#1A1A1A]">
                        <Clock className="w-4 h-4" />
                        <span>
                          {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })} – {endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })} WIB
                        </span>
                      </div>
                    </div>

                    <div>
                      {attendance ? (
                        <div className="w-full py-3.5 px-5 bg-[#D1E7DD] border-2 border-[#1A1A1A] text-center font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0_#1A1A1A]">
                          <CheckCircle2 className="w-4 h-4 text-green-700" />
                          <span>Absensi Tercatat ({attendance.status})</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAbsen(meeting.id)}
                          disabled={isPending}
                          className="w-full py-4 px-6 bg-[#7A1B2E] text-white border-2 border-[#1A1A1A] font-extrabold uppercase font-['Outfit'] text-base shadow-[4px_4px_0_#1A1A1A] hover:bg-[#A62639] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Mengirim Absen...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              <span>Absen Sekarang</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ticket Stub (Right Date Badge) */}
                  <div className="bg-[#F5F3EF] border-t-2 md:border-t-0 md:border-l-2 border-dashed border-[#1A1A1A] p-6 flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/60">
                      {dow}
                    </span>
                    <span className="font-black font-['Outfit'] text-5xl md:text-6xl text-[#7A1B2E] my-1">
                      {dayNum}
                    </span>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                      {monthStr}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Jadwal Mendatang */}
      {upcomingMeetings.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-amber-400 border-2 border-[#1A1A1A]" />
            <h2 className="text-xl font-black uppercase font-['Outfit'] tracking-wide text-[#1A1A1A]">
              Jadwal Sesi Mendatang ({upcomingMeetings.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.map((meeting) => {
              const startDate = new Date(meeting.starts_at)
              return (
                <div
                  key={meeting.id}
                  className="border-2 border-[#1A1A1A] bg-[#F5F3EF] p-5 shadow-[4px_4px_0_#1A1A1A] flex items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="font-black uppercase font-['Outfit'] text-sm text-[#1A1A1A]">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-2 font-mono text-xs text-[#1A1A1A]/70 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#7A1B2E]" />
                      <span>
                        {startDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Pontianak' })} ·{' '}
                        {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })} WIB
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] bg-white border border-[#1A1A1A] px-2 py-1 font-bold uppercase text-[#1A1A1A]/60 shrink-0">
                    Akan Datang
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SesiAktifPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" /></div>}>
      <SesiAktifContent />
    </Suspense>
  )
}
