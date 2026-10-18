'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { Check, CheckCircle2, Clock, Loader2, Send, X } from 'lucide-react'
import { GLIDE } from '@/components/motion/Glide'
import type { Attendance, Meeting } from './shared'

const TZ = 'Asia/Pontianak'
const hm = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

type Status = 'belum' | Attendance['status']

const STAMP: Record<Exclude<Status, 'belum'>, { text: string; sub: string; color: string }> = {
  pending: { text: 'Pending', sub: 'menunggu sekre', color: '#8A5A00' },
  approved: { text: 'Hadir', sub: 'disetujui', color: '#17543A' },
  rejected: { text: 'Ditolak', sub: 'cek ke sekre', color: '#A62639' },
}

export function ActiveMeetingCard({
  meeting,
  attendance,
  now,
  sending,
  onAbsen,
}: {
  meeting: Meeting
  attendance?: Attendance
  now: Date
  sending: boolean
  onAbsen: () => void
}) {
  const reduced = useReducedMotion()
  const start = new Date(meeting.starts_at)
  const end = new Date(meeting.ends_at)
  const open = new Date(start.getTime() - 30 * 60000)
  const total = end.getTime() - open.getTime()
  const progress = Math.max(0, Math.min(100, ((now.getTime() - open.getTime()) / total) * 100))

  const st: Status = attendance ? attendance.status : 'belum'
  const steps: { label: string; state: 'done' | 'active' | 'todo' | 'bad' }[] = [
    { label: 'Kirim absen', state: st === 'belum' ? 'active' : 'done' },
    { label: 'Dicek sekre', state: st === 'approved' ? 'done' : st === 'pending' ? 'active' : st === 'rejected' ? 'bad' : 'todo' },
    { label: 'Tercatat hadir', state: st === 'approved' ? 'done' : st === 'rejected' ? 'bad' : 'todo' },
  ]
  const doneCount = steps.filter((s) => s.state === 'done').length

  // Sedikit "hentakan" kartu saat stempel jatuh — hanya ketika status berubah.
  const shake = useAnimationControls()
  const prevStatus = useRef(st)
  useEffect(() => {
    if (prevStatus.current !== st && st !== 'belum' && !reduced) {
      shake.start({ x: [0, -4, 4, -2, 0], transition: { duration: 0.35, delay: 0.2 } })
    }
    prevStatus.current = st
  }, [st, reduced, shake])

  return (
    <motion.article
      animate={shake}
      className="relative grid grid-cols-1 overflow-hidden border-2 border-[#1A1A1A] bg-white shadow-[7px_7px_0_#7A1B2E] md:grid-cols-[1fr_170px]"
    >
      <div className="flex flex-col gap-6 p-5 sm:p-7">
        {/* Tanggal + stempel status */}
        <div className="flex items-start justify-between gap-3">
          <span className="pt-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#1A1A1A]/60">
            {start.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })}
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            {st === 'belum' ? (
              <motion.span
                key="belum"
                exit={{ opacity: 0, scale: 0.8 }}
                className="border-2 border-dashed border-[#1A1A1A] px-2.5 py-1 font-mono text-[11px] font-bold uppercase"
              >
                Belum absen
              </motion.span>
            ) : (
              <motion.span
                key={st}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 2.4, rotate: -24 }}
                animate={{ opacity: 1, scale: 1, rotate: -7 }}
                transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 520, damping: 22, mass: 0.9 }}
                className="relative -mr-1 -mt-1 select-none rounded-md border-[3px] px-3 py-1 text-center font-[family-name:var(--font-outfit)] text-lg font-black uppercase leading-none tracking-[.14em]"
                style={{ color: STAMP[st].color, borderColor: STAMP[st].color, filter: 'url(#rough)' }}
              >
                {STAMP[st].text}
                <small className="mt-0.5 block font-mono text-[8px] tracking-[.2em]">{STAMP[st].sub}</small>
                {/* cipratan tinta saat stempel mendarat */}
                {!reduced && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ opacity: 0.45, scale: 0.6 }}
                    animate={{ opacity: 0, scale: 1.9 }}
                    transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
                    className="pointer-events-none absolute inset-0 rounded-md border-2"
                    style={{ borderColor: STAMP[st].color }}
                  />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div>
          <h3 className="mb-1 font-[family-name:var(--font-outfit)] text-[clamp(26px,7vw,46px)] font-black uppercase leading-[1.02] tracking-tight text-[#1A1A1A]">
            {meeting.title}
          </h3>
          <p className="mt-1 flex items-center gap-2 font-mono text-sm font-medium text-[#7A1B2E]">
            <Clock className="h-4 w-4" />
            {hm(start)} – {hm(end)} WIB
          </p>
        </div>

        {/* Waktu absen */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono text-[11px] font-bold uppercase text-[#1A1A1A]/70">
            <span>Waktu absen</span>
            <span className="text-[#7A1B2E]">Tutup {hm(end)} WIB</span>
          </div>
          <div className="relative h-3.5 overflow-hidden border-2 border-[#1A1A1A] bg-white">
            <motion.div
              className="absolute inset-y-0 left-0 bg-[#7A1B2E]"
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ...GLIDE, duration: 0.9 }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] text-[#1A1A1A]/60">
            <span>{hm(open)} buka</span>
            <span>{hm(start)} mulai</span>
            <span>{hm(end)} tutup</span>
          </div>
        </div>

        {/* Stepper dengan garis penghubung yang terisi */}
        <ol className="relative grid grid-cols-3 gap-2 pt-1" aria-label="Progres absen">
          <span aria-hidden="true" className="absolute left-[16.66%] right-[16.66%] top-[19px] h-[2px] bg-[#1A1A1A]/15" />
          <motion.span
            aria-hidden="true"
            className="absolute left-[16.66%] top-[19px] h-[2px] bg-[#7A1B2E]"
            initial={false}
            animate={{ width: `${(Math.min(doneCount, 2) / 2) * 66.67}%` }}
            transition={{ ...GLIDE, duration: 0.6, delay: 0.25 }}
          />
          {steps.map((s, i) => (
            <li
              key={s.label}
              className={`relative flex flex-col items-center gap-1.5 text-center font-mono text-[10.5px] font-bold uppercase ${
                s.state === 'done' ? 'text-[#7A1B2E]' : s.state === 'bad' ? 'text-red-600' : s.state === 'active' ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/45'
              }`}
            >
              <motion.span
                layout
                className={`relative z-10 grid h-8 w-8 place-items-center border-2 border-[#1A1A1A] font-[family-name:var(--font-outfit)] text-sm font-extrabold ${
                  s.state === 'done'
                    ? 'bg-[#7A1B2E] text-white'
                    : s.state === 'bad'
                      ? 'bg-red-600 text-white'
                      : s.state === 'active'
                        ? 'bg-[#FFF3C4] shadow-[3px_3px_0_#1A1A1A]'
                        : 'bg-white text-gray-400'
                }`}
                animate={s.state === 'active' && !reduced ? { y: [0, -3, 0] } : { y: 0 }}
                transition={s.state === 'active' ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : GLIDE}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={s.state}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 28, delay: 0.15 + i * 0.12 }}
                  >
                    {s.state === 'done' ? <Check className="h-4 w-4 stroke-[3.5]" /> : s.state === 'bad' ? <X className="h-4 w-4 stroke-[3.5]" /> : i + 1}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
              <span>{s.label}</span>
            </li>
          ))}
        </ol>

        {/* Aksi: tombol berubah bentuk jadi kartu status */}
        <AnimatePresence mode="wait" initial={false}>
          {st === 'belum' ? (
            <motion.button
              key="cta"
              type="button"
              onClick={onAbsen}
              disabled={sending}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              whileTap={{ scale: 0.97 }}
              className="flex w-full items-center justify-center gap-2.5 border-2 border-[#1A1A1A] bg-[#7A1B2E] px-6 py-4 font-[family-name:var(--font-outfit)] text-base font-extrabold uppercase text-white shadow-[5px_5px_0_#1A1A1A] transition-[background-color,box-shadow,transform] hover:bg-[#A62639] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-wait"
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Absen sekarang
                </>
              )}
            </motion.button>
          ) : (
            <motion.div
              key={st}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...GLIDE, delay: 0.3 }}
              className={`flex w-full items-center justify-center gap-2.5 border-2 border-[#1A1A1A] px-6 py-4 text-center font-mono text-xs font-bold uppercase shadow-[3px_3px_0_#1A1A1A] ${
                st === 'approved' ? 'bg-[#D1E7DD] text-green-900' : st === 'rejected' ? 'bg-[#F8D7DA] text-red-900' : 'bg-[#FFF9DC] text-amber-900'
              }`}
            >
              {st === 'approved' ? (
                <CheckCircle2 className="h-5 w-5 text-green-700" />
              ) : st === 'rejected' ? (
                <X className="h-5 w-5 text-red-700" />
              ) : (
                <WaitingDots />
              )}
              <span>
                {st === 'approved' ? 'Kamu tercatat hadir' : st === 'rejected' ? 'Absen ditolak — hubungi sekretaris' : 'Menunggu dicek sekretaris'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sobekan tiket (desktop) */}
      <div className="hidden flex-col items-center justify-center border-l-2 border-dashed border-[#1A1A1A] bg-[#F5F3EF] p-6 text-center md:flex">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/60">
          {start.toLocaleDateString('id-ID', { weekday: 'short', timeZone: TZ }).toUpperCase()}
        </span>
        <span className="my-1 font-[family-name:var(--font-outfit)] text-6xl font-black text-[#7A1B2E]">
          {start.toLocaleDateString('id-ID', { day: 'numeric', timeZone: TZ })}
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
          {start.toLocaleDateString('id-ID', { month: 'short', year: 'numeric', timeZone: TZ }).toUpperCase()}
        </span>
        <div className="mt-5 h-8 w-full bg-[repeating-linear-gradient(90deg,#1A1A1A_0_2px,transparent_2px_5px,#1A1A1A_5px_6px,transparent_6px_10px,#1A1A1A_10px_13px,transparent_13px_15px,#1A1A1A_15px_16px,transparent_16px_20px)] opacity-85" />
        <span className="mt-1 font-mono text-[9px] tracking-[0.2em] text-[#1A1A1A]/60">USRC · SESI</span>
      </div>
    </motion.article>
  )
}

// Tiga titik bergantian — pengganti jam pasir yang berputar.
function WaitingDots() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 bg-amber-800"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
