"use client";

import { Star, SlidersHorizontal, Link2, Pencil, EyeOff } from "lucide-react";
import { extractVariables } from "@/lib/prompt-utils";
import type { LibraryItem } from "@/lib/library-shared";
import { KIND_META } from "./kind-meta";

interface LibraryCardProps {
  item: LibraryItem;
  isFavorite: boolean;
  isAdmin: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Compact catalog card. Leads with what the record IS — type, title and the
 * one-line "what it does" — because that is how you find things again. The
 * payload (prompt text, install steps) lives in the detail view.
 */
export function LibraryCard({
  item, isFavorite, isAdmin, onToggleFavorite, onOpen, onEdit,
}: LibraryCardProps) {
  const kind = KIND_META[item.kind];
  const variables = item.kind === "prompt" && item.body ? extractVariables(item.body).length : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item.id); }
      }}
      className="group flex cursor-pointer flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_6px_22px_rgba(0,0,0,0.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${kind.badge}`}>
            {kind.emoji} {kind.one}
          </span>
          {isAdmin && !item.is_published && (
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-[10.5px] font-semibold text-warning">
              <EyeOff className="h-3 w-3" /> Черновик
            </span>
          )}
        </div>
        <div className="-mr-1 -mt-1 flex shrink-0 items-center">
          {isAdmin && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Редактировать"
              onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onEdit(item.id); }
              }}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.id); }
            }}
            className={`grid h-8 w-8 cursor-pointer place-items-center rounded-lg transition-colors ${
              isFavorite ? "text-amber-400" : "text-muted-foreground hover:bg-card-hover hover:text-amber-400"
            }`}
          >
            <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold leading-snug tracking-tight text-foreground">{item.title}</h3>
      {item.description && <p className="text-xs leading-relaxed text-muted">{item.description}</p>}

      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        {variables > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2 py-1 font-mono text-[10.5px] font-medium text-accent">
            <SlidersHorizontal className="h-3 w-3" />{variables} перем.
          </span>
        )}
        {item.source_url && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Link2 className="h-3 w-3" />ссылка
          </span>
        )}
        {item.platform && <span className="text-[11px] text-muted-foreground">{item.platform}</span>}
        {item.category && <span className="text-[11px] text-muted-foreground">{item.category}</span>}
      </div>

      {item.tags.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-0.5">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md border border-border bg-card-hover px-1.5 py-0.5 text-[10px] font-medium text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
