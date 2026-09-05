"use client";

import { Star, SlidersHorizontal } from "lucide-react";
import { getSpecialtyInfo } from "@/lib/specialties";
import { extractVariables } from "@/lib/prompt-utils";
import type { PromptData } from "@/components/lesson/prompt-card";

interface PromptCatalogCardProps {
  data: PromptData;
  categoryLabel: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (id: string) => void;
}

/**
 * Compact, scannable catalog card. Shows what the prompt is (title, role,
 * variable count, tags) — the full template lives in the detail modal, so the
 * library reads as a catalog instead of a wall of monospace text.
 */
export function PromptCatalogCard({
  data,
  categoryLabel,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: PromptCatalogCardProps) {
  const specialty = getSpecialtyInfo(data.specialty);
  const variableCount = extractVariables(data.prompt).length;

  return (
    <button
      type="button"
      onClick={() => onOpen(data.id)}
      className="group flex w-full flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_6px_22px_rgba(0,0,0,0.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* Role + favorite */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${specialty.colorClass}`}
        >
          {specialty.emoji} {specialty.label}
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label={isFavorite ? "Убрать из избранного" : "В избранное"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(data.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(data.id);
            }
          }}
          className={`-mr-1 -mt-1 grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors ${
            isFavorite
              ? "text-amber-400"
              : "text-muted-foreground hover:bg-card-hover hover:text-amber-400"
          }`}
        >
          <Star className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
        </span>
      </div>

      {/* Title + description */}
      <h3 className="text-sm font-semibold leading-snug tracking-tight text-foreground">
        {data.title}
      </h3>
      <p className="text-xs leading-relaxed text-muted">{data.description}</p>

      {/* Meta */}
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        {variableCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2 py-1 font-mono text-[10.5px] font-medium text-accent">
            <SlidersHorizontal className="h-3 w-3" />
            {variableCount} перем.
          </span>
        )}
        <span className="text-[11px] text-muted-foreground">{categoryLabel}</span>
      </div>

      {/* Tags */}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-0.5">
        {data.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-border bg-card-hover px-1.5 py-0.5 text-[10px] font-medium text-muted"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
