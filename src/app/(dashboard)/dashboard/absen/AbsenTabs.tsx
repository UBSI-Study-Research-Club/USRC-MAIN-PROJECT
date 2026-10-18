'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GlidePill } from '@/components/motion/Glide'

const TABS = [
  { href: '/dashboard/absen', label: 'Sesi Aktif' },
  { href: '/dashboard/absen/riwayat', label: 'Riwayat' },
]

export function AbsenTabs() {
  const pathname = usePathname()
  return (
    <div role="tablist" className="inline-flex self-start shrink-0 border-2 border-[#1A1A1A] bg-white p-1 shadow-[3px_3px_0_#1A1A1A]">
      {TABS.map((tab) => {
        const active =
          tab.href === '/dashboard/absen'
            ? pathname === '/dashboard/absen'
            : pathname.startsWith('/dashboard/absen/riwayat')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={`relative px-4 py-1.5 text-xs font-bold uppercase font-[family-name:var(--font-outfit)] tracking-wide transition-colors duration-200 ${
              active ? 'text-white' : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            {active && <GlidePill id="absen-tab" className="bg-[#7A1B2E]" />}
            <span className="relative z-10">{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
