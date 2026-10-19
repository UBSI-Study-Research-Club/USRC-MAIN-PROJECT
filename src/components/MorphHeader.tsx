"use client";

import { useEffect, useState } from "react";

const EASE = "ease-[cubic-bezier(.32,.72,0,1)]";

/* Kerangka navbar yang berubah bentuk saat scroll — dipakai navbar publik
   dan navbar anggota supaya perilakunya identik.
   Di atas halaman: kartu mengambang. Setelah di-scroll: bar ramping selebar layar.
   Supaya mulus, isi navbar (children) tidak pernah berubah ukuran/posisi
   horizontal — yang berubah hanya "pelat" latar kosong di belakangnya dan
   posisi vertikal isi lewat transform. Header fixed dengan tinggi tetap +
   ruang pengganti, jadi halaman di bawahnya tidak ikut bergeser. */
export function MorphHeader({ children }: { children: React.ReactNode }) {
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
        <div
          className={`pointer-events-auto relative mx-auto flex h-[74px] max-w-7xl items-center justify-between gap-4 px-7 transition-transform duration-500 will-change-transform md:h-[82px] md:px-12 ${EASE} ${
            scrolled ? "translate-y-[-5px] md:translate-y-[-9px]" : "translate-y-3 md:translate-y-5"
          }`}
        >
          {children}
        </div>
      </header>
    </>
  );
}
