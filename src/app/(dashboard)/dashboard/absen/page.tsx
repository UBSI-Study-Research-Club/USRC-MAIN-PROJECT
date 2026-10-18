'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'
import { GLIDE } from '@/components/motion/Glide'
import { ActiveMeetingCard } from './ActiveMeetingCard'
import { Calendar, CheckCircle2, AlertCircle, Loader2, Ticket } from 'lucide-react'
import { AbsenSkeleton, isWithinWindow, GhostScreen, type Meeting, type Attendance } from './shared'

// Cache data terakhir: saat pindah tab, halaman langsung tampil tanpa spinner
// lalu diperbarui diam-diam di belakang (stale-while-revalidate).
const cache: { active?: Meeting[]; upcoming?: Meeting[]; att?: Record<string, Attendance> } = {}

function SesiAktifContent() {
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>(cache.active ?? [])
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>(cache.upcoming ?? [])
  const [attendances, setAttendances] = useState<Record<string, Attendance>>(cache.att ?? {})
  const [loading, setLoading] = useState(!cache.active)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [ghost, setGhost] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  const supabase = createClient()

  // Notifikasi sukses hilang sendiri setelah beberapa detik
  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(null), 4500)
    return () => clearTimeout(t)
  }, [successMsg])

  // Clock ticker for progress window
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = async () => {
    try {
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
      cache.active = all.filter((m) => isWithinWindow(m.starts_at, m.ends_at))
      cache.upcoming = all.filter((m) => new Date(m.starts_at).getTime() > nowIso)
      setActiveMeetings(cache.active)
      setUpcomingMeetings(cache.upcoming)

      const { data: attData, error: attErr } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)

      if (attErr) throw attErr

      const attMap: Record<string, Attendance> = {}
      attData?.forEach((att) => {
        attMap[att.meeting_id] = att
      })
      cache.att = attMap
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
    setSendingId(meetingId)
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

        // Optimistis: stempel langsung jatuh tanpa menunggu refetch
        setAttendances((prev) => {
          const next = {
            ...prev,
            [meetingId]: { id: `local-${meetingId}`, meeting_id: meetingId, user_id: userId, status: 'pending' as const, checked_at: new Date().toISOString() },
          }
          cache.att = next
          return next
        })
        setSuccessMsg('Absen terkirim. Tinggal tunggu dicek sekretaris.')
        fetchData()
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat absen.')
      } finally {
        setSendingId(null)
      }
    })
  }

  if (loading) {
    return <AbsenSkeleton />
  }

  if (ghost) {
    return <GhostScreen />
  }

  return (
    <div className="space-y-8">
      {/* SVG filter for rough stamp texture */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/>
        </filter>
      </svg>


      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[4px_4px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      <AnimatePresence>
        {successMsg && (
          <motion.div
            key="toast"
            role="status"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={GLIDE}
            className="flex items-center gap-3 border-2 border-[#1A1A1A] bg-[#D1E7DD] p-4 text-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-800" />
            <p className="font-mono text-sm font-bold">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sesi Aktif */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 bg-[#7A1B2E] border-2 border-[#1A1A1A]" />
          <h2 className="text-xl font-black uppercase font-[family-name:var(--font-outfit)] tracking-wide text-[#1A1A1A]">
            Sedang berlangsung
          </h2>
          <span className="font-mono text-xs font-bold text-[#1A1A1A]/50">{activeMeetings.length} sesi</span>
        </div>

        {activeMeetings.length === 0 ? (
          <div className="border-2 border-[#1A1A1A] bg-white p-12 text-center shadow-[6px_6px_0_#1A1A1A] flex flex-col items-center justify-center gap-3">
            <Ticket className="w-12 h-12 text-[#7A1B2E]" />
            <h3 className="text-xl font-black uppercase font-[family-name:var(--font-outfit)]">Belum ada sesi berlangsung</h3>
            <p className="text-sm text-[#1A1A1A]/60 max-w-sm">
              Absen akan muncul di sini saat sesi dibuka. Kehadiranmu sebelumnya ada di tab Riwayat.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeMeetings.map((meeting) => (
              <ActiveMeetingCard
                key={meeting.id}
                meeting={meeting}
                attendance={attendances[meeting.id]}
                now={currentTime}
                sending={sendingId === meeting.id}
                onAbsen={() => handleAbsen(meeting.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Jadwal Mendatang */}
      {upcomingMeetings.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-amber-400 border-2 border-[#1A1A1A]" />
            <h2 className="text-xl font-black uppercase font-[family-name:var(--font-outfit)] tracking-wide text-[#1A1A1A]">
              Jadwal berikutnya
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
                    <h3 className="font-black uppercase font-[family-name:var(--font-outfit)] text-sm text-[#1A1A1A]">
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
                    Segera
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
