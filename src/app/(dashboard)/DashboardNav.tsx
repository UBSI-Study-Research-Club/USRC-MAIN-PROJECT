'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, ClipboardList, User, Users, ShieldCheck } from 'lucide-react'
import { GlidePill } from '@/components/motion/Glide'

const ICONS = { home: Home, feed: LayoutGrid, absen: ClipboardList, profil: User, sekre: Users, admin: ShieldCheck }

export type NavItem = { href: string; label: string; short: string; icon: keyof typeof ICONS }

function useActive() {
  const pathname = usePathname()
  return (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
}

/* Nav desktop: satu blok maroon meluncur ke item yang di-hover,
   lalu kembali ke halaman aktif saat kursor keluar. */
export function DesktopNav({ items }: { items: NavItem[] }) {
  const isActive = useActive()
  const [hovered, setHovered] = useState<string | null>(null)
  const activeHref = items.find((i) => isActive(i.href))?.href ?? null
  const target = hovered ?? activeHref

  return (
    <nav
      className="hidden items-center border-2 border-[#1A1A1A] bg-white p-1 shadow-[3px_3px_0_#1A1A1A] md:flex"
      onMouseLeave={() => setHovered(null)}
    >
      {items.map(({ href, label, short, icon }) => {
        const Icon = ICONS[icon]
        const lit = target === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={activeHref === href ? 'page' : undefined}
            onMouseEnter={() => setHovered(href)}
            onFocus={() => setHovered(href)}
            onBlur={() => setHovered(null)}
            className={`relative flex items-center whitespace-nowrap px-3 py-1.5 text-xs font-bold uppercase transition-colors duration-200 ${
              lit ? (activeHref === href ? 'text-white' : 'text-[#1A1A1A]') : 'text-[#1A1A1A]/70'
            }`}
          >
            {lit && (
              <GlidePill
                id="dash-nav"
                className={activeHref === href ? 'bg-[#7A1B2E]' : 'bg-[#FFF3C4]'}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="h-4 w-4" />
              <span className="lg:hidden">{short}</span>
              <span className="hidden lg:inline">{label}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const isActive = useActive()
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t-[3px] border-[#1A1A1A] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-3px_0_#7A1B2E] md:hidden"
    >
      {items.map(({ href, short, icon }) => {
        const Icon = ICONS[icon]
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center py-2 text-[10px] font-bold uppercase tracking-wide transition-colors duration-200 ${
              active ? 'text-white' : 'text-[#1A1A1A] active:bg-[#FFF3C4]'
            }`}
          >
            {active && <GlidePill id="dash-tab" className="bg-[#7A1B2E]" />}
            <span className="relative z-10 flex min-w-0 max-w-full flex-col items-center gap-0.5">
              <Icon className="h-5 w-5" strokeWidth={2.25} />
              <span className="max-w-full truncate px-0.5">{short}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
