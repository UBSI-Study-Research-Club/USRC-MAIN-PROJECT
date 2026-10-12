
'use client'

import { useEffect, useState, useTransition, Suspense } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Users, ClipboardList, Check, X, Trash2, Calendar, Loader2, AlertCircle, Plus, CheckCheck } from 'lucide-react'

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

function SekretarisDashboardContent() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('')
  const [attendances, setAttendances] = useState<AttendanceDetail[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [loadingAttendances, setLoadingAttendances] = useState(false)
  const [loadingRegs, setLoadingRegs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'absen' | 'registrations' | 'members'>('absen')
  const [animatingTab, setAnimatingTab] = useState<'absen' | 'registrations' | 'members' | null>(null)
  const reduceMotion = useReducedMotion()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const handleTabChange = (newTab: 'absen' | 'registrations' | 'members') => {
    if (newTab === activeTab) return
    if (!reduceMotion) setAnimatingTab(activeTab)
    setActiveTab(newTab)
  }
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

    // Realtime subscriptions for registrations
    const regChannel = supabase
      .channel('sekre-registrations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => {
          fetchRegistrations()
          fetchMembers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(regChannel)
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

  // Tab Colors for Physical Paper Stack
  const TAB_COLORS: Record<'absen' | 'registrations' | 'members', string> = {
    absen: '#FFFFFF',
    registrations: '#FFF9DC',
    members: '#FCE9ED',
  }

  // Synchronized Deck Order:
  // - members (pink): middle = registrations (kuning), back = absen (putih)
  // - absen (putih): middle = registrations (kuning), back = members (pink)
  // - registrations (kuning): middle = members (pink), back = absen (putih)
  const stackDeckByTab: Record<
    'absen' | 'registrations' | 'members',
    {
      front: 'absen' | 'registrations' | 'members'
      middle: 'absen' | 'registrations' | 'members'
      back: 'absen' | 'registrations' | 'members'
    }
  > = {
    absen: {
      front: 'absen',
      middle: 'registrations',
      back: 'members',
    },
    registrations: {
      front: 'registrations',
      middle: 'members',
      back: 'absen',
    },
    members: {
      front: 'members',
      middle: 'registrations',
      back: 'absen',
    },
  }

  const currentDeck = stackDeckByTab[activeTab]
  const frontSheetColor = TAB_COLORS[currentDeck.front]
  const middleSheetColor = TAB_COLORS[currentDeck.middle]
  const backSheetColor = TAB_COLORS[currentDeck.back]

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId)
  const approvedCount = attendances.filter((a) => a.status === 'approved').length

  const filteredMembers = members.filter((member) => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return true

    return [
      member.full_name,
      member.nim,
      member.prodi,
      member.role,
      member.reason || '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* ── 1. Hero Card (Neobrutalist) ── */}
      <section className="relative border-2 border-[#1A1A1A] bg-white p-6 md:p-8 shadow-[6px_6px_0_#1A1A1A]">
        <span className="absolute -top-[2px] -right-[2px] border-2 border-[#1A1A1A] bg-[#FFF3C4] px-3 py-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A]">
          // SEKRETARIAT &amp; ADMIN
        </span>
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#7A1B2E]">
          Dashboard Sekretaris
        </h1>
        <p className="mt-2 max-w-2xl font-['Work_Sans'] text-sm md:text-base leading-relaxed text-[#1A1A1A]/80">
          Validasi kehadiran anggota secara <span className="font-bold underline text-[#1A1A1A]">realtime</span> per sesi pertemuan, serta kelola antrian pendaftaran anggota baru USRC.
        </p>
      </section>

      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[4px_4px_0_#1A1A1A] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono text-[#7A1B2E]">{error}</p>
        </div>
      )}

      {/* ── 2. Tab Numpuk & Tumpukan Kertas ── */}
      <div className="relative">
        {/* Tab Buttons (Overlapping Stack) */}
        <div
          role="tablist"
          aria-label="Menu dashboard sekretaris"
          className="relative z-20 flex items-end overflow-x-auto pb-0 -mb-[2px] px-1 scrollbar-none"
        >
          {/* Tab 0: Absen */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'absen'}
            onClick={() => handleTabChange('absen')}
            className={`group relative inline-flex items-center gap-2 border-2 border-[#1A1A1A] border-b-0 px-4 md:px-6 py-2.5 md:py-3 font-[family-name:var(--font-outfit)] text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'absen'
                ? 'z-30 bg-[#7A1B2E] text-white pt-3.5 md:pt-4 pb-3 shadow-[3px_0_0_#1A1A1A]'
                : 'z-10 bg-white text-[#1A1A1A] hover:-translate-y-1 shadow-[2px_0_0_#1A1A1A]'
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span>Absensi realtime</span>
          </button>

          {/* Tab 1: Antrian */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'registrations'}
            onClick={() => handleTabChange('registrations')}
            className={`group relative -ml-3.5 inline-flex items-center gap-2 border-2 border-[#1A1A1A] border-b-0 px-4 md:px-6 py-2.5 md:py-3 font-[family-name:var(--font-outfit)] text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'registrations'
                ? 'z-30 bg-[#7A1B2E] text-white pt-3.5 md:pt-4 pb-3 shadow-[3px_0_0_#1A1A1A]'
                : 'z-[9] bg-[#FFF9DC] text-[#1A1A1A] hover:-translate-y-1 shadow-[2px_0_0_#1A1A1A]'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Antrian pendaftar</span>
            {registrations.length > 0 && (
              <span className="border border-[#1A1A1A] bg-[#FFF3C4] px-1.5 py-0.2 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold text-[#1A1A1A]">
                {registrations.length}
              </span>
            )}
          </button>

          {/* Tab 2: Anggota */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'members'}
            onClick={() => handleTabChange('members')}
            className={`group relative -ml-3.5 inline-flex items-center gap-2 border-2 border-[#1A1A1A] border-b-0 px-4 md:px-6 py-2.5 md:py-3 font-[family-name:var(--font-outfit)] text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'z-30 bg-[#7A1B2E] text-white pt-3.5 md:pt-4 pb-3 shadow-[3px_0_0_#1A1A1A]'
                : 'z-[8] bg-[#FCE9ED] text-[#1A1A1A] hover:-translate-y-1 shadow-[2px_0_0_#1A1A1A]'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Anggota</span>
            <span className="border border-[#1A1A1A] bg-[#FFF3C4] px-1.5 py-0.2 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold text-[#1A1A1A]">
              {members.length}
            </span>
          </button>
        </div>

        {/* Tumpukan Kertas (Physical Paper Stack Deck) */}
        <div className="relative mr-3 md:mr-6">
          {/* Layer 2 (Paling belakang — offset 16px tilt -0.9deg) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] transition-colors duration-500 ease-out"
            style={{
              backgroundColor: backSheetColor,
              transform: 'translate(16px, 16px) rotate(-0.9deg)',
              zIndex: 1,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 27px, rgba(26,26,26,0.06) 27px 28px)',
            }}
          />

          {/* Layer 1 (Tengah / Di bawahnya — offset 8px tilt 0.9deg) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] transition-colors duration-500 ease-out"
            style={{
              backgroundColor: middleSheetColor,
              transform: 'translate(8px, 8px) rotate(0.9deg)',
              zIndex: 2,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 27px, rgba(26,26,26,0.06) 27px 28px)',
            }}
          />

          {/* Animasi Kertas Dicabut & Meluncur ke Belakang Tumpukan */}
          <AnimatePresence>
            {!reduceMotion && animatingTab && (
              <motion.div
                key={`shuffle-${animatingTab}`}
                initial={{ x: 0, y: 0, rotate: 0, zIndex: 40, opacity: 1 }}
                animate={isMobile ? {
                  x: [0, 24, 8],
                  y: [0, -12, 8],
                  rotate: [0, 4, -0.9],
                  zIndex: [40, 40, 1],
                  opacity: [1, 1, 0],
                } : {
                  x: [0, 75, 16],
                  y: [0, -32, 16],
                  rotate: [0, 5, -0.9],
                  zIndex: [40, 40, 1],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 0.52,
                  times: [0, 0.42, 1],
                  ease: [0.25, 0.9, 0.3, 1.15],
                }}
                onAnimationComplete={() => setAnimatingTab(null)}
                className="absolute inset-0 pointer-events-none border-2 border-[#1A1A1A] shadow-[5px_5px_0_#1A1A1A]"
                style={{
                  backgroundColor: TAB_COLORS[animatingTab],
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent 0 27px, rgba(26,26,26,0.06) 27px 28px)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Layer 0 (Kertas Depan / Konten Aktif) */}
          <motion.section
            key={activeTab}
            initial={reduceMotion ? false : { opacity: 0.85, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="tabpanel"
            className="relative z-10 border-2 border-[#1A1A1A] p-5 md:p-8 shadow-[6px_6px_0_#7A1B2E] transition-colors duration-300"
            style={{ backgroundColor: frontSheetColor }}
          >
            {/* Tab Content: Absen */}
            {activeTab === 'absen' && (
              <div className="space-y-6">
                {/* Header Sheet Absen */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-dashed border-[#1A1A1A]/30 pb-5">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] text-xl md:text-2xl font-black uppercase text-[#1A1A1A]">
                      Absensi — <span className="text-[#7A1B2E]">{approvedCount}/{attendances.length}</span> tervalidasi
                    </h2>
                    <p className="mt-1 font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase text-[#1A1A1A]/70">
                      // Sesi aktif: {selectedMeeting ? selectedMeeting.title : 'Belum pilih sesi'} · validasi kehadiran
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {attendances.some((a) => a.status === 'pending') && (
                      <button
                        type="button"
                        onClick={handleApproveAllAttendance}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 border-2 border-[#1A1A1A] bg-[#7A1B2E] px-4 py-2 font-[family-name:var(--font-outfit)] text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0_#1A1A1A] hover:bg-[#A62639] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Setujui Semua</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCreateForm((v) => !v)}
                      className="inline-flex items-center gap-1.5 border-2 border-[#1A1A1A] bg-[#FFF3C4] px-4 py-2 font-[family-name:var(--font-outfit)] text-xs font-bold uppercase tracking-wider text-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] hover:bg-[#7A1B2E] hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{showCreateForm ? 'Tutup Form' : 'Buat Sesi'}</span>
                    </button>
                  </div>
                </div>

                {/* Buat Sesi */}
          <div className="border-2 border-[#1A1A1A] bg-white p-4 shadow-[3px_3px_0_#1A1A1A]">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs uppercase font-bold text-[#1A1A1A]">
                Sesi belum ada? Bikin dulu.
              </p>
              <button
                onClick={() => setShowCreateForm((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold uppercase shadow-[2px_2px_0_#1A1A1A] bg-[#FFF3C4] hover:bg-[#7A1B2E] hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Buat Sesi
              </button>
            </div>

            {showCreateForm && (
              <form
                onSubmit={(e) => { e.preventDefault(); handleCreateMeeting() }}
                className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end border-t-2 border-dashed border-[#1A1A1A]/30 pt-4"
              >
                <div className="md:col-span-2">
                  <label className="block font-mono text-[10px] uppercase font-bold mb-1">Judul Sesi</label>
                  <input
                    type="text"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Kumpul Study #5"
                    className="w-full border-2 border-[#1A1A1A] p-2 bg-[#F5F3EF] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold mb-1">Tanggal (WIB)</label>
                  <input
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting((s) => ({ ...s, date: e.target.value }))}
                    className="w-full border-2 border-[#1A1A1A] p-2 bg-[#F5F3EF] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold mb-1">Mulai</label>
                  <input
                    type="time"
                    value={newMeeting.start}
                    onChange={(e) => setNewMeeting((s) => ({ ...s, start: e.target.value }))}
                    className="w-full border-2 border-[#1A1A1A] p-2 bg-[#F5F3EF] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E]"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold mb-1">Selesai</label>
                  <input
                    type="time"
                    value={newMeeting.end}
                    onChange={(e) => setNewMeeting((s) => ({ ...s, end: e.target.value }))}
                    className="w-full border-2 border-[#1A1A1A] p-2 bg-[#F5F3EF] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingMeeting}
                  className="w-full px-3 py-2 border-2 border-[#1A1A1A] text-xs font-bold uppercase shadow-[2px_2px_0_#1A1A1A] bg-[#7A1B2E] text-white hover:bg-[#5d1524] transition-colors disabled:opacity-50"
                >
                  {creatingMeeting ? 'Menyimpan...' : 'Simpan Sesi'}
                </button>
                <p className="md:col-span-6 font-mono text-[10px] text-gray-500">
                  // Jam pakai WIB. Absen terbuka otomatis 30 menit sebelum sesi mulai sampai sesi selesai.
                </p>
              </form>
            )}
          </div>

          {/* Meeting Selector */}
          <div className="border-2 border-[#1A1A1A] bg-white p-4 shadow-[3px_3px_0_#1A1A1A] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Calendar className="w-5 h-5 text-[#7A1B2E] shrink-0" />
              <label htmlFor="meeting-select" className="font-bold text-xs uppercase font-mono">Pilih Sesi:</label>
            </div>
            
            {loadingMeetings ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#7A1B2E]" />
            ) : meetings.length === 0 ? (
              <p className="text-xs font-mono text-gray-500">Belum ada sesi tersedia.</p>
            ) : (
              <select
                id="meeting-select"
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="w-full md:w-96 border-2 border-[#1A1A1A] p-2 bg-[#F5F3EF] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E]"
              >
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({new Date(m.starts_at).toLocaleDateString('id-ID')})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Attendances Table */}
          <div className="border-2 border-[#1A1A1A] bg-white shadow-[4px_4px_0_#1A1A1A] overflow-hidden">
            <div className="p-4 bg-[#F5F3EF] border-b-2 border-[#1A1A1A] flex justify-between items-center">
              <h3 className="font-black uppercase font-['Outfit'] text-sm">
                Daftar Hadir Sesi ({attendances.length} Anggota)
              </h3>
              <span className="font-mono text-[10px] bg-[#D1E7DD] border border-[#1A1A1A] px-2 py-0.5 font-bold">
                ⚡️ LIVE SYNC (SUPABASE REALTIME)
              </span>
            </div>

            {loadingAttendances ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#7A1B2E]" />
              </div>
            ) : attendances.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-gray-500">
                Belum ada anggota yang melakukan absen pada sesi ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#1A1A1A] font-mono text-xs bg-[#F5F3EF]">
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Nama Lengkap</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">NIM</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Prodi</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Waktu Absen</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Status</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="font-['Work_Sans'] text-sm">
                    {attendances.map((att) => (
                      <tr key={att.id} className="border-b border-[#1A1A1A] hover:bg-gray-50">
                        <td className="p-3 border-r-2 border-[#1A1A1A] font-bold">
                          {att.profiles?.full_name || 'Tanpa Profil'}
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] font-mono text-xs">
                          {att.profiles?.nim || '-'}
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] text-xs">
                          {att.profiles?.prodi || '-'}
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] font-mono text-xs">
                          {new Date(att.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A]">
                          <span className={`inline-block font-mono text-[10px] px-2 py-0.5 border border-[#1A1A1A] font-bold uppercase ${
                            att.status === 'approved' ? 'bg-[#D1E7DD] text-green-900' : 'bg-[#FFF3C4] text-yellow-900'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-2">
                          {att.status === 'pending' && (
                            <button
                              onClick={() => handleApproveAttendance(att.id)}
                              disabled={isPending}
                              title="Setujui Absen"
                              className="px-2 py-1 bg-[#D1E7DD] border border-[#1A1A1A] font-mono text-xs font-bold hover:bg-green-300 transition-colors shadow-[1px_1px_0_#1A1A1A]"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleRevokeAttendance(att.id)}
                            disabled={isPending}
                            title="Hapus Absen"
                            className="p-1 bg-[#F8D7DA] border border-[#1A1A1A] text-[#7A1B2E] hover:bg-red-300 transition-colors shadow-[1px_1px_0_#1A1A1A]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

            {/* Tab Content: Registrations */}
            {activeTab === 'registrations' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b-2 border-dashed border-[#1A1A1A]/30 pb-4">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] text-xl md:text-2xl font-black uppercase text-[#1A1A1A]">
                      Antrian Pendaftar ({registrations.length})
                    </h2>
                    <p className="mt-1 font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase text-[#1A1A1A]/70">
                      // Terima atau tolak calon anggota baru
                    </p>
                  </div>
                  <span className="border-2 border-[#1A1A1A] bg-[#FFF3C4] px-2.5 py-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-black uppercase tracking-wider text-[#1A1A1A] self-start md:self-auto shadow-[2px_2px_0_#1A1A1A]">
                    PENDING APPROVAL
                  </span>
                </div>

                {loadingRegs ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#7A1B2E]" />
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#1A1A1A] font-mono text-xs text-gray-500 bg-white">
                    // Antrian kosong. Semua pendaftar sudah diproses.
                  </div>
                ) : (
                  <ul className="border-2 border-[#1A1A1A] bg-white divide-y-2 divide-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A]">
                    {registrations.map((reg) => (
                      <li key={reg.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="font-bold text-base text-[#1A1A1A]">{reg.full_name}</span>
                            <span className="font-mono text-xs font-bold bg-[#F5F3EF] border border-[#1A1A1A] px-2 py-0.5">
                              {reg.nim}
                            </span>
                            <span className="text-xs font-bold text-[#7A1B2E]">
                              {reg.prodi}
                            </span>
                            <span className="font-mono text-xs text-gray-500">
                              · {reg.email}
                            </span>
                          </div>
                          {reg.reason && (
                            <p className="font-['Work_Sans'] text-sm italic text-[#1A1A1A]/85 mt-2 bg-[#FFF9DC] p-2.5 border border-dashed border-[#1A1A1A]/40">
                              “{reg.reason}”
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRejectRegistration(reg.id)}
                            disabled={isPending}
                            className="px-4 py-2 border-2 border-[#1A1A1A] bg-white text-[#1A1A1A] font-[family-name:var(--font-outfit)] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#7A1B2E] hover:bg-[#F8D7DA] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                          >
                            Tolak
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveRegistration(reg.id)}
                            disabled={isPending}
                            className="px-4 py-2 border-2 border-[#1A1A1A] bg-[#7A1B2E] text-white font-[family-name:var(--font-outfit)] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#1A1A1A] hover:bg-[#A62639] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
                          >
                            Terima
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Tab Content: Members */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-dashed border-[#1A1A1A]/30 pb-4">
                  <div>
                    <h2 className="font-[family-name:var(--font-outfit)] text-xl md:text-2xl font-black uppercase text-[#1A1A1A]">
                      Semua Anggota ({filteredMembers.length})
                    </h2>
                    <p className="mt-1 font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase text-[#1A1A1A]/70">
                      // Urut nama A–Z · data alasan diambil dari pendaftaran approved
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="search"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Cari nama, NIM, prodi, alasan..."
                      className="w-full md:w-80 border-2 border-[#1A1A1A] bg-white px-3.5 py-2 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold focus:outline-none focus:shadow-[4px_4px_0_#7A1B2E] transition-shadow"
                    />
                  </div>
                </div>

                {loadingMembers ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#7A1B2E]" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-[#1A1A1A] font-mono text-xs text-gray-500 bg-white">
                    {memberSearch ? '// Tidak ada anggota yang cocok dengan pencarian.' : '// Belum ada anggota terdaftar.'}
                  </div>
                ) : (
                  <div className="border-2 border-[#1A1A1A] bg-white shadow-[4px_4px_0_#1A1A1A] overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[640px]">
                      <thead>
                        <tr className="border-b-2 border-[#1A1A1A] font-mono text-xs bg-[#F5F3EF]">
                          <th className="p-3 border-r-2 border-[#1A1A1A]">Nama</th>
                          <th className="p-3 border-r-2 border-[#1A1A1A]">NIM</th>
                          <th className="p-3 border-r-2 border-[#1A1A1A]">Prodi/Kelas</th>
                          <th className="p-3 border-r-2 border-[#1A1A1A]">Role</th>
                          <th className="p-3">Alasan Masuk USRC</th>
                        </tr>
                      </thead>
                      <tbody className="font-['Work_Sans'] text-sm">
                        {filteredMembers.map((member) => (
                          <tr key={member.id} className="border-b border-[#1A1A1A] hover:bg-gray-50 transition-colors">
                            <td className="p-3 border-r-2 border-[#1A1A1A] font-bold">
                              {member.full_name}
                            </td>
                            <td className="p-3 border-r-2 border-[#1A1A1A] font-mono text-xs">
                              {member.nim}
                            </td>
                            <td className="p-3 border-r-2 border-[#1A1A1A] text-xs font-bold">
                              {member.prodi}
                            </td>
                            <td className="p-3 border-r-2 border-[#1A1A1A]">
                              <span className="inline-block font-mono text-[10px] px-2 py-0.5 border border-[#1A1A1A] bg-[#FFF3C4] font-bold uppercase">
                                {member.role}
                              </span>
                            </td>
                            <td className="p-3 text-xs italic text-gray-700 max-w-md">
                              {member.reason || 'Belum ada alasan tersimpan.'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </motion.section>
        </div>
      </div>

      {/* Subtle Footer */}
      <footer className="text-center font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark/50 pt-4">
        [USRC UBSI PONTIANAK] — Area Anggota &amp; Sekretariat
      </footer>
    </div>
  )
}

export default function SekretarisDashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" /></div>}>
      <SekretarisDashboardContent />
    </Suspense>
  )
}
