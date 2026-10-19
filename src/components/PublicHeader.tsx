import Link from "next/link";
import Image from "next/image";
import MobileNav from "@/components/MobileNav";
import PublicNavLinks from "@/components/PublicNavLinks";
import { MorphHeader } from "@/components/MorphHeader";
import { GuestTabBar } from "@/components/DashboardNav";

const BTN =
  "border-[3px] border-dark px-3 py-2 font-[family-name:var(--font-outfit)] text-sm font-black uppercase tracking-wider shadow-[3px_3px_0_#1A1A1A] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[4px_5px_0_#1A1A1A] active:translate-y-0 active:shadow-none md:px-5 md:py-2";

/* Navbar untuk tamu (belum login). Animasi scroll ada di MorphHeader. */
export default function PublicHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <>
    <MorphHeader>
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-10 w-10 rotate-[-3deg] items-center justify-center overflow-hidden border-[3px] border-dark bg-white p-0.5">
          <Image src="/logo-usrc-main.jpeg" alt="USRC Logo" width={40} height={40} className="h-full w-full object-contain" />
        </div>
        <span className="font-[family-name:var(--font-outfit)] text-2xl font-black uppercase tracking-tight text-dark">
          USRC
        </span>
      </Link>

      <PublicNavLinks />

      <div className="flex items-center gap-2">
        {loggedIn ? (
          <Link href="/dashboard" className={`${BTN} bg-maroon text-white`}>
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className={`${BTN} hidden bg-white text-dark md:inline-flex`}>
              Login
            </Link>
            <Link href="/daftar" className={`${BTN} hidden bg-maroon text-white md:inline-flex`}>
              Daftar
            </Link>
          </>
        )}
        <MobileNav />
      </div>
    </MorphHeader>
    {!loggedIn && <GuestTabBar />}
    </>
  );
}
