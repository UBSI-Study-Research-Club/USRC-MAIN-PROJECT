
'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, ClipboardList, Check, X, Trash2, Calendar, Loader2, AlertCircle } from 'lucide-react'

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

function SekretarisDashboardContent() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('')
  const [attendances, setAttendances] = useState<AttendanceDetail[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(true)
  const [loadingAttendances, setLoadingAttendances] = useState(false)
  const [loadingRegs, setLoadingRegs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'absen' | 'registrations'>('absen')
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

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

    fetchMeetings()
    fetchRegistrations()

    // Realtime subscriptions for registrations
    const regChannel = supabase
      .channel('sekre-registrations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations' },
        () => {
          fetchRegistrations()
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
        const { error } = await supabase
          .from('registrations')
          .update({ status: 'approved' })
          .eq('id', regId)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-2 border-[#1A1A1A] bg-white p-6 shadow-[4px_4px_0_#1A1A1A] relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#FFF3C4] text-[#1A1A1A] font-mono text-[10px] px-3 py-1 border-l-2 border-b-2 border-[#1A1A1A] font-bold">
          // SEKRETARIAT & ADMIN
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase font-['Outfit'] tracking-wide text-[#7A1B2E]">
          Dashboard Sekretaris
        </h1>
        <p className="text-sm font-['Work_Sans'] text-[#1A1A1A] mt-1 max-w-2xl">
          Validasi kehadiran anggota secara <span className="font-bold underline">realtime</span> per sesi pertemuan, serta kelola antrian pendaftaran anggota baru USRC.
        </p>
      </div>

      {error && (
        <div className="border-2 border-[#1A1A1A] bg-[#F8D7DA] p-4 shadow-[3px_3px_0_#1A1A1A] flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#7A1B2E] shrink-0" />
          <p className="text-sm font-bold font-mono">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-[#1A1A1A] gap-2">
        <button
          onClick={() => setActiveTab('absen')}
          className={`px-5 py-2.5 font-bold uppercase font-['Outfit'] text-sm border-2 border-[#1A1A1A] border-b-0 transition-all ${
            activeTab === 'absen' 
              ? 'bg-[#7A1B2E] text-white shadow-[2px_-2px_0_#1A1A1A]' 
              : 'bg-white text-[#1A1A1A] hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span>Absensi Realtime</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-5 py-2.5 font-bold uppercase font-['Outfit'] text-sm border-2 border-[#1A1A1A] border-b-0 transition-all relative ${
            activeTab === 'registrations' 
              ? 'bg-[#7A1B2E] text-white shadow-[2px_-2px_0_#1A1A1A]' 
              : 'bg-white text-[#1A1A1A] hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Antrian Pendaftar</span>
            {registrations.length > 0 && (
              <span className="bg-[#FFF3C4] text-[#1A1A1A] font-mono text-[10px] px-1.5 py-0.2 border border-[#1A1A1A] font-black">
                {registrations.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Tab Content: Absen */}
      {activeTab === 'absen' && (
        <div className="space-y-4">
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
        <div className="space-y-4">
          <div className="border-2 border-[#1A1A1A] bg-white shadow-[4px_4px_0_#1A1A1A] overflow-hidden">
            <div className="p-4 bg-[#F5F3EF] border-b-2 border-[#1A1A1A] flex justify-between items-center">
              <h3 className="font-black uppercase font-['Outfit'] text-sm">
                Antrian Pendaftar Baru ({registrations.length})
              </h3>
              <span className="font-mono text-[10px] bg-[#FFF3C4] border border-[#1A1A1A] px-2 py-0.5 font-bold">
                PENDING APPROVAL
              </span>
            </div>

            {loadingRegs ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#7A1B2E]" />
              </div>
            ) : registrations.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-gray-500">
                Tidak ada pendaftar baru yang menunggu persetujuan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#1A1A1A] font-mono text-xs bg-[#F5F3EF]">
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Nama & Email</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">NIM</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Prodi</th>
                      <th className="p-3 border-r-2 border-[#1A1A1A]">Alasan Gabung</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="font-['Work_Sans'] text-sm">
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="border-b border-[#1A1A1A] hover:bg-gray-50">
                        <td className="p-3 border-r-2 border-[#1A1A1A]">
                          <p className="font-bold">{reg.full_name}</p>
                          <p className="font-mono text-xs text-gray-600">{reg.email}</p>
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] font-mono text-xs">
                          {reg.nim}
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] text-xs font-bold">
                          {reg.prodi}
                        </td>
                        <td className="p-3 border-r-2 border-[#1A1A1A] text-xs italic text-gray-700">
                          {reg.reason || '-'}
                        </td>
                        <td className="p-3 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApproveRegistration(reg.id)}
                            disabled={isPending}
                            className="px-3 py-1 bg-[#D1E7DD] border-2 border-[#1A1A1A] font-mono text-xs font-bold hover:bg-green-300 transition-colors shadow-[2px_2px_0_#1A1A1A] flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 text-green-800" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectRegistration(reg.id)}
                            disabled={isPending}
                            className="px-3 py-1 bg-[#F8D7DA] border-2 border-[#1A1A1A] font-mono text-xs font-bold text-[#7A1B2E] hover:bg-red-300 transition-colors shadow-[2px_2px_0_#1A1A1A] flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
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
    </div>
  )
}


import { Suspense } from 'react'

export default function SekretarisDashboardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" /></div>}>
      <SekretarisDashboardContent />
    </Suspense>
  )
}
