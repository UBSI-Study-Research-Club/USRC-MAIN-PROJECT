'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, AlertCircle, Loader2, Search, History, Check, X, Hourglass } from 'lucide-react'
import { motion } from 'framer-motion'
import { GLIDE } from '@/components/motion/Glide'
import { AbsenSkeleton, GhostScreen, type Meeting, type Attendance } from '../shared'

const PAGE_SIZE = 10

// Cache data terakhir — lihat catatan di halaman Sesi Aktif.
const cache: { meetings?: Meeting[]; total?: number; att?: Record<string, Attendance> } = {}

function RiwayatContent() {
  const [meetings, setMeetings] = useState<Meeting[]>(cache.meetings ?? [])
  const [total, setTotal] = useState(cache.total ?? 0)
  const [attendances, setAttendances] = useState<Record<string, Attendance>>(cache.att ?? {})
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(!cache.meetings)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [ghost, setGhost] = useState(false)

  const supabase = createClient()

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

      const { data: meetingsData, count, error: meetErr } = await supabase
        .from('meetings')
        .select('*', { count: 'exact' })
        .lt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: false })
        .range(0, visible - 1)

      if (meetErr) throw meetErr
      cache.meetings = meetingsData || []
      cache.total = count || 0
      setMeetings(cache.meetings)
      setTotal(cache.total)

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
  const pendingCount = Object.values(attendances).filter(a => a.status === 'pending').length
  const counts = { approved: hadirCount, pending: pendingCount, alpa: Math.max(0, totalHistoris - hadirCount - pendingCount) }

  if (loading) {
    return <AbsenSkeleton />
  }

  if (ghost) {
    return <GhostScreen />
  }

  return (
    <div className="space-y-8">


      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[4px_4px_0_#1A1A1A] flex items-center gap-3 text-[#1A1A1A]">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      {/* Ringkasan kehadiran */}
      <div className="grid grid-cols-1 border-2 border-[#1A1A1A] bg-white shadow-[6px_6px_0_#1A1A1A] sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="p-5 sm:p-6">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]/60">Kehadiran kamu</p>
          <div className="mt-1 flex items-baseline gap-3">
            <b className="font-[family-name:var(--font-outfit)] text-5xl font-black leading-none text-[#7A1B2E]">
              {hadirCount}<small className="text-2xl text-[#1A1A1A]/70">/{totalHistoris}</small>
            </b>
            <span className="font-mono text-sm font-bold text-[#1A1A1A]">{rate}%</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden border-2 border-[#1A1A1A] bg-white">
            <motion.div
              className="h-full bg-[#7A1B2E]"
              initial={{ width: 0 }}
              animate={{ width: `${rate}%` }}
              transition={{ ...GLIDE, duration: 0.9, delay: 0.1 }}
            />
          </div>
        </div>
        <dl className="grid grid-cols-3 border-t-2 border-[#1A1A1A] sm:grid-cols-1 sm:border-l-2 sm:border-t-0">
          {[
            { label: 'Hadir', val: counts.approved, cls: 'text-green-800' },
            { label: 'Pending', val: counts.pending, cls: 'text-amber-800' },
            { label: 'Absen', val: counts.alpa, cls: 'text-[#1A1A1A]/60' },
          ].map((c, i) => (
            <div key={c.label} className={`flex flex-col items-center justify-center px-5 py-3 sm:flex-row sm:justify-between sm:gap-6 ${i > 0 ? 'border-l-2 border-dashed border-[#1A1A1A] sm:border-l-0 sm:border-t-2' : ''}`}>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/60">{c.label}</dt>
              <dd className={`font-[family-name:var(--font-outfit)] text-2xl font-black ${c.cls}`}>{c.val}</dd>
            </div>
          ))}
        </dl>
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
          <h2 className="text-xl font-black uppercase font-[family-name:var(--font-outfit)] tracking-wide text-[#1A1A1A]">
            Sesi sebelumnya
          </h2>
          <span className="font-mono text-xs font-bold text-[#1A1A1A]/50">{filtered.length} sesi</span>
        </div>

        {filtered.length === 0 ? (
          <div className="border-2 border-[#1A1A1A] bg-white p-10 text-center shadow-[6px_6px_0_#1A1A1A]">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-mono text-xs uppercase text-gray-500 font-bold">
              {search ? 'Tidak ada sesi yang cocok.' : 'Belum ada sesi sebelumnya.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((meeting, idx) => {
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
                { label: 'Tidak hadir', cls: 'bg-gray-100 text-gray-600', icon: X }

              const BadgeIcon = badgeConfig.icon

              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...GLIDE, delay: Math.min(idx * 0.05, 0.3) }}
                  className="grid grid-cols-[64px_1fr] items-stretch overflow-hidden border-2 border-[#1A1A1A] bg-white shadow-[4px_4px_0_#1A1A1A] transition-[transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#7A1B2E] sm:grid-cols-[84px_1fr_auto]"
                >
                  {/* Tanggal */}
                  <div className="flex flex-col items-center justify-center border-r-2 border-dashed border-[#1A1A1A] bg-[#F5F3EF] p-2 text-center">
                    <b className="font-[family-name:var(--font-outfit)] text-2xl font-black leading-none text-[#7A1B2E] sm:text-3xl">{dayNum}</b>
                    <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]">{monthStr}</span>
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-col justify-center gap-1.5 p-3.5 sm:p-5">
                    <h3 className="line-clamp-2 font-[family-name:var(--font-outfit)] text-base font-black uppercase leading-tight text-[#1A1A1A] sm:text-lg">
                      {meeting.title}
                    </h3>
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-[#1A1A1A]/65">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-[#7A1B2E]" />
                      {startDate.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'Asia/Pontianak' })},{' '}
                      {startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })}–{endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })}
                    </p>
                    <span className={`inline-flex w-fit items-center gap-1.5 border-2 border-[#1A1A1A] px-2 py-0.5 font-mono text-[10px] font-bold uppercase sm:hidden ${badgeConfig.cls}`}>
                      <BadgeIcon className="h-3 w-3" />
                      {badgeConfig.label}
                    </span>
                  </div>

                  {/* Status (desktop) */}
                  <div className="hidden items-center px-5 sm:flex">
                    <span className={`inline-flex items-center gap-1.5 border-2 border-[#1A1A1A] px-3 py-1.5 font-mono text-xs font-bold uppercase ${badgeConfig.cls}`}>
                      <BadgeIcon className="h-3.5 w-3.5" />
                      {badgeConfig.label}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Load More */}
        {!search && meetings.length < total && (
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="w-full py-3 px-4 bg-white text-[#1A1A1A] border-2 border-[#1A1A1A] font-bold uppercase font-[family-name:var(--font-outfit)] shadow-[3px_3px_0_#1A1A1A] hover:bg-[#7A1B2E] hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
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
