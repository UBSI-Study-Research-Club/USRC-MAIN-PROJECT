"use client";

import { Star, ExternalLink, User } from "lucide-react";
import type { FeedProject } from "@/hooks/useFeed";
import { KaryaCover } from "@/components/KaryaCover";

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

const FONT_DISPLAY = "font-[family-name:var(--font-outfit)]";
const FONT_MONO = "font-[family-name:var(--font-ibm-plex-mono)]";

export function FeedCard({ project, currentUserId, onToggleStar }: FeedCardProps) {
  const ownProject = currentUserId === project.owner?.id;
  const canStar = !!currentUserId && !ownProject;

  return (
    <article className="border-[3px] border-dark bg-white shadow-[6px_6px_0px_var(--color-dark)] overflow-hidden transition-all hover:-translate-y-1">
      {/* Header category badge */}
      {project.category && (
        <div className="flex items-center justify-between bg-[#FFF3C4] border-b-[3px] border-dark px-4 py-2">
          <span className={`${FONT_MONO} text-xs font-bold uppercase tracking-wider text-dark`}>
            {project.category}
          </span>
          <span className={`${FONT_MONO} text-[10px] uppercase text-dark/50`}>
            // USRC FEED
          </span>
        </div>
      )}

      {/* Image Preview */}
      {project.image_url ? (
        <KaryaCover src={project.image_url} alt={project.title} className="aspect-[4/3] border-b-[3px] border-dark sm:aspect-[16/9] xl:aspect-[2/1]" />
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-paper border-b-[3px] border-dark">
          <span className={`${FONT_MONO} text-xs text-dark/30`}>// no preview</span>
        </div>
      )}

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
          <h3 className={`${FONT_DISPLAY} text-lg sm:text-xl font-black uppercase tracking-tight text-dark leading-snug break-words`}>
            {project.title}
          </h3>
          {project.owner && (
            <div className="flex max-w-full items-center gap-1.5 border-2 border-dark bg-paper px-2.5 py-1 shrink-0 shadow-[2px_2px_0_var(--color-dark)]">
              <User className="w-3.5 h-3.5 text-maroon" strokeWidth={2.5} />
              <span className={`${FONT_MONO} truncate text-xs font-bold text-dark`}>
                {project.owner.full_name}
              </span>
            </div>
          )}
        </div>

        {project.description && (
          <p className="line-clamp-3 text-sm text-dark/80 leading-relaxed font-[family-name:var(--font-work-sans)]">
            {project.description}
          </p>
        )}

        {/* Footer Actions */}
        <div className="mt-1 pt-3 sm:pt-4 border-t-2 border-dashed border-dark/30 flex flex-wrap items-center justify-between gap-2">
          <span className={`${FONT_MONO} text-xs text-dark/50`}>
            {formatDate(project.created_at)}
          </span>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Star button */}
            <button
              onClick={() => canStar && onToggleStar(project.id, project.my_star)}
              disabled={!canStar}
              className={[
                "flex items-center gap-1.5 border-2 border-dark px-3 py-1.5 font-mono text-xs font-bold transition-all shadow-[2px_2px_0_var(--color-dark)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
                project.my_star
                  ? "bg-maroon text-white"
                  : "bg-white text-dark hover:bg-[#FFF3C4]",
                !canStar ? "opacity-50 cursor-default" : "cursor-pointer",
              ].join(" ")}
              title={ownProject ? "Tidak bisa memberi bintang pada karya sendiri" : undefined}
            >
              <Star className="w-4 h-4" fill={project.my_star ? "currentColor" : "none"} strokeWidth={2} />
              <span>{project.star_count} Bintang</span>
            </button>

            {/* Detail Link */}
            <a
              href={`/karya#${project.id}`}
              className={`${FONT_DISPLAY} inline-flex items-center gap-1 border-2 border-dark bg-paper px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-dark shadow-[2px_2px_0_var(--color-dark)] hover:bg-maroon hover:text-white transition-colors`}
            >
              <span>Detail</span>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
