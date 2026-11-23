import Link from 'next/link'
import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { DesktopNav, MobileTabBar, type NavItem } from './DashboardNav'
import { MorphHeader } from './MorphHeader'

// Navbar untuk anggota yang sudah login — dipakai di area dashboard DAN halaman
// publik (homepage, halaman karya), supaya navigasinya sama di mana pun.
export function navItemsFor(role: string): NavItem[] {
  const isSekreOrAdmin = role === 'sekre' || role === 'admin'
  return [
    { href: '/', icon: 'home', label: 'Home', short: 'Home' },
    { href: '/dashboard', icon: 'feed', label: 'Feed', short: 'Feed' },
    { href: '/dashboard/absen', icon: 'absen', label: 'Absensi', short: 'Absen' },
    { href: '/profil', icon: 'profil', label: 'Profil', short: 'Profil' },
    ...(isSekreOrAdmin ? [{ href: '/dashboard/sekre', icon: 'sekre', label: 'Sekretariat', short: 'Sekre' } as NavItem] : []),
    ...(role === 'admin' ? [{ href: '/dashboard/admin', icon: 'admin', label: 'Panel Admin', short: 'Admin' } as NavItem] : []),
  ]
}

export function AppHeader({ name, role }: { name: string; role: string }) {
  const items = navItemsFor(role)
  return (
    <>
      <MorphHeader>
        <Link href="/dashboard" className="group flex shrink-0 items-center gap-2">
          <div className="flex h-10 w-10 rotate-[-3deg] items-center justify-center overflow-hidden border-[3px] border-dark bg-white p-0.5 transition-transform group-hover:rotate-0">
            <Image src="/logo-usrc-main.jpeg" alt="Logo USRC" width={40} height={40} className="h-full w-full object-contain" />
          </div>
          <span className="font-[family-name:var(--font-outfit)] text-2xl font-black uppercase tracking-tight text-dark">USRC</span>
        </Link>

        {/* Kanan: menu + identitas + keluar, satu kelompok */}
        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <DesktopNav items={items} />

          <div className="flex min-w-0 items-center gap-2 border-[#1A1A1A] md:border-l-2 md:pl-3 lg:pl-4">
            <div className="min-w-0 text-right md:hidden lg:block">
              <p className="max-w-[140px] truncate text-xs font-bold lg:max-w-[180px]">{name}</p>
              <p className="inline-block rounded-none bg-[#7A1B2E] px-1.5 py-0.5 font-mono text-[10px] uppercase text-white">{role}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Keluar"
                aria-label="Keluar"
                className="flex h-9 w-9 items-center justify-center border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0_#1A1A1A] transition-colors hover:bg-[#F8D7DA]"
              >
                <LogOut className="h-4 w-4 text-[#7A1B2E]" />
              </button>
            </form>
          </div>
        </div>
      </MorphHeader>
      <MobileTabBar items={items} />
    </>
  )
}
