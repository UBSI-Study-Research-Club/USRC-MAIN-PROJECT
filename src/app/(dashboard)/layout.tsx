import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'anggota'

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#1A1A1A] flex flex-col font-sans">
      <AppHeader name={profile?.full_name || user.email || 'Anggota'} role={role} />

      {/* Main Content — pb ekstra di mobile untuk tab bar bawah */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-2 pb-28 md:px-6 md:pt-3 md:pb-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="hidden md:block border-t-2 border-[#1A1A1A] bg-white py-4 px-4 text-center text-xs font-mono text-[#1A1A1A]">
        <p>[USRC UBSI PONTIANAK] — Area Anggota & Sekretariat</p>
      </footer>
    </div>
  )
}
