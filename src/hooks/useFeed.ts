"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type FeedProject = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  created_at: string;
  star_count: number;
  my_star: boolean;
  owner: { id: string; full_name: string; nim: string | null } | null;
};

const PAGE_SIZE = 10;

export function useFeed() {
  const [items, setItems] = useState<FeedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  // Load user id once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPage = useCallback(
    async (pageNum: number, uid: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error: err } = await supabase
          .from("projects")
          .select(
            `id, title, description, image_url, category, created_at,
             profiles:user_id ( id, full_name, nim ),
             project_stars ( user_id )`
          )
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .range(from, to);

        if (err) throw err;

        const mapped: FeedProject[] = (data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          image_url: p.image_url,
          category: p.category,
          created_at: p.created_at,
          star_count: p.project_stars?.length ?? 0,
          my_star: uid
            ? (p.project_stars ?? []).some((s: any) => s.user_id === uid)
            : false,
          owner: p.profiles ?? null,
        }));

        setItems((prev) =>
          pageNum === 0 ? mapped : [...prev, ...mapped]
        );
        setHasMore(mapped.length === PAGE_SIZE);
      } catch (e: any) {
        setError(e.message ?? "Gagal memuat feed.");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // Initial load — wait until userId resolved (null = not logged in, still valid)
  useEffect(() => {
    // userId state initialized as null; wait one tick after auth resolves
    const timer = setTimeout(() => fetchPage(0, userId), 0);
    return () => clearTimeout(timer);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, userId);
  }, [page, userId, fetchPage]);

  const toggleStar = useCallback(
    async (projectId: string, currentlyStar: boolean) => {
      if (!userId) return;
      // Optimistic update
      setItems((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                my_star: !currentlyStar,
                star_count: p.star_count + (currentlyStar ? -1 : 1),
              }
            : p
        )
      );
      try {
        if (currentlyStar) {
          const { error } = await supabase
            .from("project_stars")
            .delete()
            .eq("project_id", projectId)
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("project_stars")
            .insert({ project_id: projectId, user_id: userId });
          if (error) throw error;
        }
      } catch (err) {
        console.error("Star toggle failed, rolling back:", err);
        // Rollback state
        setItems((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  my_star: currentlyStar,
                  star_count: p.star_count + (currentlyStar ? 1 : -1),
                }
              : p
          )
        );
        alert("Gagal memperbarui bintang. Periksa koneksi internetmu.");
      }
    },
    [userId, supabase]
  );

  return { items, loading, error, hasMore, loadMore, toggleStar };
}
