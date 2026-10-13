"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Calendar, CheckCircle2, Clock, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFeed } from "@/hooks/useFeed";
import { useAbsenStatus } from "@/hooks/useAbsenStatus";
import { FeedCard } from "@/components/FeedCard";
import { PixelStoryContainer } from "@/components/pixel/PixelStoryContainer";
import { GhostScreen } from "./absen/shared";

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
        <div className="bg-[#7A1B2E] text-white border-2 border-[#1A1A1A] shadow-[3px_3px_0_#1A1A1A] px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold font-mono">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>SESI AKTIF: {active[0].title}</span>
          </div>
          {active[0].status === null ? (
            <Link
              href="/dashboard/absen"
              className="text-xs font-mono font-bold bg-white text-[#7A1B2E] border border-white px-2 py-1 hover:bg-[#F5F3EF] transition-colors shrink-0"
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
            className="flex items-center gap-2 text-xs font-mono text-[#666] border border-[#DDD] px-3 py-1.5 bg-[#FAFAF8]"
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{m.title}</span>
            <span className="ml-auto shrink-0 text-[#999]">
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
      {items.map((project) => (
        <FeedCard
          key={project.id}
          project={project}
          currentUserId={currentUserId}
          onToggleStar={(id, starred) =>
            startTransition(() => toggleStar(id, starred))
          }
        />
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full border-2 border-[#1A1A1A] py-3 font-mono text-sm flex items-center justify-center gap-2 hover:bg-[#F5F3EF] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ChevronDown className="w-4 h-4" /> Muat lebih banyak
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [gate, setGate] = useState<"checking" | "ok" | "blocked">("checking");

  // Guard akun: pending/rejected/kicked tetap bisa OTP-login (auth.users ada),
  // tapi tanpa profile aktif dashboard ditutup — sama aturan dengan /absen.
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
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#7A1B2E]" />
      </div>
    );
  }

  if (gate === "blocked") {
    return <GhostScreen />;
  }

  return <DashboardContent />;
}

function DashboardContent() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* Pixel Story — identitas anggota di atas feed (PRD Phase 3) */}
      <section aria-label="Pixel Story">
        <PixelStoryContainer />
      </section>

      <hr className="border-t-2 border-[#1A1A1A]" />

      {/* Absen Banner */}
      <section aria-label="Status Absen">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm uppercase tracking-widest font-mono text-[#7A1B2E]">
            // Absen
          </h2>
          <Link
            href="/dashboard/absen/riwayat"
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
          <h2 className="font-extrabold text-sm uppercase tracking-widest font-mono text-[#1A1A1A]">
            // Timeline Karya
          </h2>
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
