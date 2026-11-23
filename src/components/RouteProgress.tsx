"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/* Bar loading tipis di atas layar yang mengikuti navigasi sungguhan:
   - mulai begitu link internal diklik,
   - merayap pelan menuju ~90% selama halaman baru dimuat,
   - penuh lalu menghilang saat pathname benar-benar berganti.
   Ditulis langsung ke DOM (tanpa state React) supaya tidak memicu render ulang. */
export default function RouteProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const value = useRef(0);
  const running = useRef(false);

  const set = (v: number, visible = true) => {
    const el = barRef.current;
    if (!el) return;
    value.current = v;
    el.style.transform = `scaleX(${v})`;
    el.style.opacity = visible ? "1" : "0";
  };

  const stopTimers = () => {
    if (timer.current) clearInterval(timer.current);
    if (safety.current) clearTimeout(safety.current);
    timer.current = null;
    safety.current = null;
  };

  const done = () => {
    if (!running.current) return;
    running.current = false;
    stopTimers();
    set(1);
    // pudar setelah penuh, lalu reset ke 0 tanpa animasi
    setTimeout(() => {
      if (!running.current) set(1, false);
    }, 200);
    setTimeout(() => {
      const el = barRef.current;
      if (running.current || !el) return;
      el.style.transition = "none";
      set(0, false);
      void el.offsetWidth;
      el.style.transition = "";
    }, 450);
  };

  const start = () => {
    if (running.current) return;
    running.current = true;
    set(0.12);
    timer.current = setInterval(() => set(value.current + (0.9 - value.current) * 0.1), 180);
    safety.current = setTimeout(done, 12000);
  };

  // Navigasi selesai → pathname berganti
  useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      // anchor di halaman yang sama (#tentang dsb.) bukan navigasi
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onPop = () => start();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      stopTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]">
      <div
        ref={barRef}
        className="h-full origin-left bg-maroon shadow-[0_0_8px_rgba(166,38,57,.7)] transition-[transform,opacity] duration-200 ease-out"
        style={{ transform: "scaleX(0)", opacity: 0 }}
      />
    </div>
  );
}
