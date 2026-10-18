"use client";

import { Children, useEffect, useRef, useState } from "react";

/* Di mobile: deret kartu yang digeser horizontal (snap) + titik indikator,
   supaya section tidak memanjang ke bawah. Mulai `md`: grid biasa. */
export function MobileCarousel({
  children,
  gridClass = "md:grid-cols-2 lg:grid-cols-3",
  itemClass = "w-[84%]",
  label,
}: {
  children: React.ReactNode;
  gridClass?: string;
  itemClass?: string;
  label: string;
}) {
  const items = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.children[0] as HTMLElement | undefined;
      if (!first) return;
      const step = first.offsetWidth + 16;
      setActive(Math.min(items.length - 1, Math.round(el.scrollLeft / step)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const goTo = (i: number) => {
    const el = trackRef.current;
    const target = el?.children[i] as HTMLElement | undefined;
    if (el && target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft - 16, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={trackRef}
        aria-label={label}
        className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-5 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:gap-7 md:overflow-visible md:px-0 md:pb-0 ${gridClass}`}
      >
        {items.map((child, i) => (
          <div key={i} className={`shrink-0 snap-start md:w-auto ${itemClass}`}>
            {child}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-1 flex items-center justify-center gap-1.5 md:hidden">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ke kartu ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 border-2 border-dark transition-[width,background-color] duration-300 ease-[cubic-bezier(.32,.72,0,1)] ${
                i === active ? "w-6 bg-maroon" : "w-2 bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
