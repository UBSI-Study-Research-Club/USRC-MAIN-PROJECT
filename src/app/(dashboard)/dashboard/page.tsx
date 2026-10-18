"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, Sparkles, ArrowRight, FolderKanban } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useFeed } from "@/hooks/useFeed";
import { useAbsenStatus, type AbsenStatusItem } from "@/hooks/useAbsenStatus";
import { FeedCard } from "@/components/FeedCard";
import { PixelStoryContainer } from "@/components/pixel/PixelStoryContainer";
import { GhostScreen } from "./absen/shared";

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";

// ── Tiket Sesi (prototype Raken → polish web) ─────────────────
function ticketDate(s: string) {
  const d = new Date(s);
  return {
    mon: d.toLocaleDateString("id-ID", { month: "short" }).replace(".", "").toUpperCase(),
    day: d.getDate(),
    wd: d.toLocaleDateString("id-ID", { weekday: "short" }).replace(".", "").toUpperCase(),
    when: `${d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })}, ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
  };
}

function SessionTicket({ m, state }: { m: AbsenStatusItem; state: "live" | "soon" }) {
  const t = ticketDate(m.starts_at);
  const attended = m.status !== null;
  return (
    <div className={`archive-stack${state === "soon" ? " rot2" : ""}`}>
      <i className="archive-lay c" />
      <i className="archive-lay b" />
      <i className="archive-lay a" />
      <article className={`archive-sheet ticket${state === "live" ? " live" : ""}`}>
        <span className="archive-tape" aria-hidden="true" />
        <div className="ticket-tk">
          <div className="ticket-stub" aria-hidden="true">
            <span>{t.mon}</span>
            <b>{t.day}</b>
            <span>{t.wd}</span>
          </div>
          <div className="ticket-body">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`${FONT_MONO} text-[12px] font-medium uppercase tracking-[.08em] text-maroon`}>
                // {state === "live" ? "sesi berlangsung" : "sesi mendatang"}
              </span>
              <span className="ticket-status">{state === "live" ? "Live" : "Mendatang"}</span>
            </div>
            <h3 className={`${FONT_DISPLAY} mt-2 mb-0.5 text-2xl font-black uppercase leading-[1.1] text-dark`}>
              {m.title}
            </h3>
            <p className={`${FONT_MONO} m-0 text-xs text-dark/80`}>Mulai: {t.when}</p>
          </div>
        </div>
        <div className="ticket-foot">
          <span className={`${FONT_MONO} text-xs text-dark/75`}>
            {state === "live" ? "Absen terbuka sampai sesi berakhir." : "Absen dibuka saat sesi dimulai."}
          </span>
          {state === "live" && !attended && (
            <Link href="/dashboard/absen" className="ticket-abs">
              Absen Sekarang
            </Link>
          )}
          {state === "live" && attended && (
            <span className={`${FONT_MONO} inline-flex items-center gap-2 border-2 border-dark bg-[#D1E7DD] px-3 py-1.5 text-xs font-bold text-dark`}>
              <CheckCircle2 className="w-4 h-4 text-green-700" />
              {m.status === "approved" ? "Hadir (Approved)" : "Menunggu Approval"}
            </span>
          )}
          {state === "soon" && (
            <button type="button" className="ticket-abs" disabled>
              Absen belum dibuka
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

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

  const now = Date.now();
  const live = items.filter(
    (m) => new Date(m.starts_at).getTime() <= now && new Date(m.ends_at).getTime() >= now
  );
  const upcoming = items
    .filter((m) => new Date(m.starts_at).getTime() > now)
    .slice(0, 2);

  if (!items.length) {
    return (
      <div className="archive-stack">
        <i className="archive-lay c" />
        <i className="archive-lay b" />
        <i className="archive-lay a" />
        <article className="archive-sheet ticket">
          <span className="archive-tape" aria-hidden="true" />
          <div className="ticket-tk">
            <div className="ticket-stub" aria-hidden="true">
              <span>—</span>
              <b>0</b>
              <span>—</span>
            </div>
            <div className="ticket-body">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`${FONT_MONO} text-[12px] font-medium uppercase tracking-[.08em] text-maroon`}>
                  // belum ada sesi
                </span>
                <span className="ticket-status">Kosong</span>
              </div>
              <h3 className={`${FONT_DISPLAY} mt-2 mb-0.5 text-2xl font-black uppercase leading-[1.1] text-dark`}>
                Belum Ada Sesi Aktif
              </h3>
              <p className={`${FONT_MONO} m-0 text-xs text-dark/80`}>
                Nantikan pengumuman sesi berikutnya dari sekretaris.
              </p>
            </div>
          </div>
          <div className="ticket-foot">
            <span className={`${FONT_MONO} text-xs text-dark/75`}>
              Pengumuman sesi lewat dashboard &amp; grup kelas.
            </span>
            <button type="button" className="ticket-abs" disabled>
              Absen belum dibuka
            </button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-9">
      {live.map((m) => (
        <SessionTicket key={m.meetingId} m={m} state="live" />
      ))}
      {upcoming.map((m) => (
        <SessionTicket key={m.meetingId} m={m} state="soon" />
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
          href="/karya"
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
// Hasil cek status anggota disimpan agar kembali ke Feed tidak menampilkan spinner lagi.
const gateCache: { value?: "ok" | "blocked" } = {};

export default function DashboardPage() {
  const router = useRouter();
  const [gate, setGate] = useState<"checking" | "ok" | "blocked">(gateCache.value ?? "checking");

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
      gateCache.value = profile && profile.status === "aktif" ? "ok" : "blocked";
      setGate(gateCache.value);
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
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={sectionRef} className="flex flex-col gap-8 md:gap-10 md:py-2">
      {/* Header Banner — Arsip Kertas Fold */}
      <div className="archive-stack rot">
        <i className="archive-lay c"></i>
        <i className="archive-lay b"></i>
        <i className="archive-lay a"></i>
        <div
          className="archive-sheet archive-fold flex items-center justify-between gap-4 border-[3px] border-dark bg-white p-4 sm:p-6"
        >
          <div className="min-w-0">
            <span className={`${FONT_MONO} hidden sm:inline-block bg-[#FFF3C4] border-2 border-dark px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-dark mb-2`}>
              // Ruang Interaksi Anggota
            </span>
            <h1 className={`${FONT_DISPLAY} text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-none tracking-tight text-dark`}>
              Dashboard <span className="text-maroon">Anggota</span>
            </h1>
            <p className={`${FONT_MONO} hidden sm:block text-xs text-dark/70 mt-2`}>
              Pantau kehadiran, ikuti story rekan setim, dan apresiasi karya terbaru.
            </p>
          </div>
          <Link
            href="/profil"
            aria-label="Atur Profil & Pixel"
            className={`${FONT_DISPLAY} inline-flex shrink-0 items-center gap-2 border-[3px] border-dark bg-paper p-2.5 sm:px-5 sm:py-3 text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0_var(--color-dark)] hover:bg-maroon hover:text-white transition-all`}
          >
            <span className="hidden sm:inline">Atur Profil &amp; Pixel</span>
            <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Desktop: 2 kolom (konten utama + sidebar absen sticky). Mobile: 1 kolom berurutan. */}
      <div className="grid grid-cols-1 gap-8 md:gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-10">
        {/* Pixel Story — identitas anggota di atas feed (Stack Kertas Rot2) */}
        <section aria-label="Pixel Story" className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="archive-stack rot2">
            <i className="archive-lay c"></i>
            <i className="archive-lay b"></i>
            <i className="archive-lay a"></i>
            <div className="archive-sheet">
              <PixelStoryContainer />
            </div>
          </div>
        </section>

        {/* Absen — sidebar sticky di desktop */}
        <section aria-label="Status Absen" className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-24">
          <SectionHeader dot="bg-maroon" title="Jadwal & Absensi" href="/dashboard/absen/riwayat" cta="Riwayat" ctaLong="Riwayat Absen" tilt="rotate-[-1deg]" />
          <AbsenBanner />
        </section>

        {/* Feed Timeline */}
        <section aria-label="Feed Karya Anggota" className="min-w-0 lg:col-start-1 lg:row-start-2">
          <SectionHeader dot="bg-[#E8A100]" title="Timeline Karya" href="/karya" cta="Semua" ctaLong="Eksplor Semua Karya" tilt="rotate-[1deg]" />
          <FeedTimeline />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  dot,
  title,
  href,
  cta,
  ctaLong,
  tilt,
}: {
  dot: string;
  title: string;
  href: string;
  cta: string;
  ctaLong: string;
  tilt: string;
}) {
  return (
    <div className="flex justify-between items-center gap-3 mb-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`w-3 h-3 shrink-0 ${dot} border-2 border-dark`} />
        <h2 className={`${FONT_DISPLAY} truncate text-base sm:text-lg font-black uppercase tracking-wider text-dark`}>
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className={`inline-flex shrink-0 items-stretch border-2 border-dark bg-[#FFF3C4] shadow-[3px_3px_0_#1A1A1A] no-underline font-display font-extrabold text-[11px] sm:text-[12px] uppercase tracking-[.07em] ${tilt} hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_#7A1B2E] transition-all`}
      >
        <span className="block px-2.5 py-1.5 sm:px-3">
          <span className="sm:hidden">{cta}</span>
          <span className="hidden sm:inline">{ctaLong}</span>
        </span>
        <i className="not-italic grid place-items-center w-7 sm:w-8 bg-maroon text-white border-l-2 border-dark text-base">→</i>
      </Link>
    </div>
  );
}
