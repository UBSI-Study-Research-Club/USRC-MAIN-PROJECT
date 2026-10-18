"use client";

import { useEffect, useRef } from "react";

// Wordmark "USRC" bergaya pixel-art: tiap huruf disusun dari blok persegi
// dengan outline putih tipis.
// Interaksi:
// - pixel di sekitar kursor menyala, membesar & terangkat (makin dekat makin kuat)
// - klik memunculkan riak yang menyebar dari titik klik
// Style ditulis langsung ke DOM per frame (rAF), bukan lewat state React,
// supaya tetap ringan walau ada puluhan blok.

const GLYPHS: Record<string, string[]> = {
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
};

const CELL = 10; // ukuran satu pixel (unit SVG)
const GAP = 1.6; // celah antar pixel
const LETTER_GAP = 2; // jarak antar huruf (dalam pixel)
const RADIUS = 42; // jangkauan efek kursor (unit SVG)

export function PixelWordmark({ text = "USRC", className = "" }: { text?: string; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const letters = text.split("");
  const cols = letters.length * 5 + (letters.length - 1) * LETTER_GAP;
  const width = cols * CELL;
  const height = 7 * CELL;

  const pixels: { x: number; y: number }[] = [];
  letters.forEach((ch, li) => {
    const glyph = GLYPHS[ch];
    if (!glyph) return;
    const offset = li * (5 + LETTER_GAP);
    glyph.forEach((row, y) =>
      row.split("").forEach((bit, x) => {
        if (bit === "1") pixels.push({ x: (offset + x) * CELL, y: y * CELL });
      })
    );
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rects = Array.from(svg.querySelectorAll<SVGRectElement>("rect"));
    const centers = rects.map((r) => ({
      cx: Number(r.getAttribute("x")) + (CELL - GAP) / 2,
      cy: Number(r.getAttribute("y")) + (CELL - GAP) / 2,
    }));
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const toSvg = (e: PointerEvent) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      return { x: pt.x, y: pt.y };
    };

    const paint = () => {
      frame = 0;
      rects.forEach((r, i) => {
        let t = 0;
        if (pointer) {
          const d = Math.hypot(centers[i].cx - pointer.x, centers[i].cy - pointer.y);
          t = Math.max(0, 1 - d / RADIUS);
          t = t * t * (3 - 2 * t); // smoothstep — tepi efek lembut
        }
        r.style.setProperty("--t", t.toFixed(3));
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onMove = (e: PointerEvent) => {
      pointer = toSvg(e);
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };
    const onDown = (e: PointerEvent) => {
      const p = toSvg(e);
      if (!p) return;
      rects.forEach((r, i) => {
        const d = Math.hypot(centers[i].cx - p.x, centers[i].cy - p.y);
        r.style.setProperty("--rd", `${Math.round(d * 4)}ms`);
        r.classList.remove("px-ripple");
        // paksa reflow supaya animasi bisa diulang saat klik berikutnya
        void r.getBoundingClientRect();
        r.classList.add("px-ripple");
      });
    };

    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerleave", onLeave);
    svg.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(frame);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerleave", onLeave);
      svg.removeEventListener("pointerdown", onDown);
    };
  }, [text]);

  return (
    <svg
      ref={svgRef}
      viewBox={`-6 -6 ${width + 12} ${height + 12}`}
      className={`px-wordmark ${className}`}
      role="img"
      aria-label={text}
    >
      {pixels.map((p, i) => (
        <rect key={i} x={p.x + GAP / 2} y={p.y + GAP / 2} width={CELL - GAP} height={CELL - GAP} />
      ))}
    </svg>
  );
}
