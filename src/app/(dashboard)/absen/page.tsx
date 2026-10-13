import { redirect } from 'next/navigation'

// Absen pindah ke dalam dashboard anggota (PRD Phase 3) — bookmark lama tetap hidup
export default function AbsenRedirect() {
  redirect('/dashboard/absen')
}
