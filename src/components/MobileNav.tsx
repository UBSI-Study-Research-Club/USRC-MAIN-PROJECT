"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GLIDE } from "@/components/motion/Glide";

const NAV_LINKS = [
  { href: "/#tentang", no: "01", label: "Tentang" },
  { href: "/#sesi", no: "02", label: "Sesi" },
  { href: "/#karya", no: "03", label: "Karya" },
  { href: "/karya", no: "04", label: "Semua Karya" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger → X */}
      <button
        type="button"
        aria-label={open ? "Tutup menu navigasi" : "Buka menu navigasi"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative z-[2] flex h-11 w-11 flex-col items-center justify-center gap-1.5 border-2 border-dark shadow-[2px_2px_0px_var(--color-dark)] transition-[background-color,transform,box-shadow] duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
          open ? "bg-[#FFF3C4]" : "bg-white"
        }`}
      >
        <span className={`block h-0.5 w-6 bg-dark transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`block h-0.5 w-6 bg-dark transition-[opacity,transform] duration-200 ${open ? "scale-x-0 opacity-0" : ""}`} />
        <span className={`block h-0.5 w-6 bg-dark transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>

      {/* Latar redup — lewat portal karena navbar memakai transform
          (elemen fixed di dalamnya tidak akan menutupi layar) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.button
                key="mnav-backdrop"
                type="button"
                aria-label="Tutup menu"
                className="fixed inset-0 z-40 cursor-default bg-dark/30 backdrop-blur-[2px] md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setOpen(false)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}

      <AnimatePresence>
        {open && (
            <motion.div
              key="mnav-panel"
              className="absolute left-0 right-0 top-full z-40 mt-3 origin-top border-2 border-dark bg-white p-2 shadow-[5px_5px_0px_var(--color-maroon)]"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10, scaleY: 0.92 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scaleY: 0.96 }}
              transition={GLIDE}
            >
              <nav className="flex flex-col">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={reduced ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...GLIDE, delay: 0.05 + i * 0.045 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 border-2 border-transparent px-3 py-3 font-[family-name:var(--font-outfit)] text-base font-black uppercase tracking-wider text-dark transition-colors hover:border-dark hover:bg-[#FFF3C4] active:bg-[#FFF3C4]"
                    >
                      <span className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-bold text-maroon">{link.no}</span>
                      <span className="flex-1">{link.label}</span>
                      <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={2.5} />
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
