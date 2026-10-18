'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { GLIDE } from '@/components/motion/Glide'

// Urutan tab untuk menentukan arah geser (maju = masuk dari kanan).
const ORDER = ['/dashboard/absen', '/dashboard/absen/riwayat']
const history = { last: 0 }
const remember = (i: number) => { history.last = i }

export default function AbsenTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const index = Math.max(0, ORDER.indexOf(pathname))
  const dir = index >= history.last ? 1 : -1

  useEffect(() => remember(index), [index])

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: 28 * dir }}
      animate={{ opacity: 1, x: 0 }}
      transition={GLIDE}
    >
      {children}
    </motion.div>
  )
}
