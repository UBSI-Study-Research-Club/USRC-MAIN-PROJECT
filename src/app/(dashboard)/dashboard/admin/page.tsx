'use client'

import { useEffect, useState, useTransition } from 'react'
import { Select } from '@/components/Select'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { withHttps, getPdfViewUrl } from '@/lib/url'
import { Users, Images, Search, Check, X, Loader2, AlertCircle, Lock, Trash2, CalendarDays, Ban, RotateCcw, BarChart3, FileText, ExternalLink } from 'lucide-react'
import { GlidePill, GLIDE } from '@/components/motion/Glide'
import { KaryaCover } from '@/components/KaryaCover'

type Profile = {
  id: string
  full_name: string
  nim: string
  prodi: string
  role: 'anggota' | 'sekre' | 'admin'
  status: 'aktif' | 'nonaktif'
}

type MeetingRow = {
  id: string
  title: string
  starts_at: string
  ends_at: string
}

type Project = {
  id: string
  user_id: string
  title: string
  description: string
  image_url: string
  pdf_url?: string | null
  project_links: { link_type: string; url: string; label: string | null }[] | null
  category: string
  status: 'pending' | 'approved'
  created_at: string
  profiles: {
    full_name: string
    nim: string
  } | null
}

type ActivityData = {
  id: string
  full_name: string
  nim: string
  hobbies?: string[] | null
  total_sessions: number
  attended: number
  pending: number
  attendance_rate: number
}

