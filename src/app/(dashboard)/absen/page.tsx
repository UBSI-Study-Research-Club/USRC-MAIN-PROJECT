'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react'
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

      // Sesi aktif + mendatang saja (lampau = tanggungan halaman riwayat)
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

      // Fetch my attendances
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

    // Realtime: absen milik sendiri + sesi baru dari sekre (tanpa refresh)
    const channel = supabase
      .channel('absen-page-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendances' },
        (payload) => {
          // DELETE event: payload.new null — pakai payload.old
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

        // Insert attendance with status pending
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0_#1A1A1A] relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#7A1B2E] text-white font-mono text-[10px] px-3 py-1 border-l-2 border-b-2 border-[#1A1A1A]">
          // AREA ANGGOTA
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase font-['Outfit'] tracking-wide text-[#7A1B2E]">
          Absensi Sesi USRC
        </h1>
        <p className="text-sm font-['Work_Sans'] text-[#1A1A1A] mt-1 max-w-2xl">
          Tombol absen hanya muncul saat window buka (mulai 30 menit sebelum sesi hingga selesai). Riwayat absen lampau ada di tab <span className="font-bold underline">Riwayat</span>.
        </p>
      </div>

      <AbsenTabs />

      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[3px_3px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="border-2 border-[#1A1A1A] bg-[#D1E7DD] p-4 shadow-[3px_3px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <CheckCircle2 className="w-5 h-5 text-green-800 shrink-0" />
          <p className="text-sm font-bold font-mono">{successMsg}</p>
        </div>
      )}

      {/* Sesi Aktif */}
      <div className="space-y-4">
        <h2 className="text-lg font-black uppercase font-['Outfit'] border-b-2 border-[#1A1A1A] pb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#7A1B2E]" />
          Sesi Aktif
        </h2>

        {activeMeetings.length === 0 ? (
          <div className="border-2 border-[#1A1A1A] bg-white p-8 text-center shadow-[4px_4px_0_#1A1A1A]">
            <p className="font-mono text-sm text-gray-600">
              Belum ada sesi aktif. Jadwal mendatang tampil di bawah kalau ada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMeetings.map((meeting) => {
              const attendance = attendances[meeting.id]
              const startDate = new Date(meeting.starts_at)
              const endDate = new Date(meeting.ends_at)

              return (
                <div
                  key={meeting.id}
                  className="border-2 border-[#1A1A1A] bg-white p-5 shadow-[4px_4px_0_#1A1A1A] flex flex-col justify-between relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] bg-[#FFF3C4] border border-[#1A1A1A] px-2 py-0.5 font-bold uppercase">
                        🟢 SESI AKTIF (WINDOW BUKA)
                      </span>
                      {attendance && (
                        <span className={`font-mono text-[10px] px-2 py-0.5 border border-[#1A1A1A] font-bold uppercase ${
                          attendance.status === 'approved' ? 'bg-[#D1E7DD] text-green-900' : 'bg-[#FFF3C4] text-yellow-900'
                        }`}>
                          STATUS: {attendance.status}
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-lg uppercase font-['Outfit'] text-[#1A1A1A] mb-1">
                      {meeting.title}
                    </h3>

                    {meeting.description && (
                      <p className="text-sm text-gray-700 mb-3 font-['Work_Sans']">
                        {meeting.description}
                      </p>
                    )}

                    <div className="space-y-1 font-mono text-xs text-[#1A1A1A] bg-[#F5F3EF] p-2.5 border border-[#1A1A1A] mb-4">
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

                  <div>
                    {attendance ? (
                      <div className="w-full py-2.5 px-4 bg-[#F5F3EF] border-2 border-[#1A1A1A] text-center font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-[2px_2px_0_#1A1A1A]">
                        <CheckCircle2 className="w-4 h-4 text-green-700" />
                        <span>Sudah Absen ({attendance.status})</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAbsen(meeting.id)}
                        disabled={isPending}
                        className="w-full py-3 px-4 bg-[#7A1B2E] text-white border-2 border-[#1A1A1A] font-bold uppercase font-['Outfit'] text-sm shadow-[3px_3px_0_#1A1A1A] hover:bg-[#A62639] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#1A1A1A] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Absen Sekarang</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Jadwal Mendatang */}
      {upcomingMeetings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-black uppercase font-['Outfit'] border-b-2 border-[#1A1A1A] pb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#7A1B2E]" />
            Jadwal Mendatang
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.map((meeting) => {
              const startDate = new Date(meeting.starts_at)
              return (
                <div
                  key={meeting.id}
                  className="border-2 border-[#1A1A1A] bg-[#F5F3EF] p-5 shadow-[4px_4px_0_#1A1A1A] flex items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="font-black uppercase font-['Outfit'] text-[#1A1A1A]">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-2 font-mono text-xs text-gray-600 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#7A1B2E]" />
                      <span>
                        {startDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
                        {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] bg-white border border-[#1A1A1A] px-2 py-1 font-bold uppercase text-gray-500 shrink-0">
                    Belum Buka
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
