import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { DesktopNav, MobileTabBar, type NavItem } from './DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Get user profile & role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'anggota'
  const isSekreOrAdmin = role === 'sekre' || role === 'admin'

  const navItems: NavItem[] = [
    { href: '/', icon: 'home', label: 'Home', short: 'Home' },
    { href: '/dashboard', icon: 'feed', label: 'Feed', short: 'Feed' },
    { href: '/dashboard/absen', icon: 'absen', label: 'Absensi', short: 'Absen' },
    { href: '/profil', icon: 'profil', label: 'Profil', short: 'Profil' },
    ...(isSekreOrAdmin ? [{ href: '/dashboard/sekre', icon: 'sekre', label: 'Sekretariat', short: 'Sekre' } as NavItem] : []),
    ...(role === 'admin' ? [{ href: '/dashboard/admin', icon: 'admin', label: 'Panel Admin', short: 'Admin' } as NavItem] : []),
  ]

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#1A1A1A] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-[#1A1A1A] bg-white sticky top-0 z-50 px-4 py-2.5 md:py-3 shadow-[0_2px_0_#1A1A1A]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 bg-[#7A1B2E] border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center text-white font-black text-lg group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
              U
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider uppercase font-[family-name:var(--font-outfit)] text-[#7A1B2E]">USRC</span>
              <span className="block text-[10px] font-mono text-[#1A1A1A] -mt-1">// DASHBOARD</span>
            </div>
          </Link>

          {/* Nav desktop */}
          <DesktopNav items={navItems} />

          <div className="flex items-center gap-2 md:pl-3 md:border-l-2 border-[#1A1A1A] min-w-0">
            <div className="text-right min-w-0">
              <p className="text-xs font-bold truncate max-w-[140px] lg:max-w-[200px]">{profile?.full_name || user?.email}</p>
              <p className="text-[10px] font-mono uppercase bg-[#7A1B2E] text-white px-1.5 py-0.5 inline-block rounded-none">
                {role}
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                title="Keluar"
                aria-label="Keluar"
                className="w-9 h-9 border-2 border-[#1A1A1A] bg-white flex items-center justify-center hover:bg-[#F8D7DA] transition-colors shadow-[2px_2px_0_#1A1A1A]"
              >
                <LogOut className="w-4 h-4 text-[#7A1B2E]" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content — pb ekstra di mobile untuk tab bar bawah */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 pb-28 md:px-6 md:py-6 md:pb-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="hidden md:block border-t-2 border-[#1A1A1A] bg-white py-4 px-4 text-center text-xs font-mono text-[#1A1A1A]">
        <p>[USRC UBSI PONTIANAK] — Area Anggota & Sekretariat</p>
      </footer>

      {/* Tab bar bawah (mobile) */}
      <MobileTabBar items={navItems} />
    </div>
  )
}
