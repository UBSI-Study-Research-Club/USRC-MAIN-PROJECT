"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/#tentang", label: "Tentang" },
  { href: "/#sesi", label: "Sesi" },
  { href: "/#karya", label: "Karya" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger Toggle */}
      <button
        type="button"
        aria-label="Buka menu navigasi"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 border-2 border-dark bg-white shadow-[2px_2px_0px_var(--color-dark)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        {/* Icon animasi menjadi X saat terbuka */}
        <span
          className={`block h-0.5 w-6 bg-dark transition-transform duration-200 ${open ? "translate-y-1 rotate-45" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-dark transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-6 bg-dark transition-transform duration-200 ${open ? "-translate-y-1 -rotate-45" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 border-2 border-dark bg-white p-3 shadow-[4px_4px_0px_var(--color-maroon)]">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-2 border-transparent px-4 py-3 font-[family-name:var(--font-outfit)] text-base font-black uppercase tracking-wider text-dark transition-colors hover:border-dark hover:bg-[#FFF3C4]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
