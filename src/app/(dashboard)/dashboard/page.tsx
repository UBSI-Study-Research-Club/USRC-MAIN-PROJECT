"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, Calendar, CheckCircle2, Clock, ChevronDown } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useFeed } from "@/hooks/useFeed";
import { useAbsenStatus } from "@/hooks/useAbsenStatus";
import { FeedCard } from "@/components/FeedCard";

// ── Absen Banner ────────────────────────────────────────────
function AbsenBanner() {
  const { items, loading, error } = useAbsenStatus();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#666] font-mono">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat sesi...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 font-mono">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );
  }
  if (!items.length) {
    return (
      <p className="text-sm font-mono text-[#888]">
        // Tidak ada sesi aktif atau mendatang.
      </p>
    );
  }

  const active = items.filter((m) => {
    const now = Date.now();
    return new Date(m.starts_at).getTime() <= now && new Date(m.ends_at).getTime() >= now;
  });

  return (
    <div className="flex flex-col gap-2">
      {active.length > 0 && (
        <div className="bg-maroon text-white border-2 border-dark shadow-[4px_4px_0px_var(--color-dark)] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold font-mono">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>SESI AKTIF: {active[0].title}</span>
          </div>
          {active[0].status === null ? (
            <Link
              href="/absen"
              className="text-xs font-mono font-bold bg-white text-maroon border-2 border-white px-3 py-1.5 hover:bg-paper transition-all shrink-0 shadow-[2px_2px_0px_var(--color-dark)]"
            >
              ABSEN SEKARANG →
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-xs font-mono">
              <CheckCircle2 className="w-3 h-3" />
              {active[0].status === "approved" ? "Approved" : "Pending"}
            </span>
          )}
        </div>
      )}

      {/* Sesi mendatang */}
      {items
        .filter((m) => new Date(m.starts_at).getTime() > Date.now())
        .slice(0, 2)
        .map((m) => (
          <div
            key={m.meetingId}
            className="flex items-center gap-2 text-xs font-mono text-dark border-2 border-dark px-3 py-1.5 bg-paper shadow-[2px_2px_0px_var(--color-dark)]"
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{m.title}</span>
            <span className="ml-auto shrink-0 text-dark/60">
              {new Date(m.starts_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
    </div>
  );
}

/* Scroll-reveal: fade + rise, sekali jalan, hormat reduced-motion */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Feed Timeline ─────────────────────────────────────────
function FeedTimeline() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { items, loading, error, hasMore, loadMore, toggleStar } = useFeed();
  const [, startTransition] = useTransition();

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-[#888]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="font-mono text-sm">// Memuat karya anggota...</span>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex items-center gap-2 text-red-600 font-mono text-sm py-8">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-16 text-center font-mono text-sm text-[#888]">
        // Belum ada karya yang di-approve. Jadilah yang pertama upload!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {items.map((project, idx) => (
        <Reveal key={project.id} delay={idx * 0.1}>
          <div className="border-2 border-dark bg-white shadow-[4px_4px_0px_var(--color-dark)] hover:shadow-[6px_6px_0px_var(--color-maroon)] transition-all hover:-translate-y-1">
            <FeedCard
              project={project}
              currentUserId={currentUserId}
              onToggleStar={(id, starred) =>
                startTransition(() => toggleStar(id, starred))
              }
            />
          </div>
        </Reveal>
      ))}

      {hasMore && (
        <Reveal>
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full border-2 border-dark bg-paper py-3 font-mono text-sm flex items-center justify-center gap-2 hover:bg-maroon hover:text-white transition-all disabled:opacity-50 shadow-[3px_3px_0px_var(--color-dark)] hover:shadow-[5px_5px_0px_var(--color-maroon)]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> Muat lebih banyak
              </>
            )}
          </button>
        </Reveal>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function DashboardPage() {
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const headerY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const headerRotate = useTransform(scrollYProgress, [0, 1], [2, 0]);

  return (
    <div ref={sectionRef} className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* Absen Banner */}
      <section aria-label="Status Absen">
        <div className="flex items-center justify-between mb-3">
          <motion.div
            style={prefersReduced ? {} : { y: headerY, rotate: headerRotate }}
            className="flex items-center gap-3"
          >
            <div className="h-6 w-6 border-2 border-dark bg-maroon flex items-center justify-center">
              <Calendar className="w-3 h-3 text-white" />
            </div>
            <h2 className="font-extrabold text-sm uppercase tracking-widest font-mono text-[#7A1B2E]">
              // Absen
            </h2>
          </motion.div>
          <Link
            href="/absen"
            className="text-xs font-mono text-[#888] hover:text-[#1A1A1A] underline underline-offset-2"
          >
            Lihat riwayat →
          </Link>
        </div>
        <AbsenBanner />
      </section>

      <hr className="border-t-2 border-[#1A1A1A]" />

      {/* Feed Timeline */}
      <section aria-label="Feed Karya Anggota">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 border-2 border-dark bg-dark flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9 12 2 19l10-3 10 3-7-7-3-10z" />
              </svg>
            </div>
            <h2 className="font-extrabold text-sm uppercase tracking-widest font-mono text-[#1A1A1A]">
              // Timeline Karya
            </h2>
          </div>
          <Link
            href="/karya"
            className="text-xs font-mono text-[#888] hover:text-[#1A1A1A] underline underline-offset-2"
          >
            Lihat semua →
          </Link>
        </div>
        <FeedTimeline />
      </section>
    </div>
  );
}
