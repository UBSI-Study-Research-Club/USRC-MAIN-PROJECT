
'use client'

import { useEffect, useState, useTransition, Suspense } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Users, ClipboardList, Check, X, Trash2, Loader2, AlertCircle, Plus, CheckCheck, Search, UserPlus } from 'lucide-react'
import { SideSheet } from '@/components/SideSheet'
import { GlidePill, GLIDE } from '@/components/motion/Glide'
import { Select } from '@/components/Select'

type Meeting = {
  id: string
  title: string
  starts_at: string
  ends_at: string
}

type AttendanceDetail = {
  id: string
  meeting_id: string
  user_id: string
  status: 'pending' | 'approved'
  checked_at: string
  profiles: {
    full_name: string
    nim: string
    prodi: string
  } | null
}

type Registration = {
  id: string
  full_name: string
  email: string
  nim: string
  prodi: string
  reason: string | null
  status: string
  created_at: string
}

type Member = {
  id: string
  full_name: string
  nim: string
  prodi: string
  role: 'anggota' | 'sekre' | 'admin'
  created_at: string
  reason: string | null
}

type Tab = 'absen' | 'registrations' | 'members'

function SekretarisDashboardContent() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('')
  const [attendances, setAttendances] = useState<AttendanceDetail[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [loadingAttendances, setLoadingAttendances] = useState(false)
  const [loadingRegs, setLoadingRegs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('absen')
  const reduceMotion = useReducedMotion()
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [memberSearch, setMemberSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creatingMeeting, setCreatingMeeting] = useState(false)
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', start: '16:00', end: '17:30' })

  const supabase = createClient()

  // Buat sesi baru (sekre/admin)
  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim() || !newMeeting.date || !newMeeting.start || !newMeeting.end) {
      alert('Lengkapi judul, tanggal, dan jam mulai/selesai.')
      return
    }
    const starts_at = new Date(`${newMeeting.date}T${newMeeting.start}:00+07:00`)
    const ends_at = new Date(`${newMeeting.date}T${newMeeting.end}:00+07:00`)
    if (isNaN(starts_at.getTime()) || isNaN(ends_at.getTime())) {
      alert('Format tanggal/jam tidak valid.')
      return
    }
    if (ends_at <= starts_at) {
      alert('Jam selesai harus setelah jam mulai.')
      return
    }

    setCreatingMeeting(true)
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        title: newMeeting.title.trim(),
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
      })
      .select('id, title, starts_at, ends_at')
      .single()
    setCreatingMeeting(false)

    if (error) {
      alert('Gagal membuat sesi: ' + error.message)
      return
    }
    setMeetings((prev) => [data, ...prev])
    setSelectedMeetingId(data.id)
    setNewMeeting({ title: '', date: '', start: '16:00', end: '17:30' })
    setShowCreateForm(false)
  }

  // Fetch meetings on mount
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setLoadingMeetings(true)
        const { data, error } = await supabase
          .from('meetings')
          .select('id, title, starts_at, ends_at')
          .order('starts_at', { ascending: false })

        if (error) throw error
        setMeetings(data || [])
        if (data && data.length > 0) {
          setSelectedMeetingId(data[0].id)
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat jadwal.')
      } finally {
        setLoadingMeetings(false)
      }
    }

    const fetchRegistrations = async () => {
      try {
        setLoadingRegs(true)
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (error) throw error
        setRegistrations(data || [])
      } catch (err: any) {
        console.error('Error fetching registrations:', err)
      } finally {
        setLoadingRegs(false)
      }
    }

    const fetchMembers = async () => {
      try {
        setLoadingMembers(true)

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, nim, prodi, role, created_at')
          .order('full_name', { ascending: true })

        if (profilesError) throw profilesError

        const { data: approvedRegs, error: regsError } = await supabase
          .from('registrations')
          .select('nim, reason')
          .eq('status', 'approved')

        if (regsError) throw regsError

        const reasonByNim = new Map((approvedRegs || []).map((r) => [r.nim, r.reason]))

        const merged = (profilesData || []).map((p) => ({
          ...p,
          reason: reasonByNim.get(p.nim) || null,
        }))

        setMembers(merged as Member[])
      } catch (err) {
        console.error('Error fetching members:', err)
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchMeetings()
    fetchRegistrations()
    fetchMembers()

    // Minta izin notification browser jika didukung
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }

    // Realtime: sesi, pendaftar, dan anggota update tanpa refresh.
    const dashboardChannel = supabase
      .channel('sekre-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => fetchMeetings()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        (payload) => {
          fetchRegistrations()
          fetchMembers()
          if (payload.eventType === 'INSERT' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('USRC — Pendaftar baru', {
              body: 'Ada anggota baru yang mendaftar dan menunggu persetujuan sekre!',
              icon: '/favicon.ico',
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchMembers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(dashboardChannel)
    }
  }, [])

  // Fetch attendances when selectedMeetingId changes + Realtime subscription
  useEffect(() => {
    if (!selectedMeetingId) return

    const fetchAttendances = async () => {
      try {
        setLoadingAttendances(true)
        const { data, error } = await supabase
          .from('attendances')
          .select('id, meeting_id, user_id, status, checked_at, profiles(full_name, nim, prodi)')
          .eq('meeting_id', selectedMeetingId)
          .order('checked_at', { ascending: false })

        if (error) throw error
        setAttendances((data as unknown as AttendanceDetail[]) || [])
      } catch (err: any) {
        setError(err.message || 'Gagal memuat daftar absen.')
      } finally {
        setLoadingAttendances(false)
      }
    }

    fetchAttendances()

    // Realtime subscription for attendances of this meeting
    const attChannel = supabase
      .channel(`sekre-attendances-${selectedMeetingId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendances',
          filter: `meeting_id=eq.${selectedMeetingId}`
        },
        () => {
          fetchAttendances()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(attChannel)
    }
  }, [selectedMeetingId])

  // Approve Attendance
  const handleApproveAttendance = async (attId: string) => {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('attendances')
          .update({ status: 'approved' })
          .eq('id', attId)

        if (error) throw error
      } catch (err: any) {
        alert('Gagal menyetujui absen: ' + err.message)
      }
    })
  }

  // Revoke / Delete Attendance
  const handleRevokeAttendance = async (attId: string) => {
    if (!confirm('Yakin ingin menghapus/membatalkan absen ini?')) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('attendances')
          .delete()
          .eq('id', attId)

        if (error) throw error
      } catch (err: any) {
        alert('Gagal menghapus absen: ' + err.message)
      }
    })
  }

  // Approve Registration
  const handleApproveRegistration = async (regId: string) => {
    startTransition(async () => {
      try {
        const { error } = await supabase.rpc('approve_registration', {
          reg_id: regId,
        })

        if (error) throw error

        // Remove from local list
        setRegistrations((prev) => prev.filter((r) => r.id !== regId))
        alert('Pendaftaran disetujui.')
      } catch (err: any) {
        alert('Gagal approve pendaftaran: ' + err.message)
      }
    })
  }

  // Reject Registration
  const handleRejectRegistration = async (regId: string) => {
    if (!confirm('Tolak pendaftaran ini?')) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('registrations')
          .update({ status: 'rejected' })
          .eq('id', regId)

        if (error) throw error

        setRegistrations((prev) => prev.filter((r) => r.id !== regId))
      } catch (err: any) {
        alert('Gagal menolak pendaftaran: ' + err.message)
      }
    })
  }

  // Setujui Semua Absen Pending
  const handleApproveAllAttendance = async () => {
    const pendingAtts = attendances.filter((a) => a.status === 'pending')
    if (pendingAtts.length === 0) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('attendances')
          .update({ status: 'approved' })
          .in('id', pendingAtts.map((a) => a.id))

        if (error) throw error
      } catch (err: any) {
        alert('Gagal menyetujui semua absen: ' + err.message)
      }
    })
  }

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId)
  const approvedCount = attendances.filter((a) => a.status === 'approved').length
  const pendingCount = attendances.length - approvedCount
  const progress = attendances.length ? Math.round((approvedCount / attendances.length) * 100) : 0

  const filteredMembers = members.filter((member) => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return true
    return [member.full_name, member.nim, member.prodi, member.role, member.reason || '']
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  const TABS: { key: Tab; label: string; icon: typeof ClipboardList; count?: number }[] = [
    { key: 'absen', label: 'Absensi', icon: ClipboardList, count: pendingCount || undefined },
    { key: 'registrations', label: 'Pendaftar', icon: UserPlus, count: registrations.length || undefined },
    { key: 'members', label: 'Anggota', icon: Users, count: members.length },
  ]

  return (
    <div className="space-y-6 pb-12 md:space-y-8">
      {/* ── Kepala halaman ── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className={`${FONT_D} text-3xl font-black uppercase leading-none tracking-tight text-dark md:text-4xl`}>Sekretariat</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-dark/70">Validasi absen, terima pendaftar, dan pantau anggota.</p>
        </div>

        {/* Tab */}
        <div role="tablist" aria-label="Menu sekretariat" className="flex w-full border-2 border-dark bg-white p-1 shadow-[3px_3px_0_#1A1A1A] md:w-auto">
          {TABS.map(({ key, label, icon: Icon, count }) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(key)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors duration-200 md:flex-none md:px-4 ${FONT_D} ${
                  active ? 'text-white' : 'text-dark/70 hover:text-dark'
                }`}
              >
                {active && <GlidePill id="sekre-tab" className="bg-maroon" />}
                <Icon className="relative z-10 hidden h-4 w-4 shrink-0 sm:block" />
                <span className="relative z-10">{label}</span>
                {count !== undefined && (
                  <span className={`relative z-10 min-w-5 border px-1 font-mono text-[10px] ${active ? 'border-white/60 text-white' : 'border-dark bg-[#FFF3C4] text-dark'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-3 border-2 border-dark bg-[#F8D7DA] p-4 shadow-[4px_4px_0_#1A1A1A]">
          <AlertCircle className="h-5 w-5 shrink-0 text-maroon" />
          <p className="text-sm font-semibold text-maroon">{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          role="tabpanel"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={GLIDE}
          className="space-y-5"
        >
          {/* ── ABSENSI ── */}
          {activeTab === 'absen' && (
            <>
              {/* Pilih sesi + sesi baru */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  {loadingMeetings ? (
                    <div className="skeleton h-11 w-full" />
                  ) : meetings.length === 0 ? (
                    <p className="border-2 border-dashed border-dark/40 bg-white px-3 py-2.5 text-sm text-dark/60">Belum ada sesi. Buat sesi pertama.</p>
                  ) : (
                    <Select
                      id="meeting-select"
                      aria-label="Pilih sesi"
                      value={selectedMeetingId}
                      onChange={setSelectedMeetingId}
                      searchable={meetings.length > 8}
                      options={meetings.map((m) => ({ value: m.id, label: m.title, hint: fmtDate(m.starts_at) }))}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className={`${FONT_D} inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 border-2 border-dark bg-[#FFF3C4] px-4 text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0_#1A1A1A] transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                  Sesi baru
                </button>
              </div>

              {/* Ringkasan validasi */}
              {selectedMeeting && (
                <div className="border-2 border-dark bg-white p-4 shadow-[4px_4px_0_#1A1A1A] md:p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-dark/70">{selectedMeeting.title} · {fmtDate(selectedMeeting.starts_at)}</p>
                      <p className={`${FONT_D} mt-1 text-2xl font-black text-dark`}>
                        <span className="text-maroon">{approvedCount}</span>
                        <span className="text-dark/40">/{attendances.length}</span>
                        <span className="ml-2 text-sm font-bold uppercase tracking-wide text-dark/60">tervalidasi</span>
                      </p>
                    </div>
                    {pendingCount > 0 && (
                      <button
                        type="button"
                        onClick={handleApproveAllAttendance}
                        disabled={isPending}
                        className={`${FONT_D} inline-flex items-center gap-1.5 border-2 border-dark bg-maroon px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0_#1A1A1A] transition-all hover:bg-hot active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60`}
                      >
                        <CheckCheck className="h-4 w-4" />
                        Setujui semua ({pendingCount})
                      </button>
                    )}
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden border-2 border-dark bg-paper">
                    <motion.div className="h-full bg-maroon" initial={false} animate={{ width: `${progress}%` }} transition={GLIDE} />
                  </div>
                </div>
              )}

              {/* Daftar hadir */}
              {loadingAttendances ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}
                </div>
              ) : selectedMeeting && attendances.length === 0 ? (
                <EmptyState icon={ClipboardList} text="Belum ada yang absen di sesi ini." />
              ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {attendances.map((att) => (
                    <li key={att.id} className="flex min-w-0 items-center gap-3 border-2 border-dark bg-white p-3 shadow-[3px_3px_0_#1A1A1A]">
                      <Initials name={att.profiles?.full_name || '?'} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-dark">{att.profiles?.full_name || 'Tanpa profil'}</p>
                        <p className="truncate font-mono text-[11px] text-dark/60">
                          {att.profiles?.nim || '-'} · {att.profiles?.prodi || '-'} · {fmtTime(att.checked_at)}
                        </p>
                      </div>
                      <StatusPill approved={att.status === 'approved'} />
                      <div className="flex shrink-0 gap-1.5">
                        {att.status === 'pending' && (
                          <IconBtn label="Setujui" tone="ok" onClick={() => handleApproveAttendance(att.id)} disabled={isPending}>
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </IconBtn>
                        )}
                        <IconBtn label="Hapus absen" tone="danger" onClick={() => handleRevokeAttendance(att.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ── PENDAFTAR ── */}
          {activeTab === 'registrations' && (
            loadingRegs ? (
              <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-28 w-full" />)}</div>
            ) : registrations.length === 0 ? (
              <EmptyState icon={UserPlus} text="Tidak ada pendaftar yang menunggu." />
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {registrations.map((reg) => (
                  <li key={reg.id} className="flex min-w-0 flex-col border-2 border-dark bg-white shadow-[4px_4px_0_#1A1A1A]">
                    <div className="flex items-start gap-3 p-4">
                      <Initials name={reg.full_name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-tight text-dark">{reg.full_name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-dark/60">{reg.nim} · {reg.prodi}</p>
                        <p className="truncate font-mono text-[11px] text-dark/50">{reg.email}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-dark/45">{fmtDate(reg.created_at)}</span>
                    </div>
                    {reg.reason && (
                      <p className="mx-4 mb-4 border-l-4 border-maroon bg-[#FFF9DC] px-3 py-2 text-sm text-dark/85">{reg.reason}</p>
                    )}
                    <div className="mt-auto grid grid-cols-2 border-t-2 border-dark">
                      <button
                        type="button"
                        onClick={() => handleRejectRegistration(reg.id)}
                        disabled={isPending}
                        className={`${FONT_D} inline-flex items-center justify-center gap-1.5 border-r-2 border-dark py-2.5 text-xs font-black uppercase tracking-wider text-dark transition-colors hover:bg-[#F8D7DA] disabled:opacity-60`}
                      >
                        <X className="h-4 w-4" strokeWidth={3} />
                        Tolak
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveRegistration(reg.id)}
                        disabled={isPending}
                        className={`${FONT_D} inline-flex items-center justify-center gap-1.5 bg-maroon py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-hot disabled:opacity-60`}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                        Terima
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* ── ANGGOTA ── */}
          {activeTab === 'members' && (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark/40" />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari nama, NIM, atau prodi"
                  className="w-full border-2 border-dark bg-white py-2.5 pl-9 pr-3 text-sm text-dark placeholder-dark/40 transition-shadow focus:shadow-[4px_4px_0_#7A1B2E] focus:outline-none md:max-w-md"
                />
              </div>
              {loadingMembers ? (
                <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
              ) : filteredMembers.length === 0 ? (
                <EmptyState icon={Users} text={memberSearch ? 'Tidak ada anggota yang cocok.' : 'Belum ada anggota.'} />
              ) : (
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredMembers.map((member) => (
                    <li key={member.id} className="flex min-w-0 gap-3 border-2 border-dark bg-white p-3 shadow-[3px_3px_0_#1A1A1A]">
                      <Initials name={member.full_name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-bold leading-tight text-dark">{member.full_name}</p>
                          <span className={`shrink-0 border border-dark px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${member.role === 'anggota' ? 'bg-white' : 'bg-[#FFF3C4]'}`}>
                            {member.role}
                          </span>
                        </div>
                        <p className="truncate font-mono text-[11px] text-dark/60">{member.nim} · {member.prodi}</p>
                        {member.reason && <p className="mt-1.5 line-clamp-2 text-xs text-dark/65">{member.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Panel buat sesi ── */}
      <SideSheet
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        label="Sesi baru"
        width="sm:w-[min(460px,92vw)]"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className={`${FONT_D} border-2 border-dark bg-white px-5 py-2.5 text-sm font-black uppercase tracking-wide text-dark shadow-[3px_3px_0_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
            >
              Batal
            </button>
            <button
              type="submit"
              form="create-meeting"
              disabled={creatingMeeting}
              className={`${FONT_D} inline-flex items-center gap-2 border-2 border-dark bg-maroon px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_#1A1A1A] transition-colors hover:bg-hot active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60`}
            >
              {creatingMeeting && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan sesi
            </button>
          </div>
        }
      >
        <form id="create-meeting" onSubmit={(e) => { e.preventDefault(); handleCreateMeeting() }} className="space-y-4 p-4 sm:p-6">
          <SheetField label="Judul sesi">
            <input
              type="text"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting((s) => ({ ...s, title: e.target.value }))}
              placeholder="Kumpul Study #5"
              className={FIELD}
            />
          </SheetField>
          <SheetField label="Tanggal">
            <input type="date" value={newMeeting.date} onChange={(e) => setNewMeeting((s) => ({ ...s, date: e.target.value }))} className={FIELD} />
          </SheetField>
          <div className="grid grid-cols-2 gap-3">
            <SheetField label="Mulai">
              <input type="time" value={newMeeting.start} onChange={(e) => setNewMeeting((s) => ({ ...s, start: e.target.value }))} className={FIELD} />
            </SheetField>
            <SheetField label="Selesai">
              <input type="time" value={newMeeting.end} onChange={(e) => setNewMeeting((s) => ({ ...s, end: e.target.value }))} className={FIELD} />
            </SheetField>
          </div>
          <p className="border-l-4 border-maroon bg-paper px-3 py-2 text-xs leading-relaxed text-dark/70">
            Jam dalam WIB. Absen otomatis dibuka 30 menit sebelum sesi mulai sampai sesi selesai.
          </p>
        </form>
      </SideSheet>
    </div>
  )
}

// ── Komponen kecil ──
const FONT_D = 'font-[family-name:var(--font-outfit)]'
const FIELD =
  'w-full border-2 border-dark bg-white px-3 py-2.5 text-sm text-dark placeholder-dark/40 transition-shadow focus:shadow-[4px_4px_0_#7A1B2E] focus:outline-none'
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Pontianak' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Pontianak' })

function Initials({ name }: { name: string }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
  return (
    <span className={`${FONT_D} grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-dark bg-[#FCE9ED] text-sm font-black text-maroon`}>
      {ini}
    </span>
  )
}

function StatusPill({ approved }: { approved: boolean }) {
  return (
    <span className={`hidden shrink-0 border border-dark px-2 py-0.5 font-mono text-[10px] font-bold uppercase sm:inline-block ${approved ? 'bg-[#D1E7DD] text-green-900' : 'bg-[#FFF3C4] text-amber-900'}`}>
      {approved ? 'Hadir' : 'Pending'}
    </span>
  )
}

function IconBtn({ label, tone, onClick, disabled, children }: { label: string; tone: 'ok' | 'danger'; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 place-items-center border-2 border-dark shadow-[2px_2px_0_#1A1A1A] transition-[transform,box-shadow,background-color] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${
        tone === 'ok' ? 'bg-[#D1E7DD] text-green-900 hover:bg-[#b9dcc8]' : 'bg-[#F8D7DA] text-maroon hover:bg-[#f1bfc4]'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 border-2 border-dashed border-dark/40 bg-white px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-dark/25" />
      <p className="text-sm text-dark/60">{text}</p>
    </div>
  )
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-dark/70">{label}</span>
      {children}
    </label>
  )
}

export default function SekretarisDashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" /></div>}>
      <SekretarisDashboardContent />
    </Suspense>
  )
}
