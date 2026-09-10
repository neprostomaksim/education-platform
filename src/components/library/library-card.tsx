"use client";

import { Star, SlidersHorizontal, Link2, Pencil, EyeOff } from "lucide-react";
import { extractVariables } from "@/lib/prompt-utils";
import type { LibraryItem } from "@/lib/library-shared";
import { KIND_META, ACCESS_META } from "./kind-meta";

interface LibraryCardProps {
  item: LibraryItem;
  isFavorite: boolean;
  isAdmin: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Compact catalog card. Type, title and the one-line "what it does" carry the
 * scan; everything else is muted secondary metadata on a single footer line, so
 * a wall of cards stays readable. Tags live in the detail view — they are
 * searchable, and repeating them here only added noise.
 */
export function LibraryCard({
  item, isFavorite, isAdmin, onToggleFavorite, onOpen, onEdit,
}: LibraryCardProps) {
  const kind = KIND_META[item.kind];
  const access = ACCESS_META[item.access];
  const variables = item.kind === "prompt" && item.body ? extractVariables(item.body).length : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item.id); }
      }}
      className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_6px_22px_rgba(0,0,0,0.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${kind.badge}`}>
            {kind.emoji} {kind.one}
          </span>
          {isAdmin && !item.is_published && (
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
              <EyeOff className="h-2.5 w-2.5" /> Черновик
            </span>
          )}
        </div>
        <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center">
          {isAdmin && (
            <span
              role="button" tabIndex={0} aria-label="Редактировать"
              onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onEdit(item.id); }
              }}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </span>
          )}
          <span
            role="button" tabIndex={0}
            aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.id); }
            }}
            className={`grid h-7 w-7 cursor-pointer place-items-center rounded-lg transition-colors ${
              isFavorite ? "text-amber-400" : "text-muted-foreground hover:bg-card-hover hover:text-amber-400"
            }`}
          >
            <Star className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
          </span>
        </div>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
        {item.title}
      </h3>
      {item.description && (
        <div className="group/desc relative">
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>
          {/* Full text on hover — the clamped 2 lines often can't say what it is.
              On touch (no hover) tapping the card opens the detail with full text. */}
          {item.description.length > 88 && (
            <div className="pointer-events-none absolute left-0 right-0 top-full z-30 mt-1.5 hidden rounded-xl border border-border bg-card-hover p-3 text-[12px] leading-relaxed text-foreground shadow-[0_12px_30px_rgba(0,0,0,0.55)] group-hover/desc:block">
              {item.description}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[11px] text-muted-foreground">
        {item.kind !== "prompt" && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${access.badge}`}>
            {access.emoji} {access.short}
          </span>
        )}
        {item.quick_install && (
          <span
            title="Ставится одной командой по ссылке"
            className="inline-flex items-center gap-0.5 rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent"
          >
            ⚡ по ссылке
          </span>
        )}
        {variables > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent">
            <SlidersHorizontal className="h-2.5 w-2.5" />{variables}
          </span>
        )}
        {item.platform && <span className="truncate">{item.platform}</span>}
        {item.source_url && <Link2 className="h-3 w-3 shrink-0" />}
      </div>
    </div>
  );
}
