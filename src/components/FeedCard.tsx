"use client";

import { Star, ExternalLink, User } from "lucide-react";
import type { FeedProject } from "@/hooks/useFeed";

interface FeedCardProps {
  project: FeedProject;
  currentUserId: string | null;
  onToggleStar: (id: string, starred: boolean) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FeedCard({ project, currentUserId, onToggleStar }: FeedCardProps) {
  const ownProject = currentUserId === project.owner?.id;
  const canStar = !!currentUserId && !ownProject;

  return (
    <article className="bg-white border-2 border-[#1A1A1A] shadow-[4px_4px_0_#1A1A1A] overflow-hidden">
      {/* Gambar */}
      {project.image_url && (
        <div className="border-b-2 border-[#1A1A1A] aspect-video overflow-hidden bg-[#F5F3EF]">
          <img
            src={project.image_url}
            alt={project.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Header: nama + kategori */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-base leading-tight font-['Outfit']">
              {project.title}
            </h3>
            {project.category && (
              <span className="inline-block mt-1 text-[10px] font-mono border border-[#1A1A1A] px-1.5 py-0.5 bg-[#F5F3EF] uppercase tracking-widest">
                {project.category}
              </span>
            )}
          </div>
          {project.owner && (
            <div className="flex items-center gap-1 text-xs text-[#666] shrink-0">
              <User className="w-3 h-3" />
              <span className="font-mono">{project.owner.full_name}</span>
            </div>
          )}
        </div>

        {/* Deskripsi */}
        {project.description && (
          <p className="text-sm text-[#444] leading-relaxed line-clamp-3">
            {project.description}
          </p>
        )}

        {/* Footer: tanggal + star + link */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] font-mono text-[#888]">
            {formatDate(project.created_at)}
          </span>

          <div className="flex items-center gap-3">
            {/* Star */}
            <button
              onClick={() => canStar && onToggleStar(project.id, project.my_star)}
              disabled={!canStar}
              className={[
                "flex items-center gap-1 text-xs font-mono border border-[#1A1A1A] px-2 py-1 transition-colors",
                project.my_star
                  ? "bg-[#7A1B2E] text-white"
                  : "bg-white text-[#1A1A1A] hover:bg-[#F5F3EF]",
                !canStar ? "opacity-40 cursor-default" : "cursor-pointer",
              ].join(" ")}
              title={ownProject ? "Tidak bisa bintang karya sendiri" : undefined}
              aria-label={`${project.my_star ? "Hapus bintang" : "Beri bintang"} pada ${project.title}`}
            >
              <Star className="w-3 h-3" fill={project.my_star ? "currentColor" : "none"} />
              <span>{project.star_count}</span>
            </button>

            {/* Link ke /karya detail — placeholder, Yoga/Chello handle modal */}
            <a
              href={`/karya#${project.id}`}
              className="flex items-center gap-1 text-xs font-mono border border-[#1A1A1A] px-2 py-1 hover:bg-[#F5F3EF] transition-colors"
              aria-label={`Lihat detail ${project.title}`}
            >
              <ExternalLink className="w-3 h-3" />
              Detail
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
