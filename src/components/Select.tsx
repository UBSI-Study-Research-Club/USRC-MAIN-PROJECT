"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";

export type SelectOption = { value: string; label: string; hint?: string };
type Pos = { left: number; top: number; width: number; up: boolean; maxH: number };

// Posisi daftar relatif ke tombol; buka ke atas bila ruang di bawah sempit.
function measure(el: HTMLElement | null): Pos | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const below = window.innerHeight - r.bottom - 12;
  const above = r.top - 12;
  const up = below < 220 && above > below;
  return { left: r.left, top: up ? r.top : r.bottom, width: r.width, up, maxH: Math.min(288, Math.max(160, up ? above : below)) };
}

/* Dropdown custom pengganti <select> bawaan browser.
   - Daftar pilihan dirender lewat portal (position: fixed), jadi tidak terpotong
     oleh modal/panel yang memakai overflow.
   - Keyboard: ↑ ↓ Home End untuk pindah, Enter/Spasi pilih, Esc tutup,
     ketik huruf untuk loncat ke pilihan yang diawali huruf itu.
   - Otomatis membuka ke atas kalau ruang di bawah tidak cukup.
   - `searchable` menambahkan kolom cari (berguna untuk daftar panjang). */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Pilih…",
  id,
  disabled,
  size = "md",
  searchable,
  className = "",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly (SelectOption | string)[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  searchable?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const opts: SelectOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = opts.find((o) => o.value === value) ?? null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Pos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ text: "", t: 0 });
  const listId = useId();
  const reduced = useReducedMotion();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const filtered = query.trim()
    ? opts.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : opts;

  const openList = () => {
    if (disabled) return;
    setPos(measure(triggerRef.current));
    setQuery("");
    setActive(Math.max(0, opts.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };
  const choose = (o: SelectOption) => {
    onChange(o.value);
    close();
  };

  // Ikuti posisi tombol saat halaman/panel di-scroll atau ukuran layar berubah
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => setPos(measure(triggerRef.current));
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Klik di luar menutup
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Fokus ke kolom cari / pastikan opsi aktif terlihat
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") { close(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); return; }
    if (e.key === "Home") { e.preventDefault(); setActive(0); return; }
    if (e.key === "End") { e.preventDefault(); setActive(filtered.length - 1); return; }
    if (e.key === "Enter" || (e.key === " " && !searchable)) {
      e.preventDefault();
      if (filtered[active]) choose(filtered[active]);
      return;
    }
    // ketik huruf → loncat (tanpa kolom cari)
    if (!searchable && e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const ta = typeahead.current;
      ta.text = now - ta.t > 600 ? e.key.toLowerCase() : ta.text + e.key.toLowerCase();
      ta.t = now;
      const i = filtered.findIndex((o) => o.label.toLowerCase().startsWith(ta.text));
      if (i >= 0) setActive(i);
    }
  };

  const sizeCls = size === "sm" ? "min-h-9 px-2.5 py-1.5 text-xs" : "min-h-11 px-3 py-2.5 text-sm";

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 border-2 border-dark bg-white text-left text-dark transition-shadow focus:outline-none focus-visible:shadow-[4px_4px_0_#7A1B2E] disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "shadow-[4px_4px_0_#7A1B2E]" : ""
        } ${sizeCls} ${className}`}
      >
        <span className={`min-w-0 truncate ${selected ? "font-semibold" : "text-dark/45"}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2.5} />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={listRef}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: pos.up ? 6 : -6, scaleY: 0.96 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: pos.up ? 4 : -4, scaleY: 0.98 }}
                transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
                className={`fixed z-[300] flex flex-col border-2 border-dark bg-white shadow-[5px_5px_0_#1A1A1A] ${pos.up ? "origin-bottom" : "origin-top"}`}
                style={{
                  left: pos.left,
                  width: Math.max(pos.width, 180),
                  ...(pos.up ? { bottom: window.innerHeight - pos.top + 6 } : { top: pos.top + 6 }),
                  maxHeight: pos.maxH,
                }}
                onKeyDown={onKeyDown}
              >
                {searchable && (
                  <div className="flex items-center gap-2 border-b-2 border-dark px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-dark/40" />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                      placeholder="Cari…"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-dark/40"
                    />
                  </div>
                )}
                <div id={listId} role="listbox" aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                  {filtered.length === 0 && <p className="px-3 py-3 text-sm text-dark/50">Tidak ada hasil.</p>}
                  {filtered.map((o, i) => {
                    const isSel = o.value === value;
                    return (
                      <div
                        key={o.value}
                        id={`${listId}-${i}`}
                        data-i={i}
                        role="option"
                        aria-selected={isSel}
                        onPointerEnter={() => setActive(i)}
                        onClick={() => choose(o)}
                        className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm transition-colors ${
                          i === active ? "bg-[#FFF3C4]" : ""
                        } ${isSel ? "font-bold text-maroon" : "text-dark"}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{o.label}</span>
                          {o.hint && <span className="block truncate font-mono text-[10px] text-dark/50">{o.hint}</span>}
                        </span>
                        {isSel && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
