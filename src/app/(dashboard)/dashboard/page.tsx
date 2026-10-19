"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, FolderKanban, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { nickname } from "@/lib/name";
import { useFeed } from "@/hooks/useFeed";
import { useAbsenStatus, type AbsenStatusItem } from "@/hooks/useAbsenStatus";
import { FeedCard } from "@/components/FeedCard";
import { SideSheet } from "@/components/SideSheet";
import { KaryaDetail, type KaryaDetailData } from "@/components/KaryaDetail";
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
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1], delay: Math.min(delay, 0.16) }}
    >
      {children}
    </motion.div>
  );
}

// ── Feed Timeline ─────────────────────────────────────────
type KaryaDetailMap = Map<string, KaryaDetailData & { id: string }>;
const detailCache: { map?: KaryaDetailMap } = {};
function FeedTimeline() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { items, loading, error, hasMore, loadMore, toggleStar } = useFeed();
  const [, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [details, setDetails] = useState<KaryaDetailMap | null>(detailCache.map ?? null);

  // Data detail lengkap (poin, sosmed, PDF) diambil sekali saat panel pertama dibuka
  const openDetail = async (id: string) => {
    setOpenId(id);
    setSheetOpen(true);
    if (detailCache.map) return;
    const { data } = await createClient().rpc("get_public_karya");
    detailCache.map = new Map(((data ?? []) as (KaryaDetailData & { id: string })[]).map((k) => [k.id, k]));
    setDetails(detailCache.map);
  };
  const openItem = items.find((p) => p.id === openId) ?? null;
  const openData: KaryaDetailData | null = openId
    ? details?.get(openId) ??
      (openItem
        ? { title: openItem.title, description: openItem.description, image_url: openItem.image_url, category: openItem.category, links: null, owner_name: openItem.owner?.full_name }
        : null)
    : null;

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
            onOpen={openDetail}
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

      <SideSheet open={sheetOpen && !!openData} onClose={() => setSheetOpen(false)} label="Detail karya">
        {openData && (
          <KaryaDetail
            karya={openData}
            actions={
              openItem ? (
                <span className={`${FONT_MONO} inline-flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-2 text-xs font-bold text-dark`}>
                  <Star className="h-4 w-4 fill-[#E8A100] text-[#E8A100]" strokeWidth={1.5} />
                  {openItem.star_count} bintang
                </span>
              ) : undefined
            }
          />
        )}
      </SideSheet>
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

// ── Header sapaan + statistik pribadi ─────────────────────────
type MyStats = { name: string; sessions: number; karya: number; stars: number };
const statsCache: { value?: MyStats } = {};

function useMyStats() {
  const [stats, setStats] = useState<MyStats | null>(statsCache.value ?? null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const [{ data: profile }, { count: sessions }, { data: myProjects }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("attendances").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "approved"),
        supabase.from("projects").select("id").eq("user_id", user.id).eq("status", "approved"),
      ]);
      const ids = (myProjects ?? []).map((p) => p.id);
      const { count: stars } = ids.length
        ? await supabase.from("project_stars").select("id", { count: "exact", head: true }).in("project_id", ids)
        : { count: 0 };
      if (!alive) return;
      statsCache.value = {
        name: nickname(profile?.full_name),
        sessions: sessions ?? 0,
        karya: ids.length,
        stars: stars ?? 0,
      };
      setStats(statsCache.value);
    })();
    return () => { alive = false; };
  }, []);
  return stats;
}

function WelcomeHeader() {
  const stats = useMyStats();
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Pontianak" });
  const tiles = [
    { label: "Sesi hadir", value: stats?.sessions },
    { label: "Karya", value: stats?.karya },
    { label: "Bintang", value: stats?.stars },
  ];

  return (
    <div className="archive-stack">
      <i className="archive-lay c"></i>
      <i className="archive-lay b"></i>
      <i className="archive-lay a"></i>
      <section className="archive-sheet archive-fold grid gap-5 border-[3px] border-dark bg-white p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8 md:p-7">
        <div className="min-w-0">
          <p className={`${FONT_MONO} text-[11px] font-semibold uppercase tracking-[.18em] text-maroon`}>
            {today}
          </p>
          <h1 className={`${FONT_DISPLAY} mt-1.5 text-3xl font-black uppercase leading-none tracking-tight text-dark md:text-4xl`}>
            Halo, <span className="text-maroon">{stats ? stats.name : "…"}</span>
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-dark/70">
            Pantau kehadiran, ikuti story rekan setim, dan apresiasi karya terbaru.
          </p>
        </div>

        <dl className="grid grid-cols-3 border-2 border-dark bg-paper shadow-[3px_3px_0_#1A1A1A]">
          {tiles.map((t, i) => (
            <div key={t.label} className={`flex min-w-[88px] flex-col items-center justify-center px-3 py-3 md:px-5 ${i > 0 ? "border-l-2 border-dashed border-dark" : ""}`}>
              <dd className={`${FONT_DISPLAY} text-2xl font-black leading-none text-maroon md:text-3xl`}>
                {t.value ?? <span className="skeleton inline-block h-7 w-8 align-middle" />}
              </dd>
              <dt className={`${FONT_MONO} mt-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-dark/60`}>{t.label}</dt>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

// ── Aksi cepat (sidebar) ─────────────────────────────────────
function QuickActions() {
  const actions = [
    { href: "/karya", label: "Unggah karya", hint: "Pamerkan project terbarumu" },
    { href: "/dashboard/absen/riwayat", label: "Riwayat absen", hint: "Cek kehadiran sesi sebelumnya" },
    { href: "/profil", label: "Atur profil & pixel", hint: "Avatar, bio, dan sosmed" },
  ];
  return (
    <div className="mt-8 border-[3px] border-dark bg-white shadow-[5px_5px_0_#1A1A1A]">
      <p className={`${FONT_MONO} border-b-[3px] border-dark bg-[#FFF3C4] px-4 py-2 text-[11px] font-semibold uppercase tracking-[.14em] text-dark`}>
        Aksi cepat
      </p>
      <ul>
        {actions.map((a, i) => (
          <li key={a.href} className={i > 0 ? "border-t-2 border-dashed border-dark/25" : ""}>
            <Link href={a.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FFF3C4]">
              <span className="min-w-0 flex-1">
                <span className={`${FONT_DISPLAY} block text-sm font-black uppercase tracking-wide text-dark`}>{a.label}</span>
                <span className="block truncate text-xs text-dark/60">{a.hint}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-maroon transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardContent() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={sectionRef} className="flex flex-col gap-8 md:gap-10 md:py-2">
      <WelcomeHeader />

      {/* Desktop: 2 kolom (konten utama + sidebar absen sticky). Mobile: 1 kolom berurutan. */}
      <div className="grid grid-cols-1 gap-8 md:gap-10 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-10">
        {/* Pixel Story — identitas anggota di atas feed (Stack Kertas Rot2) */}
        <section aria-label="Story Anggota" className="min-w-0 lg:col-start-1 lg:row-start-1">
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
          <QuickActions />
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
