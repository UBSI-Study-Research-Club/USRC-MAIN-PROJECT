import { redirect } from 'next/navigation'

// Riwayat absen pindah ke dalam dashboard anggota (PRD Phase 3)
export default function RiwayatRedirect() {
  redirect('/dashboard/absen/riwayat')
}
