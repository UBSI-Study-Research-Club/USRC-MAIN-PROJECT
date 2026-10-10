import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Users, ClipboardList, LogOut, Home, User } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#1A1A1A] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b-2 border-[#1A1A1A] bg-white sticky top-0 z-50 px-4 py-3 shadow-[0_2px_0_#1A1A1A]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/absen" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-[#7A1B2E] border-2 border-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] flex items-center justify-center text-white font-black text-lg group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform">
              U
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider uppercase font-['Outfit'] text-[#7A1B2E]">USRC</span>
              <span className="block text-[10px] font-mono text-[#1A1A1A] -mt-1">// DASHBOARD</span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 md:gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold uppercase shadow-[2px_2px_0_#1A1A1A] bg-[#F5F3EF] hover:bg-[#7A1B2E] hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <Link 
              href="/absen" 
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold uppercase shadow-[2px_2px_0_#1A1A1A] bg-[#F5F3EF] hover:bg-[#7A1B2E] hover:text-white transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Absen Anggota</span>
            </Link>

            <Link 
              href="/profil" 
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold uppercase shadow-[2px_2px_0_#1A1A1A] bg-[#F5F3EF] hover:bg-[#7A1B2E] hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profil</span>
            </Link>

            {isSekreOrAdmin && (
              <Link 
                href="/dashboard/sekre" 
                className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold uppercase shadow-[2px_2px_0_#1A1A1A] bg-[#FFF3C4] hover:bg-[#7A1B2E] hover:text-white transition-colors"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard Sekre</span>
              </Link>
            )}

            <div className="flex items-center gap-2 pl-2 border-l-2 border-[#1A1A1A]">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold">{profile?.full_name || user.email}</p>
                <p className="text-[10px] font-mono uppercase bg-[#7A1B2E] text-white px-1.5 py-0.5 inline-block rounded-none">
                  {role}
                </p>
              </div>
              <form action="/auth/signout" method="post">
                <button 
                  type="submit"
                  title="Keluar"
                  className="w-8 h-8 border-2 border-[#1A1A1A] bg-white flex items-center justify-center hover:bg-[#F8D7DA] transition-colors shadow-[2px_2px_0_#1A1A1A]"
                >
                  <LogOut className="w-4 h-4 text-[#7A1B2E]" />
                </button>
              </form>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#1A1A1A] bg-white py-4 px-4 text-center text-xs font-mono text-[#1A1A1A]">
        <p>[USRC UBSI PONTIANAK] — Area Anggota & Sekretariat</p>
      </footer>
    </div>
  )
}
