"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlidePill } from "@/components/motion/Glide";

const LINKS = [
  { id: "tentang", no: "01", label: "Tentang", href: "/#tentang" },
  { id: "sesi", no: "02", label: "Sesi", href: "/#sesi" },
  { id: "karya", no: "03", label: "Karya", href: "/#karya" },
];

/* Nav desktop: blok kuning meluncur mengikuti hover, dan saat diam
   menempel di section yang sedang terlihat (scroll-spy). */
export default function PublicNavLinks() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const [inView, setInView] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setInView(visible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  const current = hovered ?? (pathname === "/" ? inView : pathname.startsWith("/karya") ? "karya" : null);

  return (
    <div
      className="hidden items-center border-2 border-dark bg-white p-1 shadow-[3px_3px_0_var(--color-dark)] md:flex"
      onMouseLeave={() => setHovered(null)}
    >
      {LINKS.map((l) => (
        <Link
          key={l.id}
          href={l.href}
          onMouseEnter={() => setHovered(l.id)}
          onFocus={() => setHovered(l.id)}
          onBlur={() => setHovered(null)}
          aria-current={inView === l.id ? "location" : undefined}
          className="relative flex items-center gap-1.5 px-3.5 py-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold uppercase tracking-wider text-dark"
        >
          {current === l.id && <GlidePill id="public-nav" className="border-2 border-dark bg-[#FFF3C4]" />}
          <span className="relative z-10 font-black text-maroon">{l.no}</span>
          <span className="relative z-10">{l.label}</span>
        </Link>
      ))}
    </div>
  );
}
