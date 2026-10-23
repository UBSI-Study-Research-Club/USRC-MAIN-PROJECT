"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  useInView,
  animate,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  FlaskConical,
  Hammer,
  Users,
  Calendar,
  UserCheck,
  FolderKanban,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { nickname } from "@/lib/name";
import { SideSheet } from "@/components/SideSheet";
import { KaryaCover } from "@/components/KaryaCover";
import { KaryaDetail, type KaryaDetailData } from "@/components/KaryaDetail";
import { MobileCarousel } from "@/components/MobileCarousel";

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  attendee_count: number;
}

interface KaryaLink {
  link_type: string;
  url: string;
  label: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  pdf_url?: string | null;
  category: string | null;
  links: KaryaLink[] | null;
  stars: number;
  star_count?: number;
  owner_name?: string | null;
  owner_socials?: KaryaDetailData["owner_socials"];
  members?: KaryaDetailData["members"];
  detail_points?: KaryaDetailData["detail_points"];
}

interface Me {
  name: string;
  role: string;
  live: { id: string; title: string; starts_at: string; ends_at: string } | null;
  next: { id: string; title: string; starts_at: string; ends_at: string } | null;
  attended: boolean;
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

const CORES = [
  {
    icon: BookOpen,
    title: "Study",
    desc: "Belajar bareng materi kuliah & teknologi terkini lewat sesi rutin.",
    rotate: "-rotate-1",
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
    desc: "Kolaborasi lintas prodi: Informatika, SI, dan SI Akuntansi.",
    rotate: "rotate-1",
    tint: "bg-[#E38595]",
  },
] as const;

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
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
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1], delay: Math.min(delay, 0.16) }}
    >
      {children}
    </motion.div>
  );
}

