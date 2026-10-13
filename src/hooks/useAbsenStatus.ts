"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AbsenStatusItem = {
  meetingId: string;
  title: string;
  starts_at: string;
  ends_at: string;
  /** null = belum absen, 'pending' | 'approved' = sudah */
  status: "pending" | "approved" | null;
};

export function useAbsenStatus() {
  const [items, setItems] = useState<AbsenStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Ambil sesi aktif & mendatang (bukan lampau)
        const { data: meetings, error: mErr } = await supabase
          .from("meetings")
          .select("id, title, starts_at, ends_at")
          .gte("ends_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(5);

        if (mErr) throw mErr;
        if (!meetings?.length) {
          setItems([]);
          return;
        }

        const meetingIds = meetings.map((m) => m.id);
        const { data: attendances, error: aErr } = await supabase
          .from("attendances")
          .select("meeting_id, status")
          .eq("user_id", user.id)
          .in("meeting_id", meetingIds);

        if (aErr) throw aErr;

        const attMap = Object.fromEntries(
          (attendances ?? []).map((a) => [a.meeting_id, a.status])
        );

        if (!cancelled) {
          setItems(
            meetings.map((m) => ({
              meetingId: m.id,
              title: m.title,
              starts_at: m.starts_at,
              ends_at: m.ends_at,
              status: attMap[m.id] ?? null,
            }))
          );
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Gagal memuat status absen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { items, loading, error };
}
