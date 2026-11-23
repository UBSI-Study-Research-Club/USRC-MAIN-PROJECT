"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { GLIDE_EASE } from "@/components/motion/Glide";

/* Panel detail ala native app: geser dari kiri di desktop, full-screen di mobile.
   Pengganti modal tengah — konten panjang tetap lega & bisa di-scroll. */
export function SideSheet({
  open,
  onClose,
  label = "// detail",
  actions,
  children,
  footer,
  width = "sm:w-[min(600px,92vw)]",
}: {
  open: boolean;
  onClose: () => void;
  label?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  const reduced = useReducedMotion();
  // true hanya di client — portal butuh document.body
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-dark/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
            onClick={onClose}
          />
          <motion.aside
            className={`absolute inset-y-0 left-0 flex w-full flex-col border-r-[3px] border-dark bg-[#FFFDF7] shadow-[8px_0_0_#7A1B2E] will-change-transform ${width}`}
            initial={reduced ? { opacity: 0 } : { x: "-100%" }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: "-100%" }}
            transition={{ type: "tween", ease: GLIDE_EASE, duration: reduced ? 0 : 0.32 }}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b-[3px] border-dark bg-[#FFF3C4] py-2.5 pl-4 pr-3 pt-[max(10px,env(safe-area-inset-top))]">
              <span className="mr-auto min-w-0 truncate font-mono text-[11px] font-medium uppercase tracking-[.1em] text-dark">
                {label}
              </span>
              {actions}
              <SheetButton onClick={onClose} label="Tutup">
                <X className="h-4 w-4" strokeWidth={3} />
              </SheetButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">{children}</div>

            {footer && (
              <footer className="shrink-0 border-t-[3px] border-dark bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
                {footer}
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function SheetButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 shrink-0 place-items-center border-[3px] border-dark bg-white shadow-[3px_3px_0_#1A1A1A] transition-[transform,box-shadow,background-color,color] duration-150 hover:-translate-x-px hover:-translate-y-px hover:bg-maroon hover:text-white hover:shadow-[4px_4px_0_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
    >
      {children}
    </button>
  );
}
