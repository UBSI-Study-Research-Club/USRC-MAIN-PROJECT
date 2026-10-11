'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLink({ 
  href, 
  children, 
  defaultBg = "bg-[#F5F3EF]" 
}: { 
  href: string 
  children: React.ReactNode 
  defaultBg?: string 
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link 
      href={href} 
      className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#1A1A1A] text-xs font-bold uppercase shadow-[2px_2px_0_#1A1A1A] transition-colors ${
        isActive 
          ? 'bg-[#7A1B2E] text-white shadow-[1px_1px_0_#1A1A1A] translate-x-[1px] translate-y-[1px]' 
          : `${defaultBg} hover:bg-[#7A1B2E] hover:text-white`
      }`}
    >
      {children}
    </Link>
  )
}
