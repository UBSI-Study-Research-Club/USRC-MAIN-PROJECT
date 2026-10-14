"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Calendar, CheckCircle2, Clock, Sparkles, ArrowRight, FolderKanban } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useFeed } from "@/hooks/useFeed";
import { useAbsenStatus } from "@/hooks/useAbsenStatus";
import { FeedCard } from "@/components/FeedCard";
import { PixelStoryContainer } from "@/components/pixel/PixelStoryContainer";
import { GhostScreen } from "./absen/shared";

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";

// ── Absen Banner (Ticket Card Style) ──────────────────────────
function AbsenBanner() {
  const { items, loading, error } = useAbsenStatus();

  if (loading) {
    return (
      <div className="flex items-center gap-2 border-2 border-dark bg-white p-4 shadow-[4px_4px_0_#1A1A1A] font-mono text-xs text-dark/70">
        <Loader2 className="w-4 h-4 animate-spin text-maroon" /> Memuat jadwal sesi aktif...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 border-2 border-dark bg-[#F8D7DA] p-4 shadow-[4px_4px_0_#1A1A1A] font-mono text-xs text-dark">
        <AlertCircle className="w-4 h-4 text-maroon" /> {error}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="border-2 border-dark bg-white p-5 shadow-[4px_4px_0_#1A1A1A] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFF3C4] border-2 border-dark flex items-center justify-center font-black text-maroon">
            0
          </div>
          <div>
            <h3 className={`${FONT_DISPLAY} font-black uppercase text-dark text-sm`}>Belum Ada Sesi Aktif</h3>
            <p className={`${FONT_MONO} text-[11px] text-dark/60`}>Nantikan pengumuman sesi berikutnya dari sekretaris.</p>
          </div>
        </div>
      </div>
    );
  }

  const active = items.filter((m) => {
    const now = Date.now();
    return new Date(m.starts_at).getTime() <= now && new Date(m.ends_at).getTime() >= now;
  });

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <div className="relative flex border-[3px] border-dark bg-white shadow-[6px_6px_0_var(--color-maroon)] overflow-hidden">
          {/* Left accent strip */}
          <div className="w-3 bg-maroon border-r-[3px] border-dark" />
          
          <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className={`${FONT_MONO} inline-block bg-[#FFF3C4] border-2 border-dark px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-dark`}>
                Sesi Berlangsung Sekarang
              </span>
              <h3 className={`${FONT_DISPLAY} text-xl font-black uppercase tracking-tight text-dark`}>
                {active[0].title}
              </h3>
              <p className={`${FONT_MONO} text-xs text-dark/60`}>
                Absensi kehadiran untuk sesi ini sedang dibuka.
              </p>
            </div>

            {active[0].status === null ? (
              <Link
                href="/dashboard/absen"
                className={`${FONT_DISPLAY} inline-flex items-center justify-center gap-2 border-[3px] border-dark bg-maroon px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#1A1A1A] hover:bg-hot transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
              >
                <span>Absen Sekarang</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
            ) : (
              <div className="flex items-center gap-2 border-2 border-dark bg-[#D1E7DD] px-4 py-2.5 font-mono text-xs font-bold text-dark">
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                <span>Status: {active[0].status === "approved" ? "Hadir (Approved)" : "Menunggu Approval"}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upcoming sessions preview */}
      {items
        .filter((m) => new Date(m.starts_at).getTime() > Date.now())
        .slice(0, 2)
        .map((m) => (
          <div
            key={m.meetingId}
            className="flex items-center justify-between border-2 border-dark bg-paper p-4 shadow-[3px_3px_0_#1A1A1A]"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-maroon" strokeWidth={2.5} />
              <div>
                <h4 className={`${FONT_DISPLAY} font-bold uppercase text-sm text-dark`}>{m.title}</h4>
                <p className={`${FONT_MONO} text-[11px] text-dark/60`}>
                  Mulai: {new Date(m.starts_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB
                </p>
              </div>
            </div>
            <span className={`${FONT_MONO} text-[10px] border border-dark bg-white px-2.5 py-1 font-bold uppercase text-dark`}>
              Mendatang
            </span>
          </div>
        ))}
    </div>
  );
}

/* Scroll-reveal: fade + rise, sekali jalan, hormat reduced-motion — Iwan (PR #68) */
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
      <div className="flex flex-col items-center justify-center py-20 border-[3px] border-dark bg-white shadow-[6px_6px_0_#1A1A1A]">
        <Loader2 className="w-8 h-8 animate-spin text-maroon mb-3" />
        <span className={`${FONT_MONO} text-xs uppercase font-bold text-dark`}>Memuat timeline karya anggota...</span>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="border-[3px] border-dark bg-[#F8D7DA] p-6 shadow-[6px_6px_0_#1A1A1A] text-center">
        <AlertCircle className="w-8 h-8 text-maroon mx-auto mb-2" />
        <p className={`${FONT_MONO} text-sm text-dark font-bold`}>{error}</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="border-[3px] border-dark bg-white p-12 text-center shadow-[6px_6px_0_#1A1A1A]">
        <FolderKanban className="w-10 h-10 text-dark/30 mx-auto mb-3" />
        <h3 className={`${FONT_DISPLAY} text-lg font-black uppercase text-dark`}>Belum Ada Karya</h3>
        <p className={`${FONT_MONO} text-xs text-dark/60 mt-1 mb-4`}>Belum ada karya anggota yang disetujui untuk ditampilkan di feed.</p>
        <Link
          href="/profil"
          className={`${FONT_DISPLAY} inline-flex items-center gap-2 border-2 border-dark bg-maroon px-5 py-2.5 text-xs font-bold uppercase text-white shadow-[3px_3px_0_#1A1A1A] hover:bg-hot transition-all`}
        >
          <span>Upload Karya Pertama</span>
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {items.map((project, idx) => (
        <Reveal key={project.id} delay={Math.min(idx * 0.1, 0.4)}>
          <FeedCard
            project={project}
            currentUserId={currentUserId}
            onToggleStar={(id, starred) =>
              startTransition(() => toggleStar(id, starred))
            }
          />
        </Reveal>
      ))}

      {hasMore && (
        <Reveal>
          <button
            onClick={loadMore}
            disabled={loading}
            className={`${FONT_DISPLAY} w-full border-[3px] border-dark bg-white py-4 font-black uppercase tracking-wider text-dark shadow-[4px_4px_0_#1A1A1A] flex items-center justify-center gap-2 hover:bg-[#FFF3C4] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-maroon" />
                <span>Memuat lebih banyak...</span>
              </>
            ) : (
              <span>Muat Karya Lainnya</span>
            )}
          </button>
        </Reveal>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [gate, setGate] = useState<"checking" | "ok" | "blocked">("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      setGate(profile && profile.status === "aktif" ? "ok" : "blocked");
    })();
    return () => { alive = false; };
  }, [router]);

  if (gate === "checking") {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-[#7A1B2E]" />
      </div>
    );
  }

  if (gate === "blocked") {
    return <GhostScreen />;
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const headerRotate = useTransform(scrollYProgress, [0, 1], [2, 0]);

  return (
    <div ref={sectionRef} className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-10">
      {/* Header Banner */}
      <motion.div
        style={prefersReduced ? {} : { y: headerY, rotate: headerRotate }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-[3px] border-dark bg-white p-6 shadow-[6px_6px_0_var(--color-dark)]"
      >
        <div>
          <span className={`${FONT_MONO} inline-block bg-[#FFF3C4] border-2 border-dark px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-dark mb-2`}>
            // Ruang Interaksi Anggota
          </span>
          <h1 className={`${FONT_DISPLAY} text-3xl font-black uppercase tracking-tight text-dark`}>
            Dashboard <span className="text-maroon">Anggota</span>
          </h1>
          <p className={`${FONT_MONO} text-xs text-dark/70 mt-1`}>
            Pantau kehadiran, ikuti story rekan setim, dan apresiasi karya terbaru.
          </p>
        </div>
        <Link
          href="/profil"
          className={`${FONT_DISPLAY} inline-flex items-center gap-2 border-[3px] border-dark bg-paper px-5 py-3 text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0_var(--color-dark)] hover:bg-maroon hover:text-white transition-all`}
        >
          <span>Atur Profil &amp; Pixel</span>
          <Sparkles className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Pixel Story — identitas anggota di atas feed */}
      <section aria-label="Pixel Story">
        <PixelStoryContainer />
      </section>

      {/* Absen Banner */}
      <section aria-label="Status Absen">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-maroon border-2 border-dark" />
            <h2 className={`${FONT_DISPLAY} text-lg font-black uppercase tracking-wider text-dark`}>
              Jadwal &amp; Absensi Sesi
            </h2>
          </div>
          <Link
            href="/dashboard/absen/riwayat"
            className={`${FONT_MONO} text-xs font-bold text-dark hover:text-maroon underline underline-offset-4`}
          >
            Lihat Riwayat Absen →
          </Link>
        </div>
        <AbsenBanner />
      </section>

      {/* Feed Timeline */}
      <section aria-label="Feed Karya Anggota">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#E8A100] border-2 border-dark" />
            <h2 className={`${FONT_DISPLAY} text-lg font-black uppercase tracking-wider text-dark`}>
              Timeline Karya Anggota
            </h2>
          </div>
          <Link
            href="/karya"
            className={`${FONT_MONO} text-xs font-bold text-dark hover:text-maroon underline underline-offset-4`}
          >
            Eksplor Semua Karya →
          </Link>
        </div>
        <FeedTimeline />
      </section>
    </div>
  );
}