/* Angka yang menghitung naik saat pertama terlihat di layar. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return <span ref={ref}>{reduced ? value : shown}</span>;
}

function TicketCard({ meeting, index }: { meeting: Meeting; index: number }) {
  const tilt = index % 2 === 0 ? "-rotate-[1.5deg]" : "rotate-[1.5deg]";

  return (
    <div
      className={`group relative flex h-full border-2 border-dark bg-white shadow-[5px_5px_0px_var(--color-maroon)] transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-1 hover:rotate-0 md:shadow-[6px_6px_0px_var(--color-maroon)] ${tilt}`}
    >
      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 md:p-5">
        <span
          className={`${FONT_MONO} w-fit border-[1.5px] border-dark bg-[#FFF3C4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-dark md:px-2.5 md:py-1 md:text-[11px]`}
        >
          Selesai
        </span>
        <h3
          className={`${FONT_DISPLAY} line-clamp-2 text-lg font-black uppercase leading-tight tracking-wide text-dark md:text-xl`}
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
      <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-dashed border-dark bg-paper md:w-24">
        <UserCheck className="h-4 w-4 text-maroon" strokeWidth={2.5} />
        <span
          className={`${FONT_DISPLAY} text-3xl font-black leading-none text-maroon md:text-4xl`}
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
        className="absolute -top-[2px] right-[67px] md:right-[83px] h-[13px] w-[26px] rounded-b-[13px] border-2 border-t-0 border-dark bg-paper"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-[2px] right-[67px] md:right-[83px] h-[13px] w-[26px] rounded-t-[13px] border-2 border-b-0 border-dark bg-paper"
      />
    </div>
  );
}

// Warna cover fallback per kategori (karya tanpa gambar)
function coverColors(cat?: string | null): [string, string] {
  if (!cat) return ["#7A1B2E", "#E38595"];
  let h = 0;
  for (const ch of cat.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return [`hsl(${h},45%,38%)`, `hsl(${(h + 40) % 360},50%,66%)`];
}

const HERO_PRIMARY = `${FONT_DISPLAY} inline-flex min-h-11 items-center justify-center gap-2 border-2 border-dark bg-maroon px-4 py-2.5 text-sm sm:min-h-12 sm:px-6 sm:py-3 sm:text-base font-extrabold uppercase tracking-wider text-white shadow-[4px_4px_0px_var(--color-dark)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-hot hover:shadow-[6px_6px_0px_var(--color-dark)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`;
const HERO_SECONDARY = `${FONT_DISPLAY} inline-flex min-h-11 items-center justify-center gap-2 border-2 border-dark bg-white px-4 py-2.5 text-sm sm:min-h-12 sm:px-6 sm:py-3 sm:text-base font-extrabold uppercase tracking-wider text-dark shadow-[4px_4px_0px_var(--color-maroon)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_var(--color-maroon)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none`;

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Pontianak" }));
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

/* Hero versi anggota yang sudah login — isinya hidup dari data, bukan teks promosi. */
function MemberHero({ me }: { me: Me }) {
  const sessionLine = me.live
    ? me.attended
      ? <>Kamu sudah absen di <b className="text-dark">{me.live.title}</b>. Mantap.</>
      : <>Sesi <b className="text-dark">{me.live.title}</b> sedang berlangsung. Absen ditutup pukul {formatTimeWIB(me.live.ends_at)} WIB.</>
    : me.next
      ? <>Sesi berikutnya: <b className="text-dark">{me.next.title}</b>, {formatDateWIB(me.next.starts_at)} pukul {formatTimeWIB(me.next.starts_at)} WIB.</>
      : <>Belum ada sesi terjadwal. Sambil menunggu, pamerkan karya terbarumu.</>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`${FONT_MONO} -rotate-2 whitespace-nowrap border-2 border-dark bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0px_var(--color-maroon)] sm:px-3 sm:text-sm`}>
          {greeting()}
        </span>
        <span className={`${FONT_MONO} rotate-2 whitespace-nowrap border-[3px] border-dark bg-[#FFF3C4] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0px_var(--color-maroon)] sm:px-4 sm:py-1.5 sm:text-sm`}>
          {me.role}
        </span>
        {me.live && !me.attended && (
          <span className={`${FONT_MONO} inline-flex items-center gap-2 border-2 border-dark bg-maroon px-3 py-1 text-sm font-bold uppercase tracking-wider text-white`}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping bg-[#FFF3C4] opacity-75" />
              <span className="relative inline-flex h-2 w-2 bg-[#FFF3C4]" />
            </span>
            Sesi live
          </span>
        )}
      </div>

      <h1 className={`${FONT_DISPLAY} flex flex-col text-[2.5rem] font-black uppercase leading-[0.9] tracking-tighter text-dark sm:text-[3.25rem] md:text-[4.5rem] lg:text-[5rem]`}>
        <span>Halo,</span>
        <span className="break-words text-maroon">{me.name}.</span>
        <span>Siap berkarya</span>
        <span>hari ini?</span>
      </h1>

      <p className={`${FONT_MONO} max-w-lg text-sm leading-relaxed text-dark/75 sm:text-base md:text-lg`}>{sessionLine}</p>

      <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:gap-4 [&>*:first-child]:col-span-2">
        {me.live && !me.attended ? (
          <Link href="/dashboard/absen" className={HERO_PRIMARY}>
            Absen sekarang
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </Link>
        ) : (
          <Link href="/dashboard" className={HERO_PRIMARY}>
            Buka dashboard
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </Link>
        )}
        <Link href="/karya" className={HERO_SECONDARY}>
          Unggah karya
        </Link>
        <Link href="/profil" className={HERO_SECONDARY}>
          Profil saya
        </Link>
      </div>
    </>
  );
}

function MemberHeroSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8" aria-busy="true">
      <div className="flex gap-3">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-8 w-24" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="skeleton h-14 w-40 md:h-20" />
        <div className="skeleton h-14 w-56 md:h-20" />
        <div className="skeleton h-14 w-72 md:h-20" />
      </div>
      <div className="skeleton h-5 w-full max-w-md" />
    </div>
  );
}

