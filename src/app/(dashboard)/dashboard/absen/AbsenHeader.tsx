'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { AbsenTabs } from './AbsenTabs'
import { GLIDE } from '@/components/motion/Glide'

const COPY = {
  aktif: {
    title: 'Absensi',
    desc: 'Absen dibuka 30 menit sebelum sesi mulai dan ditutup saat sesi selesai.',
  },
  riwayat: {
    title: 'Riwayat Absen',
    desc: 'Semua sesi yang sudah lewat beserta status kehadiranmu.',
  },
}

export function AbsenHeader() {
  const pathname = usePathname()
  const key = pathname.startsWith('/dashboard/absen/riwayat') ? 'riwayat' : 'aktif'
  const copy = COPY[key]

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ ...GLIDE, duration: 0.22 }}
          >
            <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-black uppercase leading-none tracking-tight text-[#1A1A1A] md:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#1A1A1A]/70">{copy.desc}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <AbsenTabs />
    </header>
  )
}
