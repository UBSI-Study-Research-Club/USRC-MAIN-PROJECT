"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";

// Kurva "glide" ala native iOS — cepat di awal, mendarat halus.
export const GLIDE_EASE = [0.32, 0.72, 0, 1] as const;
export const GLIDE: Transition = { type: "tween", ease: GLIDE_EASE, duration: 0.34 };

/* Penanda aktif yang meluncur antar item (tab, nav, filter).
   Taruh di dalam item yang `relative`; semua item satu grup pakai `id` yang sama,
   framer-motion menganimasikan perpindahannya lewat layoutId. */
export function GlidePill({ id, className = "" }: { id: string; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      layoutId={id}
      aria-hidden="true"
      transition={reduced ? { duration: 0 } : GLIDE}
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
    />
  );
}
