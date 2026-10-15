'use client'

import { AlertCircle } from 'lucide-react'

export type Meeting = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string
}

export type Attendance = {
  id: string
  meeting_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  checked_at: string
}

// Sama dengan is_within_window() di DB: mulai 30 menit sebelum sesi sampai selesai.
// Dilarang bikin definisi window kedua — kalau DB berubah, ubah di sini DAN di DB.
export function isWithinWindow(startsAt: string, endsAt: string) {
  const now = Date.now()
  return (
    now >= new Date(startsAt).getTime() - 30 * 60 * 1000 &&
    now <= new Date(endsAt).getTime()
  )
}

// Akun login tapi belum di-approve sekre (pendaftaran pending/ditolak)
export function GhostScreen() {
  return (
    <div className="border-2 border-[#1A1A1A] bg-white p-8 text-center shadow-[4px_4px_0_#1A1A1A] max-w-lg mx-auto mt-10">
      <AlertCircle className="w-10 h-10 text-[#7A1B2E] mx-auto mb-4" />
      <h1 className="text-xl font-black uppercase font-['Outfit'] text-[#1A1A1A] mb-2">
        Akun Belum Aktif
      </h1>
      <p className="text-sm font-['Work_Sans'] text-[#1A1A1A]/80 mb-1">
        Kamu berhasil login, tapi pendaftaranmu <span className="font-bold">belum disetujui sekretaris</span>.
      </p>
      <p className="text-xs font-mono text-gray-500 mb-6">
        Belum daftar? Klik daftar di halaman utama. Sudah daftar? Tunggu sekre approve.
      </p>
      <a
        href="/daftar"
        className="inline-block px-5 py-2.5 border-2 border-[#1A1A1A] bg-[#7A1B2E] text-white text-xs font-bold uppercase shadow-[3px_3px_0_#1A1A1A] hover:bg-[#5d1524] transition-colors"
      >
        Daftar Anggota
      </a>
    </div>
  )
}
