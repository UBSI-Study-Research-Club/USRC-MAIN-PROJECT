"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Hammer,
  Users,
  Calendar,
  UserCheck,
  FolderKanban,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  attendee_count: number;
}

interface Stats {
  members: number;
  sessions: number;
  projects: number;
}

function formatDateWIB(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Pontianak",
  });
}

function formatTimeWIB(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Pontianak",
  });
}

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";
const GLASS =
  "border border-white/40 bg-white/70 backdrop-blur-md outline outline-[1.5px] outline-dark";

const CORES = [
  {
    icon: BookOpen,
    title: "Study",
    desc: "Belajar bareng materi kuliah & teknologi terkini lewat sesi rutin.",
    rotate: "-rotate-2",
    tint: "bg-[#E38595]",
  },
  {
    icon: FlaskConical,
    title: "Research",
    desc: "Eksplorasi riset kampus, tulis paper, dan presentasi temuan.",
    rotate: "rotate-1",
    tint: "bg-[#FFF3C4]",
  },
  {
    icon: Hammer,
    title: "Build Project",
    desc: "Bangun project nyata - web, mobile, IoT - dari ide sampai deploy.",
    rotate: "-rotate-1",
    tint: "bg-[#D1E7DD]",
  },
  {
    icon: Users,
    title: "Collaboration",
    desc: "Kolaborasi lintas prodi: Informatika, SI, SI Akuntansi.",
    rotate: "rotate-2",
    tint: "bg-[#E38595]",
  },
] as const;

