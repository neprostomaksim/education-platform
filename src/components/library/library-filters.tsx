"use client";

import { X, EyeOff, RotateCcw } from "lucide-react";
import { SPECIALTIES, type Specialty } from "@/lib/specialties";

interface LibraryFiltersProps {
  categories: { name: string; count: number }[];
  category: string;
  setCategory: (value: string) => void;
  specialty: Specialty | "all";
  setSpecialty: (value: Specialty | "all") => void;
  draftsOnly: boolean;
  setDraftsOnly: (value: boolean) => void;
  draftCount: number;
  isAdmin: boolean;
  resultCount: number;
  hasActive: boolean;
  onReset: () => void;
  onClose: () => void;
}

/**
 * Secondary filters, opened on demand. Keeping category and role out of the
 * default view is the point: they are useful occasionally, but permanently
 * showing ~20 chips buried the content they were meant to filter.
 *
 * Categories are scoped to the current type — prompt topics and tool topics are
 * separate taxonomies, and mixing them produced a meaningless combined list.
 */
export function LibraryFilters({
  categories, category, setCategory, specialty, setSpecialty,
  draftsOnly, setDraftsOnly, draftCount, isAdmin, resultCount,
  hasActive, onReset, onClose,
}: LibraryFiltersProps) {
  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
      active
        ? "border-transparent bg-accent font-semibold text-accent-foreground"
        : "border-border bg-background text-muted hover:border-border-hover hover:text-foreground"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-7"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-2xl">
        <div className="relative border-b border-border p-5 pr-14">
          <button
            type="button" onClick={onClose} aria-label="Закрыть"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-border bg-card-hover text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-base font-bold tracking-tight text-foreground">Фильтры</h2>
        </div>

        <div className="grid gap-5 overflow-y-auto p-5">
          {categories.length > 1 && (
            <div>
              <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                Категория
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCategory("all")} className={chip(category === "all")}>
                  Все
                </button>
                {categories.map((c) => (
                  <button key={c.name} type="button" onClick={() => setCategory(c.name)} className={chip(category === c.name)}>
                    {c.name}
                    <span className={`tabular-nums text-[10.5px] ${category === c.name ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              Роль
            </div>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button key={s.id} type="button" onClick={() => setSpecialty(s.id)} className={chip(specialty === s.id)}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
              <input
                type="checkbox" checked={draftsOnly}
                onChange={(e) => setDraftsOnly(e.target.checked)}
                className="h-4 w-4 accent-[#A3E635]"
              />
              <span className="flex items-center gap-1.5 text-[13px] text-foreground">
                <EyeOff className="h-3.5 w-3.5 text-warning" />
                Только черновики
                <span className="text-[11.5px] text-muted">({draftCount})</span>
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-t border-border p-5">
          {hasActive && (
            <button
              type="button" onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card-hover px-4 py-3 text-sm font-semibold text-muted transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" /> Сбросить
            </button>
          )}
          <button
            type="button" onClick={onClose}
            className="flex-1 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Показать {resultCount}
          </button>
        </div>
      </div>
    </div>
  );
}
