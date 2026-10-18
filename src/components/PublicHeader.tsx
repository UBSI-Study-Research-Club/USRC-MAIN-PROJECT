"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MobileNav from "@/components/MobileNav";
import PublicNavLinks from "@/components/PublicNavLinks";

const EASE = "ease-[cubic-bezier(.32,.72,0,1)]";
const BTN =
  "border-[3px] border-dark px-3 py-2 font-[family-name:var(--font-outfit)] text-sm font-black uppercase tracking-wider shadow-[3px_3px_0_#1A1A1A] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[4px_5px_0_#1A1A1A] active:translate-y-0 active:shadow-none md:px-5 md:py-2";

/* Navbar publik.
   Di atas halaman: kartu mengambang. Saat di-scroll: bar ramping selebar layar.
   Supaya transisinya mulus, isi navbar (logo, menu, tombol) TIDAK pernah berubah
   ukuran/posisi horizontal — yang berubah hanya:
   - "pelat" latar kosong di belakangnya (melebar & memendek), dan
   - posisi vertikal isi lewat transform (murah, tanpa hitung ulang layout).
   Header sendiri fixed dengan tinggi tetap + ruang pengganti, jadi halaman
   di bawahnya tidak pernah ikut bergeser. */
export default function PublicHeader({ loggedIn }: { loggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Ambang ganda (masuk 48px, keluar 8px) supaya tidak bolak-balik di sekitar batas.
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((prev) => (prev ? y > 8 : y > 48));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div aria-hidden="true" className="h-[98px] md:h-[122px]" />
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[98px] md:h-[122px]">
        {/* Pelat latar yang berubah bentuk */}
        <div
          aria-hidden="true"
          className={`pointer-events-auto absolute border-[3px] border-dark bg-white transition-[top,left,right,height,box-shadow] duration-500 ${EASE} ${
            scrolled
              ? "-left-[3px] -right-[3px] -top-[3px] h-[67px] shadow-[0_3px_0_#7A1B2E]"
              : "left-3 right-3 top-3 h-[74px] shadow-[5px_5px_0_#1A1A1A] md:left-[max(24px,calc((100%-1280px)/2))] md:right-[max(24px,calc((100%-1280px)/2))] md:top-5 md:h-[82px]"
          }`}
        />

        {/* Isi: posisi horizontal tetap, hanya digeser vertikal */}
        <nav
          className={`pointer-events-auto relative mx-auto flex h-[74px] max-w-7xl items-center justify-between px-7 transition-transform duration-500 will-change-transform md:h-[82px] md:px-12 ${EASE} ${
            scrolled ? "translate-y-[-5px] md:translate-y-[-9px]" : "translate-y-3 md:translate-y-5"
          }`}
        >
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
                <Link href="/login" className={`${BTN} bg-white text-dark`}>
                  Login
                </Link>
                <Link href="/daftar" className={`${BTN} bg-maroon text-white`}>
                  Daftar
                </Link>
              </>
            )}
            <MobileNav />
          </div>
        </nav>
      </header>
    </>
  );
}