function ProjectCard({ project, index, onClick }: { project: Project; index: number; onClick: () => void }) {
  const tilt = [-0.6, 0.5, -0.3][index % 3];
  const [g0, g1] = coverColors(project.category);
  const reduced = useReducedMotion();

  return (
    // Satu sistem animasi (spring framer) untuk posisi, rotasi, dan bayangan —
    // dulu transisi CSS + rotasi kelas saling bentrok sehingga terasa patah.
    <motion.button
      type="button"
      onClick={onClick}
      initial={false}
      style={{ rotate: tilt, boxShadow: "5px 5px 0 #7A1B2E" }}
      whileHover={reduced ? undefined : { x: -3, y: -6, rotate: 0, boxShadow: "9px 11px 0 #7A1B2E" }}
      whileTap={reduced ? undefined : { x: 2, y: 2, rotate: 0, boxShadow: "1px 1px 0 #7A1B2E" }}
      transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.7 }}
      className="group flex h-full w-full transform-gpu flex-col overflow-hidden border-2 border-dark bg-white text-left will-change-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink"
    >
      {/* Strip kategori */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-dark bg-[#FFF3C4] px-3 py-2">
        <div className="flex items-center gap-1.5 truncate">
          <span className={`${FONT_MONO} truncate text-[10px] font-bold uppercase tracking-wider text-dark`}>
            {project.category || "Lainnya"}
          </span>
          {project.pdf_url && (
            <span className="shrink-0 border border-dark bg-maroon px-1 py-0.2 text-[8px] font-bold uppercase text-white leading-none">
              PDF
            </span>
          )}
        </div>
        <span className={`${FONT_MONO} shrink-0 text-[10px] font-bold text-maroon`}>#{String(index + 1).padStart(2, "0")}</span>
      </div>

      {/* Cover */}
      <div className="relative overflow-hidden border-b-2 border-dark">
        {project.image_url ? (
          <KaryaCover
            src={project.image_url}
            alt={project.title}
            className="aspect-[4/3]"
            zoom
          />
        ) : (
          <div
            className="kg-img aspect-[4/3]"
            style={{ "--g0": g0, "--g1": g1 } as React.CSSProperties}
          >
            <span className={`${FONT_DISPLAY} line-clamp-3 text-[clamp(26px,4vw,38px)] font-black uppercase leading-none text-white [text-shadow:3px_3px_0_#1A1A1A]`}>
              {project.title}
            </span>
          </div>
        )}
        {/* Bintang mengambang */}
        <span className={`${FONT_MONO} absolute right-2.5 top-2.5 inline-flex items-center gap-1 border-2 border-dark bg-white px-2 py-0.5 text-[11px] font-bold text-dark shadow-[2px_2px_0_#1A1A1A]`}>
          <Star className="h-3.5 w-3.5 fill-[#E8A100] text-[#E8A100]" strokeWidth={1.5} />
          {project.star_count || 0}
        </span>
      </div>

      {/* Isi */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className={`${FONT_DISPLAY} line-clamp-2 text-lg font-black uppercase leading-tight text-dark`}>
          {project.title}
        </h3>
        {project.owner_name && (
          <p className={`${FONT_MONO} text-[11px] text-dark/55`}>oleh {project.owner_name}</p>
        )}
        {project.description && (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-dark/70">{project.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between border-t-2 border-dashed border-dark/20 pt-3">
          <span className={`${FONT_MONO} text-[11px] font-bold uppercase tracking-wider text-dark/50 transition-colors group-hover:text-maroon`}>
            Lihat detail
          </span>
          <span className="grid h-7 w-7 place-items-center border-2 border-dark bg-white transition-all duration-300 group-hover:bg-maroon group-hover:text-white">
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

export default function LandingPage() {
  const prefersReduced = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Spring di atas nilai scroll supaya parallax kertas mengalir, tidak kaku per-frame.
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const stickerY = useTransform(smoothScroll, [0, 1], [0, -70]);
  const stickerRotate = useTransform(smoothScroll, [0, 1], [3, -1]);

  const [stats, setStats] = useState<Stats>({ members: 0, sessions: 0, projects: 0 });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // "unknown" sampai sesi dicek — mencegah hero versi tamu sempat muncul untuk anggota
  const [authState, setAuthState] = useState<"unknown" | "guest" | "member">("unknown");
  const [me, setMe] = useState<Me | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 400);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthState(session ? "member" : "guest");
      if (session) loadMe(session.user.id);
    });

    // Data personal untuk hero saat sudah login: nama, sesi live/berikutnya, status absen.
    async function loadMe(uid: string) {
      const nowIso = new Date().toISOString();
      const [{ data: profile }, { data: upcoming }] = await Promise.all([
        supabase.from("profiles").select("full_name, role").eq("id", uid).maybeSingle(),
        supabase.from("meetings").select("id, title, starts_at, ends_at").gte("ends_at", nowIso).order("starts_at", { ascending: true }).limit(3),
      ]);
      const now = Date.now();
      const live = (upcoming ?? []).find((m) => new Date(m.starts_at).getTime() - 30 * 60000 <= now) ?? null;
      const next = (upcoming ?? []).find((m) => new Date(m.starts_at).getTime() > now && m.id !== live?.id) ?? null;
      let attended = false;
      if (live) {
        const { data: att } = await supabase.from("attendances").select("id").eq("user_id", uid).eq("meeting_id", live.id).maybeSingle();
        attended = !!att;
      }
      setMe({ name: nickname(profile?.full_name), role: profile?.role ?? "anggota", live, next, attended });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsLoggedIn(!!session)
    );

    async function fetchData() {
      try {
        // Stats via RPC — RLS-safe untuk tamu (anon gak bisa baca profiles langsung)
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_public_stats')
        if (statsError) {
          console.error('RPC error:', statsError)
        }
        if (statsData && statsData.length > 0) {
          const stat = statsData[0]
          setStats({
            members: Number(stat.members ?? 0),
            sessions: Number(stat.sessions ?? 0),
            projects: Number(stat.projects ?? 0),
          })
        }

        // Fetch past meetings with attendee count via RLS-safe public RPC
        const { data: pastMeetings, error: meetingsErr } = await supabase.rpc("get_public_past_meetings");
        if (meetingsErr) console.error("past meetings RPC error:", meetingsErr);
        if (pastMeetings) {
          setMeetings(
            (pastMeetings as any[]).map((m) => ({
              ...m,
              attendee_count: Number(m.attendee_count ?? 0),
            }))
          );
        }

        // Top-6 karya via RPC get_public_karya — RLS-safe untuk tamu,
        // sekalian bawa link fleksibel + sosmed pembuat (Gelombang B).
        const { data: allKarya, error: karyaError } = await supabase.rpc("get_public_karya");
        if (karyaError) console.error("karya RPC error:", karyaError);
        if (allKarya) {
          let list = allKarya as Project[];
          // Fallback enrichment jika RPC get_public_karya belum membawa kolom pdf_url
          if (list.length > 0 && list.every((k) => k.pdf_url === undefined)) {
            const { data: pdfData } = await supabase.from('projects').select('id, pdf_url');
            if (pdfData) {
              const pdfMap = new Map(pdfData.map((p) => [p.id, p.pdf_url]));
              list = list.map((k) => ({
                ...k,
                pdf_url: pdfMap.get(k.id) ?? null,
              }));
            }
          }
          const sorted = list
            .map((p) => ({ ...p, star_count: Number(p.stars ?? 0) }))
            .sort((a, b) => b.star_count - a.star_count)
            .slice(0, 6);
          setProjects(sorted);
        }
      } catch (err) {
        console.error('Landing stats fetch failed:', err)
        // Fallback: stats stay at 0, meetings empty
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Realtime: angka statistik, sesi lampau, dan top-6 karya ikut update tanpa refresh.
    const landingChannel = supabase
      .channel('landing-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_stars' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_links' }, () => fetchData())
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(landingChannel);
    };
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
        className="relative scroll-mt-24 px-5 pb-14 pt-6 sm:px-6 md:pb-32 md:pt-20"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
          {/* Left — Text & Badges */}
          <div className="flex w-full flex-col items-start gap-6 sm:gap-8 lg:w-[58%]">
            {authState === "unknown" ? (
              <div className="min-h-[420px] w-full" aria-hidden="true" />
            ) : authState === "member" ? (
              me ? <MemberHero me={me} /> : <MemberHeroSkeleton />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`${FONT_MONO} -rotate-2 border-2 border-dark bg-white px-2.5 py-1 text-xs font-bold tracking-wider text-dark shadow-[3px_3px_0px_var(--color-maroon)] sm:px-3 sm:text-sm`}
                  >
                    [EST. 2026]
                  </span>
                  <span
                    className={`${FONT_MONO} rotate-2 whitespace-nowrap border-[3px] border-dark bg-[#FFF3C4] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-dark shadow-[3px_3px_0px_var(--color-maroon)] sm:px-4 sm:py-1.5 sm:text-sm`}
                  >
                    Pendaftaran dibuka
                  </span>
                </div>

                <h1
                  className={`${FONT_DISPLAY} flex flex-col text-[2.25rem] font-black uppercase leading-[0.88] tracking-tighter text-dark sm:text-[3rem] md:text-[4.5rem] lg:text-[5rem]`}
                >
                  <span>RUANG</span>
                  <span className="text-maroon">BERKARYA</span>
                  <span>YANG</span>
                  <span>
                    NGGAK<span className="text-maroon"> BIASA</span>
                  </span>
                  <span>AJA</span>
                </h1>

                <p className={`${FONT_MONO} max-w-lg text-sm leading-relaxed text-dark/80 sm:text-base md:text-lg`}>
                  Komunitas lintas prodi di UBSI Pontianak. Belajar teori, eksekusi
                  riset, dan rilis project nyata.
                </p>

                <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:gap-4 [&>*:first-child]:col-span-2">
                  <Link href={isLoggedIn ? "/dashboard" : "/daftar"} className={HERO_PRIMARY}>
                    {isLoggedIn ? "Buka dashboard" : "Gabung sekarang"}
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </Link>
                  {!isLoggedIn && (
                    <Link href="/login" className={HERO_SECONDARY}>
                      Login
                    </Link>
                  )}
                  <a href="#karya" className={HERO_SECONDARY}>
                    Lihat karya
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Right — kartu polaroid logo (parallax). Disembunyikan di mobile:
              logo sudah ada di navbar dan kartu besar hanya memanjangkan halaman. */}
          <div className="relative hidden w-full justify-end py-4 lg:flex lg:w-[38%]">
            <motion.div
              style={
                prefersReduced
                  ? { rotate: 3 }
                  : { y: stickerY, rotate: stickerRotate }
              }
              className="relative"
            >
              {/* Kartu belakang */}
              <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 border-[3px] border-dark bg-maroon" />

              {/* Polaroid */}
              <div className="relative flex w-[360px] flex-col border-[3px] border-dark bg-white p-4 pb-0 xl:w-[400px]">
                {/* pin */}
                <div className="absolute -top-3 left-1/2 z-10 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-dark bg-[#ECAEBA] shadow-[2px_2px_0px_var(--color-dark)]" />

                <div
                  className="relative flex aspect-square w-full items-center justify-center border-[3px] border-dark bg-paper"
                  style={{ backgroundImage: "radial-gradient(rgba(26,26,26,.09) 1px, transparent 1.2px)", backgroundSize: "12px 12px" }}
                >
                  <Image
                    src="/logo-usrc.svg"
                    alt="Logo USRC"
                    width={400}
                    height={420}
                    priority
                    className="h-[72%] w-auto drop-shadow-[4px_4px_0_rgba(26,26,26,.12)]"
                  />
                </div>

                <div className="flex items-end justify-between gap-3 px-1 py-4">
                  <div>
                    <p className={`${FONT_DISPLAY} text-lg font-black uppercase leading-tight text-dark`}>
                      Study &amp; Research Club
                    </p>
                    <p className={`${FONT_MONO} mt-1 text-[11px] uppercase tracking-[.14em] text-dark/55`}>
                      UBSI Pontianak
                    </p>
                  </div>
                  <span className={`${FONT_MONO} shrink-0 border-2 border-dark bg-[#FFF3C4] px-2 py-0.5 text-[11px] font-bold text-dark`}>
                    2026
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STRIP ────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={`${FONT_MONO} pf-band -mx-6 -rotate-[1.5deg] border-y-2 border-dark bg-maroon py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white`}
      >
        <span>
          {Array.from({ length: 4 }).flatMap((_, r) =>
            ["Study", "Research", "Build Project", "Collaboration", "Est. 2026"].map((w) => (
              <span key={`${r}-${w}`} className="inline-flex items-center">
                {w}
                <span className="mx-5 inline-block h-[2px] w-5 bg-[#FFF3C4]" />
              </span>
            ))
          )}
        </span>
      </div>

      {/* ── 4 CORE VALUES ────────────────────────── */}
      <section id="pilar" className="scroll-mt-24 px-4 py-12 md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-10">
          <Reveal>
            <SectionHead>
              4 Pilar <span className="text-maroon">USRC</span>
            </SectionHead>
          </Reveal>
          {/* Mobile: grid 2x2 yang padat; tablet 2 kolom lega; desktop 4 kolom */}
          <div className="grid grid-cols-2 gap-3.5 sm:gap-6 lg:grid-cols-4 lg:gap-7">
            {CORES.map((core, i) => (
              <Reveal key={core.title} delay={i * 0.08} className="h-full">
                <div
                  className={`flex h-full flex-col gap-2 border-2 border-dark bg-white p-3.5 shadow-[4px_4px_0px_var(--color-maroon)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-1 hover:rotate-0 hover:shadow-[8px_8px_0px_var(--color-maroon)] sm:gap-3 sm:p-6 sm:shadow-[5px_5px_0px_var(--color-maroon)] ${core.rotate}`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center border-2 border-dark sm:h-12 sm:w-12 ${core.tint}`}
                  >
                    <core.icon className="h-[18px] w-[18px] text-dark sm:h-6 sm:w-6" strokeWidth={2} />
                  </span>
                  <h3
                    className={`${FONT_DISPLAY} break-words text-[15px] font-black uppercase leading-tight tracking-wide text-dark sm:text-xl`}
                  >
                    {core.title}
                  </h3>
                  <p className="text-[12.5px] leading-snug text-dark/70 sm:text-sm sm:leading-relaxed">
                    {core.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEGIATAN TERAKHIR ────────────────────── */}
      <section id="sesi" className="scroll-mt-24 px-4 py-12 md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-10">
          <Reveal>
            <SectionHead>
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
            <MobileCarousel label="Kegiatan terakhir">
              {meetings.map((m, i) => (
                <Reveal key={m.id} delay={i * 0.08} className="h-full">
                  <TicketCard meeting={m} index={i} />
                </Reveal>
              ))}
            </MobileCarousel>
          )}

          {!isLoggedIn && (
            <Link href="/login" className={`${FONT_MONO} w-fit text-xs text-dark/50 underline-offset-4 hover:text-maroon hover:underline`}>
              Login untuk lihat jadwal &amp; absen →
            </Link>
          )}
        </div>
      </section>

      {/* ── USRC DALAM ANGKA ─────────────────────── */}
      <section className="border-y-2 border-dark bg-dark px-4 py-12 text-paper md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] md:items-center md:gap-14">
          <Reveal>
            <h2 className={`${FONT_DISPLAY} text-3xl font-black uppercase leading-[.95] tracking-wide md:text-5xl`}>
              USRC dalam <span className="text-pink">angka</span>
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/60 md:text-base">
              Terus bertambah setiap sesi dan setiap karya yang dirilis anggota.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <dl className="grid grid-cols-3 border-2 border-paper/80 shadow-[5px_5px_0_var(--color-maroon)]">
              {[
                { icon: UserCheck, label: "Anggota", value: stats.members },
                { icon: Calendar, label: "Sesi", value: stats.sessions },
                { icon: FolderKanban, label: "Karya", value: stats.projects },
              ].map(({ icon: Icon, label, value }, i) => (
                <div
                  key={label}
                  className={`flex flex-col items-center justify-center gap-1.5 px-2 py-5 text-center md:items-start md:px-7 md:py-8 md:text-left ${
                    i > 0 ? "border-l-2 border-dashed border-paper/40" : ""
                  }`}
                >
                  <dd className={`${FONT_DISPLAY} text-4xl font-black leading-none text-[#FFF3C4] md:text-6xl`}>
                    {loading ? <span className="inline-block h-9 w-12 animate-pulse bg-paper/15 md:h-14 md:w-20" /> : <CountUp value={value} />}
                  </dd>
                  <dt className={`${FONT_MONO} mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-paper/65 md:text-xs`}>
                    <Icon className="h-3.5 w-3.5 shrink-0 text-pink" strokeWidth={2.25} />
                    {label}
                  </dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ── KARYA (Top 6 by stars) ────────────────────────── */}
      <section id="karya" className="scroll-mt-24 px-4 py-12 md:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:gap-10">
          <div className="flex items-end justify-between gap-4">
            <Reveal>
              <SectionHead>
                Karya <span className="text-maroon">Terbaik</span>
              </SectionHead>
            </Reveal>
            <Link
              href="/karya"
              className={`${FONT_DISPLAY} inline-flex shrink-0 items-center gap-1 whitespace-nowrap border-2 border-dark bg-paper px-2.5 py-1.5 text-xs font-bold uppercase text-dark shadow-[3px_3px_0_var(--color-maroon)] transition-[transform,box-shadow,background-color,color] duration-200 hover:-translate-y-0.5 hover:bg-maroon hover:text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none md:px-4 md:py-2 md:text-sm`}
            >
              <span className="md:hidden">Semua</span>
              <span className="hidden md:inline">Lihat Semua</span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col border-2 border-dark/20 bg-white">
                  <Skeleton className="h-40 w-full" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-dark/50">
              Belum ada karya yang disetujui. Segera bagikan karya kamu!
            </p>
          ) : (
            <MobileCarousel label="Karya terbaik" itemClass="w-[78%]">
              {projects.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.08} className="h-full">
                  <ProjectCard project={p} index={i} onClick={() => { setSelectedProject(p); setSheetOpen(true); }} />
                </Reveal>
              ))}
            </MobileCarousel>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="px-4 py-24">
        <Reveal>
          <div className="mx-auto flex max-w-3xl rotate-1 flex-col items-start gap-5 border-2 border-dark bg-white p-8 shadow-[8px_8px_0px_var(--color-maroon)] md:p-12">
          <span
            className={`${FONT_MONO} -rotate-2 border-2 border-dark bg-[#FFF3C4] px-3 py-1 text-xs font-semibold`}
          >
            Pendaftaran dibuka
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

      {/* ── BACK TO TOP ────────────────────────────── */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Kembali ke atas"
          className={`fixed bottom-24 right-4 z-50 md:bottom-6 md:right-6 flex h-12 w-12 items-center justify-center border-2 border-dark bg-maroon text-white shadow-[3px_3px_0px_var(--color-dark)] transition-all hover:-translate-y-0.5 hover:bg-hot active:translate-y-0 active:shadow-none`}
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
      )}

      {/* ── Detail karya: panel kiri, isi lengkap (sama dengan halaman karya) ── */}
      <SideSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Detail karya">
        {selectedProject && (
          <KaryaDetail
            karya={selectedProject}
            actions={
              <span className={`${FONT_MONO} inline-flex items-center gap-1.5 border-2 border-dark bg-white px-3 py-2 text-xs font-bold text-dark`}>
                <Star className="h-4 w-4 fill-[#E8A100] text-[#E8A100]" strokeWidth={1.5} />
                {selectedProject.star_count || 0} bintang
              </span>
            }
          />
        )}
      </SideSheet>
    </div>
  );
}