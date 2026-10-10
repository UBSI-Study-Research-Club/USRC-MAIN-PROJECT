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
  BookOpen,
  FlaskConical,
  Hammer,
  Users,
  Calendar,
  UserCheck,
  FolderKanban,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ──────────────────────────────────────── */
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

/* ─── Helpers ────────────────────────────────────── */
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

/* ─── 4 Core Values ──────────────────────────────── */
const CORES = [
  {
    icon: BookOpen,
    title: "Study",
    desc: "Belajar bareng materi kuliah & teknologi terkini lewat sesi rutin.",
    rotate: "-2deg",
  },
  {
    icon: FlaskConical,
    title: "Research",
    desc: "Eksplorasi riset kampus, tulis paper, dan presentasi temuan.",
    rotate: "1deg",
  },
  {
    icon: Hammer,
    title: "Build Project",
    desc: "Bangun project nyata — web, mobile, IoT — dari ide sampai deploy.",
    rotate: "-1deg",
  },
  {
    icon: Users,
    title: "Collaboration",
    desc: "Kolaborasi lintas prodi: Informatika, SI, SI Akuntansi.",
    rotate: "2deg",
  },
] as const;

/* ─── Skeleton ───────────────────────────────────── */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ─── Stat Card ──────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 border-2 border-dark bg-white p-4 neo-shadow-sm">
      <Icon className="h-5 w-5 text-maroon" strokeWidth={2.5} />
      {loading ? (
        <Skeleton className="h-8 w-14" />
      ) : (
        <span className="font-[family-name:var(--font-outfit)] text-3xl font-black text-maroon">
          {value}
        </span>
      )}
      <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] uppercase tracking-wider text-dark/60">
        {label}
      </span>
    </div>
  );
}

