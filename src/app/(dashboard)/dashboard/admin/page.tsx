'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Users, Images, Search, Check, X, Loader2, AlertCircle, Lock } from 'lucide-react'

type Profile = {
  id: string
  full_name: string
  nim: string
  prodi: string
  role: 'anggota' | 'sekre' | 'admin'
}

type Project = {
  id: string
  user_id: string
  title: string
  description: string
  image_url: string
  repo_url: string
  live_url: string
  category: string
  status: 'pending' | 'approved'
  created_at: string
  profiles: {
    full_name: string
    nim: string
  } | null
}

function AdminDashboardContent() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'anggota' | 'karya'>('anggota')
  const [animatingTab, setAnimatingTab] = useState<'anggota' | 'karya' | null>(null)
  const reduceMotion = useReducedMotion()
  const [isPending, startTransition] = useTransition()

  // ANGGOTA Tab
  const [members, setMembers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(true)

  // KARYA Tab
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  const handleTabChange = (newTab: 'anggota' | 'karya') => {
    if (newTab === activeTab) return
    if (!reduceMotion) setAnimatingTab(activeTab)
    setActiveTab(newTab)
  }

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
          .select('id, full_name, nim, prodi, role')
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
          .select('id, user_id, title, description, image_url, repo_url, live_url, category, status, created_at, profiles(full_name, nim)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (error) throw error
        setProjects((data as unknown as Project[]) || [])
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data karya.')
      } finally {
        setLoadingProjects(false)
      }
    }

    fetchProjects()

    // Realtime subscription for projects
    const projectChannel = supabase
      .channel('admin-projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: 'status=eq.pending' },
        () => {
          fetchProjects()
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

  // Filter members by search
  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.nim.includes(searchQuery)
  )

  // Paper Stack Animation Colors
  const TAB_COLORS: Record<'anggota' | 'karya', string> = {
    anggota: '#FFFFFF',
    karya: '#FFF9DC',
  }

  // Stack Deck Order
  const stackDeckByTab: Record<
    'anggota' | 'karya',
    {
      front: 'anggota' | 'karya'
      middle: 'anggota' | 'karya'
      back: 'anggota' | 'karya'
    }
  > = {
    anggota: {
      front: 'anggota',
      middle: 'karya',
      back: 'karya',
    },
    karya: {
      front: 'karya',
      middle: 'anggota',
      back: 'anggota',
    },
  }

  const currentDeck = stackDeckByTab[activeTab]
  const frontSheetColor = TAB_COLORS[currentDeck.front]
  const middleSheetColor = TAB_COLORS[currentDeck.middle]
  const backSheetColor = TAB_COLORS[currentDeck.back]

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" />
      </div>
    )
  }

  if (userRole !== 'admin') {
    return (
      <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-6 shadow-[4px_4px_0_#1A1A1A]">
        <div className="flex items-start gap-4">
          <Lock className="w-6 h-6 text-[#7A1B2E] shrink-0 mt-1" />
          <div>
            <h1 className="text-lg font-black uppercase font-['Outfit'] text-[#7A1B2E]">
              Akses Ditolak
            </h1>
            <p className="text-sm font-['Work_Sans'] text-[#1A1A1A] mt-2">
              {error || 'Anda tidak memiliki akses ke panel admin. Hubungi admin untuk informasi lebih lanjut.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0_#1A1A1A] relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#FFF3C4] text-[#1A1A1A] font-mono text-[10px] px-3 py-1 border-l-2 border-b-2 border-[#1A1A1A] font-bold">
          // ADMIN ONLY
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase font-['Outfit'] tracking-wide text-[#7A1B2E]">
          Panel Admin
        </h1>
        <p className="text-sm font-['Work_Sans'] text-[#1A1A1A] mt-1 max-w-2xl">
          Kelola anggota, ubah role, dan setujui karya member yang akan ditampilkan di landing.
        </p>
      </div>

      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[3px_3px_0_#1A1A1A] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      {/* Tab Numpuk & Tumpukan Kertas */}
      <div className="relative">
        {/* Tab Buttons (Overlapping Stack) */}
        <div
          role="tablist"
          aria-label="Menu dashboard admin"
          className="relative z-20 flex items-end overflow-x-auto pb-0 -mb-[2px] px-1 scrollbar-none"
        >
          {/* Tab 0: Anggota */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'anggota'}
            onClick={() => handleTabChange('anggota')}
            className={`group relative inline-flex items-center gap-2 border-2 border-[#1A1A1A] border-b-0 px-4 md:px-6 py-2.5 md:py-3 font-[family-name:var(--font-outfit)] text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'anggota'
                ? 'z-30 bg-[#7A1B2E] text-white pt-3.5 md:pt-4 pb-3 shadow-[3px_0_0_#1A1A1A]'
                : 'z-10 bg-white text-[#1A1A1A] hover:-translate-y-1 shadow-[2px_0_0_#1A1A1A]'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Kelola Anggota</span>
          </button>

          {/* Tab 1: Karya */}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'karya'}
            onClick={() => handleTabChange('karya')}
            className={`group relative -ml-3.5 inline-flex items-center gap-2 border-2 border-[#1A1A1A] border-b-0 px-4 md:px-6 py-2.5 md:py-3 font-[family-name:var(--font-outfit)] text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'karya'
                ? 'z-30 bg-[#7A1B2E] text-white pt-3.5 md:pt-4 pb-3 shadow-[3px_0_0_#1A1A1A]'
                : 'z-[9] bg-[#FFF9DC] text-[#1A1A1A] hover:-translate-y-1 shadow-[2px_0_0_#1A1A1A]'
            }`}
          >
            <Images className="h-4 w-4 shrink-0" />
            <span>Persetujuan Karya</span>
            {projects.length > 0 && (
              <span className="border border-[#1A1A1A] bg-[#FFF3C4] px-1.5 py-0.2 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-bold text-[#1A1A1A]">
                {projects.length}
              </span>
            )}
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
                animate={{
                  x: [0, 24, 16],
                  y: [0, -12, 16],
                  rotate: [0, 4, -0.9],
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
          <motion.div
            key={activeTab}
            initial={reduceMotion ? false : { opacity: 0.85, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="tabpanel"
            className="relative z-10 border-2 border-[#1A1A1A] p-5 md:p-8 shadow-[6px_6px_0_#7A1B2E] transition-colors duration-300"
            style={{ backgroundColor: frontSheetColor }}
          >

          {/* Tab Content: Anggota */}
          {activeTab === 'anggota' && (
            <div className="space-y-4">
              {/* Search Bar */}
          <div className="border-2 border-[#1A1A1A] bg-white p-4 shadow-[3px_3px_0_#1A1A1A]">
            <div className="flex items-center gap-2 relative">
              <Search className="w-5 h-5 text-[#7A1B2E] absolute left-3" />
              <input
                type="text"
                placeholder="Cari nama atau NIM anggota..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-[#1A1A1A] bg-[#F5F3EF] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E]"
              />
            </div>
          </div>

          {/* Members Table */}
          <div className="border-2 border-[#1A1A1A] bg-white shadow-[4px_4px_0_#1A1A1A] overflow-hidden">
            <div className="p-4 bg-[#F5F3EF] border-b-2 border-[#1A1A1A] flex justify-between items-center">
              <h3 className="font-black uppercase font-['Outfit'] text-sm">
                Daftar Anggota ({filteredMembers.length})
              </h3>
              <span className="font-mono text-[10px] bg-[#D1E7DD] border border-[#1A1A1A] px-2 py-0.5 font-bold">
                {members.length} TOTAL
              </span>
            </div>

            {loadingMembers ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#7A1B2E]" />
              </div>
            ) : members.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-gray-500">
                Belum ada anggota terdaftar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#1A1A1A] font-mono text-xs bg-[#F5F3EF]">
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Nama Lengkap</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">NIM</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Prodi</th>
                      <th className="p-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="font-['Work_Sans'] text-sm">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="border-b border-[#1A1A1A] hover:bg-gray-50">
                        <td className="p-3 border-r-2 border-[#1A1A1A] font-bold">
                          {member.full_name}
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] font-mono text-xs">
                          {member.nim}
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] text-xs">
                          {member.prodi}
                        </td>
                        <td className="p-3">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            disabled={isPending}
                            className="px-2 py-1 border-2 border-[#1A1A1A] bg-[#F5F3EF] font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#7A1B2E] cursor-pointer"
                          >
                            <option value="anggota">Anggota</option>
                            <option value="sekre">Sekretaris</option>
                            <option value="admin">Admin</option>
                          </select>
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

        {/* Tab Content: Karya */}
        {activeTab === 'karya' && (
          <div className="space-y-4">
            <div className="border-2 border-[#1A1A1A] bg-white shadow-[4px_4px_0_#1A1A1A] overflow-hidden">
              <div className="p-4 bg-[#F5F3EF] border-b-2 border-[#1A1A1A] flex justify-between items-center">
                <h3 className="font-black uppercase font-['Outfit'] text-sm">
                  Karya Menunggu Persetujuan ({projects.length})
                </h3>
                <span className="font-mono text-[10px] bg-[#FFF3C4] border border-[#1A1A1A] px-2 py-0.5 font-bold">
                  PENDING APPROVAL
                </span>
              </div>

              {loadingProjects ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#7A1B2E]" />
                </div>
              ) : projects.length === 0 ? (
                <div className="p-8 text-center font-mono text-xs text-gray-500">
                  Tidak ada karya menunggu persetujuan.
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {projects.map((project) => (
                    <div key={project.id} className="border-2 border-[#1A1A1A] bg-[#F5F3EF] p-4 shadow-[2px_2px_0_#1A1A1A]">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Image */}
                        {project.image_url && (
                          <div className="col-span-1 border-2 border-[#1A1A1A] bg-white p-2">
                            <img
                              src={project.image_url}
                              alt={project.title}
                              className="w-full h-32 object-cover"
                            />
                          </div>
                        )}

                        {/* Details */}
                        <div className={project.image_url ? 'col-span-1 md:col-span-2' : 'col-span-1 md:col-span-3'}>
                          <h4 className="font-black uppercase font-['Outfit'] text-sm text-[#7A1B2E] mb-1">
                            {project.title}
                          </h4>
                          <p className="text-xs font-['Work_Sans'] text-gray-700 mb-2 line-clamp-2">
                            {project.description}
                          </p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {project.category && (
                              <span className="bg-[#D1E7DD] border border-[#1A1A1A] px-2 py-0.5 font-mono font-bold">
                                {project.category}
                              </span>
                            )}
                            <span className="bg-white border border-[#1A1A1A] px-2 py-0.5 font-mono font-bold">
                              {project.profiles?.full_name || 'Tanpa nama'} ({project.profiles?.nim})
                            </span>
                          </div>
                          {project.repo_url || project.live_url ? (
                            <div className="flex gap-2 mt-2 text-xs">
                              {project.repo_url && (
                                <a
                                  href={project.repo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline text-blue-600 font-bold"
                                >
                                  Repo
                                </a>
                              )}
                              {project.live_url && (
                                <a
                                  href={project.live_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline text-blue-600 font-bold"
                                >
                                  Live
                                </a>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex flex-col gap-2 justify-center">
                          <button
                            onClick={() => handleApproveProject(project.id)}
                            disabled={isPending}
                            className="w-full px-3 py-2 bg-[#D1E7DD] border-2 border-[#1A1A1A] font-mono text-xs font-bold uppercase hover:bg-green-300 transition-colors shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>Setujui</span>
                          </button>
                          <button
                            onClick={() => handleRejectProject(project.id)}
                            disabled={isPending}
                            className="w-full px-3 py-2 bg-[#F8D7DA] border-2 border-[#1A1A1A] font-mono text-xs font-bold uppercase text-[#7A1B2E] hover:bg-red-300 transition-colors shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
      </div>
      </div>
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