function AdminDashboardContent() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('anggota')
  const reduceMotion = useReducedMotion()
  const [isPending, startTransition] = useTransition()

  // ANGGOTA Tab
  const [members, setMembers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(true)

  // KARYA Tab
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  // SESI Tab (Gelombang C)
  const [meetings, setMeetings] = useState<MeetingRow[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)

  // PENDATAAN Tab
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [loadingActivityData, setLoadingActivityData] = useState(true)

  const supabase = createClient()

  // Check if current user is admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('Anda harus login terlebih dahulu.')
          setLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        if (profile?.role !== 'admin') {
          setError('Anda tidak memiliki akses ke panel admin. Hanya admin yang bisa masuk.')
          setLoading(false)
          return
        }

        setUserRole(profile.role)
      } catch (err: any) {
        setError(err.message || 'Gagal mengecek otorisasi.')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Fetch members
  useEffect(() => {
    if (userRole !== 'admin') return

    const fetchMembers = async () => {
      try {
        setLoadingMembers(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, nim, prodi, role, status')
          .order('created_at', { ascending: false })

        if (error) throw error
        setMembers(data || [])
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data anggota.')
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchMembers()

    // Realtime: anggota baru atau role berubah langsung muncul tanpa refresh.
    const memberChannel = supabase
      .channel('admin-members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchMembers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(memberChannel)
    }
  }, [userRole])

  // Fetch pending projects
  useEffect(() => {
    if (userRole !== 'admin') return

    const fetchProjects = async () => {
      try {
        setLoadingProjects(true)
        const { data, error } = await supabase
          .from('projects')
          .select('id, user_id, title, description, image_url, pdf_url, category, status, created_at, project_links(link_type, url, label)')
          .order('created_at', { ascending: false })

        if (error) throw error
        
        // Fetch pembuat names secara terpisah untuk hindari ambiguitas relasi
        const userIds = [...new Set((data || []).map(p => p.user_id))]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, nim')
            .in('id', userIds)
          
          const profileMap = new Map((profiles || []).map(p => [p.id, p]))
          const enriched = (data || []).map(p => ({
            ...p,
            profiles: profileMap.get(p.user_id)
          }))
          setProjects((enriched as unknown as Project[]) || [])
        } else {
          setProjects([])
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data karya.')
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchProjects()

    // Minta izin notification browser jika didukung
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }

    // Realtime subscription for projects dengan kemunculan Chrome Push Notification dengan Chrome Push Notification untuk Karya Baru
    const projectChannel = supabase
      .channel('admin-projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          fetchProjects()
          // Jika ada karya baru di-submit (INSERT dengan status pending), munculkan notifikasi natif Chrome
          if (payload.eventType === 'INSERT' && (payload.new as any).status === 'pending' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('USRC // Permintaan ACC Karya', {
              body: `Ada karya baru "${(payload.new as any).title || 'Tanpa Judul'}" yang menunggu persetujuan admin!`,
              icon: '/favicon.ico',
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(projectChannel)
    }
  }, [userRole])

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: string) => {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', memberId)

        if (error) throw error

        // Update local state
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, role: newRole as 'anggota' | 'sekre' | 'admin' } : m
          )
        )
      } catch (err: any) {
        alert('Gagal mengubah role: ' + err.message)
      }
    })
  }

  // Approve project
  const handleApproveProject = async (projectId: string) => {
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('projects')
          .update({ status: 'approved' })
          .eq('id', projectId)

        if (error) throw error

        setProjects((prev) => prev.filter((p) => p.id !== projectId))
      } catch (err: any) {
        alert('Gagal menyetujui karya: ' + err.message)
      }
    })
  }

  // Reject project
  const handleRejectProject = async (projectId: string) => {
    if (!confirm('Yakin ingin menolak karya ini?')) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)

        if (error) throw error

        setProjects((prev) => prev.filter((p) => p.id !== projectId))
      } catch (err: any) {
        alert('Gagal menolak karya: ' + err.message)
      }
    })
  }

  // Hapus karya apa pun statusnya (Gelombang C)
  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`PERMANEN: hapus karya "${project.title}"? Link, detail poin, dan bintangnya ikut terhapus dan tidak bisa dikembalikan.`)) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', project.id)

        if (error) throw error
        setProjects((prev) => prev.filter((p) => p.id !== project.id))
      } catch (err: any) {
        alert('Gagal menghapus karya: ' + err.message)
      }
    })
  }

  // Nonaktifkan / aktifkan anggota (Gelombang C)
  const handleToggleStatus = async (member: Profile) => {
    const next = member.status === 'aktif' ? 'nonaktif' : 'aktif'
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ status: next })
          .eq('id', member.id)

        if (error) throw error
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, status: next } : m))
        )
      } catch (err: any) {
        alert('Gagal mengubah status: ' + err.message)
      }
    })
  }

  // Keluarkan anggota — HAPUS permanen, cascade semua datanya (Gelombang C)
  const handleKickMember = async (member: Profile) => {
    if (!confirm(`PERMANEN: keluarkan ${member.full_name}? SEMUA datanya ikut terhapus — karya, absen, bintang, anggotaan kelompok — dan tidak bisa dikembalikan. (Akun login-nya tetap ada di Supabase Auth.)`)) return
    if (!confirm('Yakin 100%? Aksi ini gak ada jalan balik.')) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', member.id)

        if (error) throw error
        setMembers((prev) => prev.filter((m) => m.id !== member.id))
      } catch (err: any) {
        alert('Gagal mengeluarkan anggota: ' + err.message)
      }
    })
  }

  // Fetch semua sesi absen + hapus sesi (Gelombang C)
  useEffect(() => {
    if (userRole !== 'admin') return

    const fetchMeetings = async () => {
      try {
        setLoadingMeetings(true)
        const { data, error } = await supabase
          .from('meetings')
          .select('id, title, starts_at, ends_at')
          .order('starts_at', { ascending: false })

        if (error) throw error
        setMeetings(data || [])
      } catch (err: any) {
        setError(err.message || 'Gagal memuat sesi.')
      } finally {
        setLoadingMeetings(false)
      }
    }

    fetchMeetings()

    const meetingChannel = supabase
      .channel('admin-meetings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchMeetings())
      .subscribe()

    return () => {
      supabase.removeChannel(meetingChannel)
    }
  }, [userRole])

  const handleDeleteMeeting = async (meeting: MeetingRow) => {
    if (!confirm(`PERMANEN: hapus sesi "${meeting.title}"? Semua data absennya ikut terhapus.`)) return
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('meetings')
          .delete()
          .eq('id', meeting.id)

        if (error) throw error
        setMeetings((prev) => prev.filter((m) => m.id !== meeting.id))
      } catch (err: any) {
        alert('Gagal menghapus sesi: ' + err.message)
      }
    })
  }

  // Filter members by search
  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.nim.includes(searchQuery)
  )

  // Fetch activity data (hobbies + attendance stats)
  useEffect(() => {
    if (userRole !== 'admin') return

    const fetchActivity = async () => {
      try {
        setLoadingActivityData(true)
        
        // Fetch all profiles with hobbies
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, nim, hobbies')
          .order('full_name', { ascending: true })

        if (profilesError) throw profilesError

        // Fetch all attendance records — kolom asli: user_id, status enum ('pending'|'approved')
        const { data: attendances, error: attendancesError } = await supabase
          .from('attendances')
          .select('user_id, status')

        if (attendancesError) throw attendancesError

        // Build attendance map: { user_id -> { attended, pending, total } }
        const attendanceMap: Record<string, { attended: number; pending: number; total: number }> = {}

        ;(attendances || []).forEach(att => {
          if (!attendanceMap[att.user_id]) {
            attendanceMap[att.user_id] = { attended: 0, pending: 0, total: 0 }
          }
          attendanceMap[att.user_id].total++
          // DB cuma kenal 'approved' (hadir, disetujui sekre) dan 'pending' (menunggu)
          if (att.status === 'approved') attendanceMap[att.user_id].attended++
          else if (att.status === 'pending') attendanceMap[att.user_id].pending++
        })

        // Build activity data
        const data: ActivityData[] = (profiles || []).map(p => {
          const stats = attendanceMap[p.id] || { attended: 0, pending: 0, total: 0 }
          const rate = stats.total > 0 ? (stats.attended / stats.total) * 100 : 0
          return {
            id: p.id,
            full_name: p.full_name,
            nim: p.nim,
            hobbies: p.hobbies || null,
            total_sessions: stats.total,
            attended: stats.attended,
            pending: stats.pending,
            attendance_rate: Math.round(rate * 100) / 100
          }
        })

        setActivityData(data)
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data aktivitas.')
      } finally {
        setLoadingActivityData(false)
      }
    }

    fetchActivity()

    const activityChannel = supabase
      .channel('admin-activity-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, () => fetchActivity())
      .subscribe()

    return () => {
      supabase.removeChannel(activityChannel)
    }
  }, [userRole])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-12 w-full max-w-xl" />
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 w-full" />)}</div>
      </div>
    )
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex items-start gap-4 border-2 border-dark bg-[#F8D7DA] p-6 shadow-[4px_4px_0_#1A1A1A]">
        <Lock className="mt-1 h-6 w-6 shrink-0 text-maroon" />
        <div>
          <h1 className={`${FONT_D} text-lg font-black uppercase text-maroon`}>Akses ditolak</h1>
          <p className="mt-2 text-sm text-dark">{error || 'Hanya admin yang bisa membuka panel ini.'}</p>
        </div>
      </div>
    )
  }

  const pendingProjects = projects.filter((p) => p.status === 'pending').length
  const sortedProjects = [...projects].sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1))
  const TABS: { key: AdminTab; label: string; icon: typeof Users; count?: number; alert?: boolean }[] = [
    { key: 'anggota', label: 'Anggota', icon: Users, count: members.length },
    { key: 'karya', label: 'Karya', icon: Images, count: pendingProjects || undefined, alert: pendingProjects > 0 },
    { key: 'sesi', label: 'Sesi', icon: CalendarDays, count: meetings.length },
    { key: 'pendataan', label: 'Rekap', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6 pb-12 md:space-y-8">
      {/* ── Kepala halaman ── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={`${FONT_D} text-3xl font-black uppercase leading-none tracking-tight text-dark md:text-4xl`}>Panel Admin</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-dark/70">Kelola anggota, karya, dan sesi. Aksi hapus bersifat permanen.</p>
        </div>

        <div role="tablist" aria-label="Menu admin" className="grid w-full grid-cols-4 border-2 border-dark bg-white p-1 shadow-[3px_3px_0_#1A1A1A] lg:flex lg:w-auto">
          {TABS.map(({ key, label, icon: Icon, count, alert }) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(key)}
                className={`${FONT_D} relative flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors duration-200 sm:text-xs lg:px-4 ${
                  active ? 'text-white' : 'text-dark/70 hover:text-dark'
                }`}
              >
                {active && <GlidePill id="admin-tab" className="bg-maroon" />}
                <Icon className="relative z-10 hidden h-4 w-4 shrink-0 sm:block" />
                <span className="relative z-10">{label}</span>
                {count !== undefined && (
                  <span
                    className={`relative z-10 min-w-5 border px-1 font-mono text-[10px] ${
                      active ? 'border-white/60 text-white' : alert ? 'border-dark bg-maroon text-white' : 'border-dark bg-[#FFF3C4] text-dark'
                    }`}
                  >
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
          {/* ── ANGGOTA ── */}
          {activeTab === 'anggota' && (
            <>
              <SearchBox value={searchQuery} onChange={setSearchQuery} placeholder="Cari nama atau NIM" />
              {loadingMembers ? (
                <SkeletonList />
              ) : filteredMembers.length === 0 ? (
                <EmptyState icon={Users} text={searchQuery ? 'Tidak ada anggota yang cocok.' : 'Belum ada anggota.'} />
              ) : (
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredMembers.map((member) => {
                    const off = member.status === 'nonaktif'
                    return (
                      <li key={member.id} className={`flex min-w-0 flex-col gap-3 border-2 border-dark bg-white p-3 shadow-[3px_3px_0_#1A1A1A] ${off ? 'bg-[#F5F3EF]' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Initials name={member.full_name} muted={off} />
                          <div className="min-w-0 flex-1">
                            <p className={`truncate font-bold leading-tight ${off ? 'text-dark/50 line-through decoration-1' : 'text-dark'}`}>{member.full_name}</p>
                            <p className="truncate font-mono text-[11px] text-dark/60">{member.nim} · {member.prodi}</p>
                          </div>
                          {off && <span className="shrink-0 border border-dark bg-[#F8D7DA] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-maroon">Nonaktif</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <Select
                              size="sm"
                              aria-label={`Role ${member.full_name}`}
                              value={member.role}
                              onChange={(v) => handleUpdateRole(member.id, v)}
                              disabled={isPending}
                              options={[
                                { value: 'anggota', label: 'Anggota' },
                                { value: 'sekre', label: 'Sekretaris' },
                                { value: 'admin', label: 'Admin' },
                              ]}
                            />
                          </div>
                          <IconBtn
                            label={off ? 'Aktifkan kembali' : 'Nonaktifkan'}
                            tone="warn"
                            onClick={() => handleToggleStatus(member)}
                            disabled={isPending}
                          >
                            {off ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </IconBtn>
                          <IconBtn label="Keluarkan permanen" tone="danger" onClick={() => handleKickMember(member)} disabled={isPending}>
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {/* ── KARYA ── */}
          {activeTab === 'karya' && (
            loadingProjects ? (
              <SkeletonList tall />
            ) : projects.length === 0 ? (
              <EmptyState icon={Images} text="Belum ada karya." />
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {sortedProjects.map((project) => {
                  const pending = project.status === 'pending'
                  return (
                    <li key={project.id} className="flex min-w-0 flex-col border-2 border-dark bg-white" style={{ boxShadow: `4px 4px 0 ${pending ? '#7A1B2E' : '#1A1A1A'}` }}>
                      <div className="flex gap-3 p-3">
                        <div className="w-24 shrink-0 overflow-hidden border-2 border-dark sm:w-28">
                          {project.image_url ? (
                            <KaryaCover src={project.image_url} alt={project.title} className="aspect-square" />
                          ) : (
                            <div className="grid aspect-square place-items-center bg-paper"><Images className="h-6 w-6 text-dark/25" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`${FONT_D} line-clamp-2 text-sm font-black uppercase leading-tight text-dark`}>{project.title}</p>
                            <span className={`shrink-0 border border-dark px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${pending ? 'bg-[#FFF3C4]' : 'bg-[#D1E7DD]'}`}>
                              {pending ? 'Menunggu' : 'Tayang'}
                            </span>
                          </div>
                          <p className="mt-1 truncate font-mono text-[11px] text-dark/60">
                            {project.profiles?.full_name || 'Tanpa nama'}{project.category ? ` · ${project.category}` : ''}
                          </p>
                          {project.description && <p className="mt-1.5 line-clamp-2 text-xs text-dark/70">{project.description}</p>}
                          {(project.pdf_url || (project.project_links || []).length > 0) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {project.pdf_url && (
                                <a href={getPdfViewUrl(project.pdf_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 border border-dark bg-[#FFF3C4] px-1.5 py-0.5 font-mono text-[10px] font-bold hover:bg-white">
                                  <FileText className="h-3 w-3" /> PDF
                                </a>
                              )}
                              {(project.project_links || []).map((l, i) => (
                                <a key={i} href={withHttps(l.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 border border-dark bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold hover:bg-[#FFF3C4]">
                                  <ExternalLink className="h-3 w-3" /> {l.label || l.link_type}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`mt-auto grid border-t-2 border-dark ${pending ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-1'}`}>
                        {pending && (
                          <>
                            <button type="button" onClick={() => handleRejectProject(project.id)} disabled={isPending} className={`${FONT_D} inline-flex items-center justify-center gap-1.5 border-r-2 border-dark py-2.5 text-xs font-black uppercase tracking-wider text-dark transition-colors hover:bg-[#F8D7DA] disabled:opacity-60`}>
                              <X className="h-4 w-4" strokeWidth={3} /> Tolak
                            </button>
                            <button type="button" onClick={() => handleApproveProject(project.id)} disabled={isPending} className={`${FONT_D} inline-flex items-center justify-center gap-1.5 border-r-2 border-dark bg-maroon py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-hot disabled:opacity-60`}>
                              <Check className="h-4 w-4" strokeWidth={3} /> Setujui
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project)}
                          disabled={isPending}
                          aria-label="Hapus karya"
                          title="Hapus karya"
                          className={`${FONT_D} inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-maroon transition-colors hover:bg-[#F8D7DA] disabled:opacity-60`}
                        >
                          <Trash2 className="h-4 w-4" />
                          {!pending && 'Hapus'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          )}

          {/* ── SESI ── */}
          {activeTab === 'sesi' && (
            <>
              <p className="flex items-center gap-2 border-l-4 border-maroon bg-white px-3 py-2 text-xs text-dark/70">
                <AlertCircle className="h-4 w-4 shrink-0 text-maroon" />
                Menghapus sesi juga menghapus semua data absen di sesi itu.
              </p>
              {loadingMeetings ? (
                <SkeletonList />
              ) : meetings.length === 0 ? (
                <EmptyState icon={CalendarDays} text="Belum ada sesi." />
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {meetings.map((meeting) => {
                    const d = new Date(meeting.starts_at)
                    return (
                      <li key={meeting.id} className="flex min-w-0 items-stretch border-2 border-dark bg-white shadow-[3px_3px_0_#1A1A1A]">
                        <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-dark bg-paper py-2">
                          <span className="font-mono text-[10px] font-bold uppercase text-dark/60">{d.toLocaleDateString('id-ID', { month: 'short', timeZone: TZ })}</span>
                          <b className={`${FONT_D} text-2xl font-black leading-none text-maroon`}>{d.toLocaleDateString('id-ID', { day: 'numeric', timeZone: TZ })}</b>
                        </div>
                        <div className="min-w-0 flex-1 px-3 py-2.5">
                          <p className={`${FONT_D} truncate text-sm font-black uppercase text-dark`}>{meeting.title}</p>
                          <p className="font-mono text-[11px] text-dark/60">
                            {fmtTime(meeting.starts_at)}–{fmtTime(meeting.ends_at)} WIB · {d.getFullYear()}
                          </p>
                        </div>
                        <div className="flex items-center pr-3">
                          <IconBtn label="Hapus sesi" tone="danger" onClick={() => handleDeleteMeeting(meeting)} disabled={isPending}>
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {/* ── REKAP ── */}
          {activeTab === 'pendataan' && (
            loadingActivityData ? (
              <SkeletonList tall />
            ) : activityData.length === 0 ? (
              <EmptyState icon={BarChart3} text="Belum ada data aktivitas." />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {activityData.map((m) => {
                  const rate = Math.round(m.attendance_rate)
                  const tone = rate >= 80 ? 'bg-green-600' : rate >= 60 ? 'bg-[#E8A100]' : 'bg-maroon'
                  return (
                    <li key={m.id} className="flex min-w-0 flex-col gap-3 border-2 border-dark bg-white p-3 shadow-[3px_3px_0_#1A1A1A]">
                      <div className="flex items-center gap-3">
                        <Initials name={m.full_name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold leading-tight text-dark">{m.full_name}</p>
                          <p className="font-mono text-[11px] text-dark/60">{m.nim}</p>
                        </div>
                        <b className={`${FONT_D} text-2xl font-black text-dark`}>{rate}<span className="text-sm text-dark/50">%</span></b>
                      </div>
                      <div>
                        <div className="h-2 overflow-hidden border-2 border-dark bg-paper">
                          <div className={`h-full ${tone}`} style={{ width: `${rate}%` }} />
                        </div>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-dark/60">
                          Hadir {m.attended} · Pending {m.pending} · Total {m.total_sessions}
                        </p>
                      </div>
                      {m.hobbies && m.hobbies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.hobbies.map((h) => (
                            <span key={h} className="border border-dark bg-[#FFF3C4] px-1.5 py-0.5 font-mono text-[10px] font-semibold">{h}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Komponen kecil ──
type AdminTab = 'anggota' | 'karya' | 'sesi' | 'pendataan'
const FONT_D = 'font-[family-name:var(--font-outfit)]'
const TZ = 'Asia/Pontianak'
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

function Initials({ name, muted }: { name: string; muted?: boolean }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'
  return (
    <span className={`${FONT_D} grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-dark text-sm font-black ${muted ? 'bg-paper text-dark/40' : 'bg-[#FCE9ED] text-maroon'}`}>
      {ini}
    </span>
  )
}

function IconBtn({ label, tone, onClick, disabled, children }: { label: string; tone: 'warn' | 'danger'; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 shrink-0 place-items-center border-2 border-dark shadow-[2px_2px_0_#1A1A1A] transition-[transform,box-shadow,background-color] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${
        tone === 'warn' ? 'bg-[#FFF3C4] text-dark hover:bg-[#FFE9A8]' : 'bg-[#F8D7DA] text-maroon hover:bg-[#f1bfc4]'
      }`}
    >
      {children}
    </button>
  )
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative md:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark/40" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-dark bg-white py-2.5 pl-9 pr-3 text-sm text-dark placeholder-dark/40 transition-shadow focus:shadow-[4px_4px_0_#7A1B2E] focus:outline-none"
      />
    </div>
  )
}

function SkeletonList({ tall }: { tall?: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => <div key={i} className={`skeleton w-full ${tall ? 'h-36' : 'h-20'}`} />)}
    </div>
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

import { Suspense } from 'react'

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" /></div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}