/* ─── Meeting Ticket Card ────────────────────────── */
function TicketCard({ meeting }: { meeting: Meeting }) {
  return (
    <div className="group relative border-2 border-dark bg-white p-4 neo-shadow transition-transform hover:-translate-y-1">
      {/* Notch decorations */}
      <div className="absolute -left-[5px] top-6 h-2.5 w-2.5 rounded-full border-2 border-dark bg-paper" />
      <div className="absolute -right-[5px] top-6 h-2.5 w-2.5 rounded-full border-2 border-dark bg-paper" />

      <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] uppercase tracking-widest text-maroon">
        // SESI PASCA
      </p>
      <h3 className="mt-1 font-[family-name:var(--font-outfit)] text-base font-bold leading-tight text-dark">
        {meeting.title}
      </h3>
      {meeting.description && (
        <p className="mt-1 line-clamp-2 text-sm text-dark/70">
          {meeting.description}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-dark/20 pt-2">
        <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] text-dark/50">
          {formatDateWIB(meeting.starts_at)} · {formatTimeWIB(meeting.starts_at)}
        </span>
        <span className="flex items-center gap-1 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-medium text-maroon">
          <UserCheck className="h-3 w-3" />
          {meeting.attendee_count} hadir
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════ */
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

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      try {
        // Fetch stats in parallel
        const [profilesRes, meetingsCountRes, projectsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("meetings").select("id", { count: "exact", head: true }),
          supabase.from("projects").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          members: profilesRes.count ?? 0,
          sessions: meetingsCountRes.count ?? 0,
          projects: projectsRes.count ?? 0,
        });

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
  }, []);

  return (
    <>
      {/* ── HERO ─────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden border-b-2 border-dark/10 px-4 pb-16 pt-12 md:pb-24 md:pt-20"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
          {/* Left — text */}
          <div className="flex-1 text-center md:text-left">
            <p className="font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-[0.2em] text-maroon">
              // UBSI Pontianak
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-outfit)] text-4xl font-black uppercase leading-[1.1] tracking-tight text-dark md:text-5xl lg:text-6xl">
              Study.
              <br />
              Research.
              <br />
              <span className="text-maroon">Build.</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-dark/70 md:text-lg">
              Komunitas lintas prodi yang belajar bareng, riset bareng, dan
              bangun project nyata — bukan cuma teori.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link
                href="/daftar"
                className="inline-flex items-center justify-center border-2 border-dark bg-maroon px-6 py-3 font-[family-name:var(--font-outfit)] text-sm font-bold uppercase tracking-wider text-white neo-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
              >
                Gabung Sekarang
              </Link>
              <a
                href="#kegiatan"
                className="inline-flex items-center justify-center border-2 border-dark bg-white px-6 py-3 font-[family-name:var(--font-outfit)] text-sm font-bold uppercase tracking-wider text-dark neo-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
              >
                Lihat Kegiatan
              </a>
            </div>
          </div>

          {/* Right — 3D logo sticker */}
          <motion.div
            style={
              prefersReduced
                ? {}
                : { y: stickerY, rotate: stickerRotate }
            }
            className="relative flex-shrink-0"
          >
            <div className="sticker-tilt-r border-2 border-dark bg-white p-3 neo-shadow-lg md:p-4">
              <Image
                src="/logo-usrc-3d.png"
                alt="USRC 3D Logo"
                width={240}
                height={240}
                className="h-48 w-48 object-contain md:h-60 md:w-60"
                priority
              />
            </div>
            {/* Badge */}
            <div className="absolute -bottom-3 -right-3 sticker-tilt border-2 border-dark bg-maroon px-3 py-1 neo-shadow-sm">
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] font-semibold uppercase tracking-wider text-white">
                [EST. 2026]
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 4 CORE VALUES ────────────────────────── */}
      <section className="border-b-2 border-dark/10 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-[family-name:var(--font-outfit)] text-2xl font-extrabold uppercase tracking-tight text-dark md:text-3xl">
            4 Pilar <span className="text-maroon">USRC</span>
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CORES.map((core) => (
              <div
                key={core.title}
                style={{ transform: `rotate(${core.rotate})` }}
                className="border-2 border-dark bg-white p-5 neo-shadow transition-transform hover:rotate-0 hover:-translate-y-1"
              >
                <core.icon
                  className="h-8 w-8 text-maroon"
                  strokeWidth={2}
                />
                <h3 className="mt-3 font-[family-name:var(--font-outfit)] text-lg font-bold uppercase tracking-wide text-dark">
                  {core.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-dark/70">
                  {core.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE STATS ───────────────────────────── */}
      <section className="border-b-2 border-dark/10 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-center font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-[0.2em] text-maroon">
            // Data langsung dari database
          </p>
          <h2 className="mt-2 text-center font-[family-name:var(--font-outfit)] text-2xl font-extrabold uppercase tracking-tight text-dark md:text-3xl">
            USRC dalam Angka
          </h2>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <StatCard
              icon={UserCheck}
              label="Anggota"
              value={stats.members}
              loading={loading}
            />
            <StatCard
              icon={Calendar}
              label="Sesi"
              value={stats.sessions}
              loading={loading}
            />
            <StatCard
              icon={FolderKanban}
              label="Karya"
              value={stats.projects}
              loading={loading}
            />
          </div>
        </div>
      </section>

      {/* ── KEGIATAN TERAKHIR ────────────────────── */}
      <section id="kegiatan" className="border-b-2 border-dark/10 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-center font-[family-name:var(--font-ibm-plex-mono)] text-xs uppercase tracking-[0.2em] text-maroon">
            // Sesi yang sudah berlalu
          </p>
          <h2 className="mt-2 text-center font-[family-name:var(--font-outfit)] text-2xl font-extrabold uppercase tracking-tight text-dark md:text-3xl">
            Kegiatan Terakhir
          </h2>

          {loading ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border-2 border-dark/20 bg-white p-4"
                >
                  <Skeleton className="mb-2 h-3 w-20" />
                  <Skeleton className="mb-1 h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="mt-3 flex justify-between border-t border-dashed border-dark/20 pt-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
          ) : meetings.length === 0 ? (
            <p className="mt-8 text-center text-sm text-dark/50">
              Belum ada kegiatan tercatat. Nantikan sesi pertama!
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {meetings.map((m) => (
                <TicketCard key={m.id} meeting={m} />
              ))}
            </div>
          )}

          <p className="mt-6 text-center font-[family-name:var(--font-ibm-plex-mono)] text-xs text-dark/40">
            Login buat lihat jadwal &amp; absen →
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-outfit)] text-3xl font-black uppercase tracking-tight text-dark md:text-4xl">
            Siap <span className="text-maroon">Gabung?</span>
          </h2>
          <p className="mt-3 text-base text-dark/70">
            Terbuka untuk semua mahasiswa UBSI Pontianak — Informatika, Sistem
            Informasi, dan SI Akuntansi.
          </p>
          <Link
            href="/daftar"
            className="mt-6 inline-flex items-center justify-center border-2 border-dark bg-maroon px-8 py-4 font-[family-name:var(--font-outfit)] text-base font-bold uppercase tracking-wider text-white neo-shadow-lg transition-transform hover:-translate-y-1 active:translate-y-0 active:shadow-none"
          >
            Daftar Sekarang
          </Link>
        </div>
      </section>
    </>
  );
}
