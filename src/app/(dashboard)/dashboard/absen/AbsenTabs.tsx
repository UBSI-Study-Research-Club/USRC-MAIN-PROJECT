'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/absen', label: 'Sesi Aktif' },
  { href: '/dashboard/absen/riwayat', label: 'Riwayat' },
]

export function AbsenTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-2">
      {TABS.map((tab) => {
        const active =
          tab.href === '/dashboard/absen'
            ? pathname === '/dashboard/absen'
            : pathname.startsWith('/dashboard/absen/riwayat')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold uppercase font-['Outfit'] shadow-[2px_2px_0_#1A1A1A] transition-colors ${
              active
                ? 'bg-[#7A1B2E] text-white shadow-[1px_1px_0_#1A1A1A] translate-x-[1px] translate-y-[1px]'
                : 'bg-[#F5F3EF] text-[#1A1A1A] hover:bg-[#7A1B2E] hover:text-white'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