function SectionHead({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className={`${FONT_MONO} text-xs font-semibold uppercase tracking-[0.2em] text-maroon`}
      >
        {tag}
      </p>
      <h2
        className={`${FONT_DISPLAY} text-3xl font-black uppercase leading-none tracking-wide text-dark md:text-5xl`}
      >
        {children}
      </h2>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
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

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  rotate,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
  rotate: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 border-2 border-dark bg-white p-4 shadow-[4px_4px_0px_var(--color-maroon)] transition-transform hover:rotate-0 md:p-6 ${rotate}`}
    >
      <Icon className="h-5 w-5 text-maroon md:h-6 md:w-6" strokeWidth={2.5} />
      {loading ? (
        <Skeleton className="h-8 w-14" />
      ) : (
        <span
          className={`${FONT_DISPLAY} text-3xl font-black text-maroon md:text-5xl`}
        >
          {value}
        </span>
      )}
      <span
        className={`${FONT_MONO} text-[11px] uppercase tracking-wider text-dark/60`}
      >
        {label}
      </span>
    </div>
  );
}

function TicketCard({ meeting, index }: { meeting: Meeting; index: number }) {
  const tilt = index % 2 === 0 ? "-rotate-[1.5deg]" : "rotate-[1.5deg]";

  return (
    <div
      className={`group relative flex border-2 border-dark bg-white shadow-[6px_6px_0px_var(--color-maroon)] transition-transform hover:-translate-y-1 hover:rotate-0 ${tilt}`}
    >
      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <span
          className={`${FONT_MONO} w-fit border-[1.5px] border-dark bg-[#FFF3C4] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-dark`}
        >
          // SESI PASCA
        </span>
        <h3
          className={`${FONT_DISPLAY} text-xl font-black uppercase leading-tight tracking-wide text-dark`}
        >
          {meeting.title}
        </h3>
        {meeting.description && (
          <p className="line-clamp-2 text-sm text-dark/70">
            {meeting.description}
          </p>
        )}
        <p className={`${FONT_MONO} mt-1 text-[11px] text-dark/60`}>
          {formatDateWIB(meeting.starts_at)} · {formatTimeWIB(meeting.starts_at)}
        </p>
      </div>

      {/* Stub */}
      <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-dashed border-dark bg-paper">
        <UserCheck className="h-4 w-4 text-maroon" strokeWidth={2.5} />
        <span
          className={`${FONT_DISPLAY} text-4xl font-black leading-none text-maroon`}
        >
          {meeting.attendee_count}
        </span>
        <span className={`${FONT_MONO} text-[11px] font-semibold uppercase`}>
          hadir
        </span>
      </div>

      {/* Notches (half circles on the perforation) */}
      <div
        aria-hidden="true"
        className="absolute -top-[2px] right-[83px] h-[13px] w-[26px] rounded-b-[13px] border-2 border-t-0 border-dark bg-paper"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-[2px] right-[83px] h-[13px] w-[26px] rounded-t-[13px] border-2 border-b-0 border-dark bg-paper"
      />
    </div>
  );
}

export default function LandingPage() {
  const prefersReduced = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const stickerY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const stickerRotate = useTransform(scrollYProgress, [0, 1], [4, 1]);

  const [stats, setStats] = useState<Stats>({ members: 0, sessions: 0, projects: 0 });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsLoggedIn(!!session)
    );

    async function fetchData() {
      try {
        // Stats via RPC — RLS-safe untuk tamu (anon gak bisa baca profiles langsung)
        const statsData = (await supabase
          .rpc('get_public_stats')
          .single()) as unknown as {
          members: number
          sessions: number
          projects: number
        } | null
        if (statsData) {
          setStats({
            members: Number(statsData.members ?? 0),
            sessions: Number(statsData.sessions ?? 0),
            projects: Number(statsData.projects ?? 0),
          })
        }

        // Fetch past meetings with attendee count
        const { data: pastMeetings } = await supabase
          .from("meetings")
          .select("id, title, description, starts_at, ends_at")
          .lt("ends_at", new Date().toISOString())
          .order("ends_at", { ascending: false })
          .limit(6);

        if (pastMeetings && pastMeetings.length > 0) {
          // Get attendee counts
          const meetingIds = pastMeetings.map((m) => m.id);
          const { data: attendances } = await supabase
            .from("attendances")
            .select("meeting_id")
            .in("meeting_id", meetingIds)
            .eq("status", "approved");

          const countMap: Record<string, number> = {};
          attendances?.forEach((a) => {
            countMap[a.meeting_id] = (countMap[a.meeting_id] || 0) + 1;
          });

          setMeetings(
            pastMeetings.map((m) => ({
              ...m,
              attendee_count: countMap[m.id] || 0,
            }))
          );
        }
      } catch {
        // Supabase unavailable — stats stay at 0, meetings empty
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 -z-10 h-[800px] w-[800px] -translate-y-1/3 translate-x-1/3 rounded-full bg-[#ECAEBA] opacity-30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-64 -z-10 h-[600px] w-[600px] rounded-full bg-[#D9C8C9] opacity-40 blur-3xl"
      />

      <section
        ref={heroRef}
        id="tentang"
        className="relative px-6 pb-20 pt-12 md:pb-32 md:pt-20"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
          {/* Left — Text & Badges */}
          <div className="flex w-full flex-col items-start gap-8 lg:w-[58%]">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`${FONT_MONO} -rotate-2 border-2 border-dark bg-white px-3 py-1 text-sm font-bold tracking-wider text-dark shadow-[3px_3px_0px_var(--color-maroon)]`}
              >
                [EST. 2026]
              </span>
              <span
                className={`${FONT_MONO} rotate-2 border-[3px] border-dark bg-[#FFF3C4] px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0px_var(--color-maroon)]`}
              >
                // PENDAFTARAN DIBUKA
              </span>
            </div>

            <h1
              className={`${FONT_DISPLAY} flex flex-col text-[2.75rem] font-black uppercase leading-[0.88] tracking-tighter text-dark sm:text-[4.5rem] md:text-[7rem] lg:text-[8rem]`}
            >
              <span>RUANG</span>
              <span className="text-maroon">BERKARYA</span>
              <span>YANG</span>
              <span>
                NGGAK<span className="text-maroon"> BIASA</span>
              </span>
              <span>
                AJA
              </span>
            </h1>

            <p
              className={`${FONT_MONO} max-w-lg text-base leading-relaxed text-dark/80 md:text-lg`}
            >
              Komunitas lintas prodi di UBSI Pontianak. Belajar teori, eksekusi
              riset, dan rilis project nyata.
            </p>

            <div className="flex flex-wrap gap-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/absen"
                    className={`${FONT_DISPLAY} inline-flex min-h-12 items-center gap-2 border-2 border-dark bg-maroon px-6 py-3 text-base font-extrabold uppercase tracking-wider text-white shadow-[4px_4px_0px_var(--color-dark)] transition-all hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
                  >
                    Masuk Absen
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </Link>
                  <Link
                    href="/profil"
                    className={`${FONT_DISPLAY} inline-flex min-h-12 items-center border-2 border-dark bg-white px-6 py-3 text-base font-extrabold uppercase tracking-wider text-dark shadow-[4px_4px_0px_var(--color-maroon)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
                  >
                    Profil Saya
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/daftar"
                    className={`${FONT_DISPLAY} inline-flex min-h-12 items-center gap-2 border-2 border-dark bg-maroon px-6 py-3 text-base font-extrabold uppercase tracking-wider text-white shadow-[4px_4px_0px_var(--color-dark)] transition-all hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
                  >
                    Gabung sekarang
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </Link>
                  <Link
                    href="/login"
                    className={`${FONT_DISPLAY} inline-flex min-h-12 items-center border-2 border-dark bg-white px-6 py-3 text-base font-extrabold uppercase tracking-wider text-dark shadow-[4px_4px_0px_var(--color-maroon)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
                  >
                    Login
                  </Link>
                </>
              )}
              <a
                href="#kegiatan"
                className={`${FONT_DISPLAY} inline-flex min-h-12 items-center border-2 border-dark bg-paper px-6 py-3 text-base font-extrabold uppercase tracking-wider text-dark shadow-[4px_4px_0px_var(--color-maroon)] transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
              >
                Lihat kegiatan
              </a>
            </div>
          </div>

          {/* Right — Sticker card (parallax) */}
          <div className="relative flex w-full justify-center py-4 lg:w-[38%] lg:justify-end">
            <motion.div
              style={
                prefersReduced
                  ? { rotate: 3 }
                  : { y: stickerY, rotate: stickerRotate }
              }
              className="relative"
            >
              {/* Back card (maroon) */}
              <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 border-[3px] border-dark bg-maroon" />

              {/* Front card (white) */}
              <div className="relative flex h-[360px] w-[280px] flex-col items-center justify-center border-[3px] border-dark bg-white p-5 md:h-[500px] md:w-[400px] md:p-6">
                {/* Glass badge */}
                <div
                  className={`${GLASS} absolute -left-3 top-16 z-20 -rotate-3 px-4 py-2 md:-left-14 md:top-24`}
                >
                  <span
                    className={`${FONT_MONO} text-sm font-bold text-dark`}
                  >
                    NEW // 2026
                  </span>
                </div>

                {/* Inner frame with logo */}
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden border-[3px] border-dark bg-white p-4">
                  <div className="absolute right-4 top-4 z-10 h-6 w-6 rounded-full border-[3px] border-dark bg-[#ECAEBA] shadow-[2px_2px_0px_var(--color-dark)]" />
                  <Image
                    src="/logo-usrc-main.jpeg"
                    alt="USRC Logo"
                    fill
                    className="object-contain p-6"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STRIP ────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={`${FONT_MONO} -mx-6 -rotate-[1.5deg] overflow-hidden whitespace-nowrap border-y-2 border-dark bg-maroon py-4 text-center text-sm font-semibold tracking-[0.08em] text-white`}
      >
        // STUDY ✦ RESEARCH ✦ BUILD PROJECT ✦ COLLABORATION ✦ [EST. 2026] ✦
        // STUDY ✦ RESEARCH ✦ BUILD PROJECT ✦ COLLABORATION
      </div>

      {/* ── 4 CORE VALUES ────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <Reveal>
            <SectionHead tag="// Fondasi kami">
              4 Pilar <span className="text-maroon">USRC</span>
            </SectionHead>
          </Reveal>
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {CORES.map((core, i) => (
              <Reveal key={core.title} delay={i * 0.08}>
                <div
                  className={`flex flex-col gap-3 border-2 border-dark bg-white p-6 shadow-[5px_5px_0px_var(--color-maroon)] transition-all hover:-translate-y-1 hover:rotate-0 hover:shadow-[8px_8px_0px_var(--color-maroon)] ${core.rotate}`}
                >
                  <span
                    className={`inline-flex h-12 w-12 items-center justify-center border-2 border-dark ${core.tint}`}
                  >
                    <core.icon className="h-6 w-6 text-dark" strokeWidth={2} />
                  </span>
                  <h3
                    className={`${FONT_DISPLAY} text-xl font-black uppercase tracking-wide text-dark`}
                  >
                    {core.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-dark/70">
                    {core.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEGIATAN TERAKHIR ────────────────────── */}
      <section id="kegiatan" className="px-4 py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <Reveal>
            <SectionHead tag="// Sesi yang sudah berlalu">
              Kegiatan <span className="text-maroon">Terakhir</span>
            </SectionHead>
          </Reveal>

          {loading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex border-2 border-dark/20 bg-white"
                >
                  <div className="flex-1 p-5">
                    <Skeleton className="mb-3 h-4 w-24" />
                    <Skeleton className="mb-2 h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="mt-3 h-3 w-28" />
                  </div>
                  <div className="flex w-24 items-center justify-center border-l-2 border-dashed border-dark/20">
                    <Skeleton className="h-10 w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <p className="text-sm text-dark/50">
              Belum ada kegiatan tercatat. Nantikan sesi pertama!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {meetings.map((m, i) => (
                <Reveal key={m.id} delay={i * 0.08}>
                  <TicketCard meeting={m} index={i} />
                </Reveal>
              ))}
            </div>
          )}

          <p className={`${FONT_MONO} text-xs text-dark/50`}>
            Login buat lihat jadwal &amp; absen →
          </p>
        </div>
      </section>

      {/* ── LIVE STATS (dark band) ───────────────── */}
      <section className="border-y-2 border-dark bg-dark px-4 py-20 text-paper">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <Reveal>
            <div className="flex flex-col gap-2">
              <p
                className={`${FONT_MONO} text-xs font-semibold uppercase tracking-[0.2em] text-[#E38595]`}
              >
                // Data langsung dari database
              </p>
              <h2
                className={`${FONT_DISPLAY} text-3xl font-black uppercase leading-none tracking-wide md:text-5xl`}
              >
                USRC dalam Angka
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-3 gap-4 text-dark md:gap-8">
            <Reveal delay={0}>
              <StatCard
                icon={UserCheck}
                label="Anggota"
                value={stats.members}
                loading={loading}
                rotate="-rotate-2"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <StatCard
                icon={Calendar}
                label="Sesi"
                value={stats.sessions}
                loading={loading}
                rotate="rotate-1"
              />
            </Reveal>
            <Reveal delay={0.16}>
              <StatCard
                icon={FolderKanban}
                label="Karya"
                value={stats.projects}
                loading={loading}
                rotate="rotate-2"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="px-4 py-24">
        <Reveal>
          <div className="mx-auto flex max-w-3xl rotate-1 flex-col items-start gap-5 border-2 border-dark bg-white p-8 shadow-[8px_8px_0px_var(--color-maroon)] md:p-12">
          <span
            className={`${FONT_MONO} -rotate-2 border-2 border-dark bg-[#FFF3C4] px-3 py-1 text-xs font-semibold`}
          >
            // PENDAFTARAN DIBUKA
          </span>
          <h2
            className={`${FONT_DISPLAY} text-4xl font-black uppercase leading-none tracking-tight text-dark md:text-6xl`}
          >
            Siap <span className="text-maroon">Gabung?</span>
          </h2>
          <p className="max-w-xl text-base text-dark/70 md:text-lg">
            Terbuka untuk semua mahasiswa UBSI Pontianak — Informatika, Sistem
            Informasi, dan SI Akuntansi.
          </p>
          <Link
            href="/daftar"
            className={`${FONT_DISPLAY} inline-flex min-h-12 items-center gap-2 border-2 border-dark bg-maroon px-8 py-4 text-base font-extrabold uppercase tracking-wider text-white shadow-[4px_4px_0px_var(--color-dark)] transition-all hover:bg-hot active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`}
          >
            Daftar Sekarang
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}