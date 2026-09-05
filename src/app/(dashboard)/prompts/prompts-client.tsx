"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Star, Sparkles } from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import { PromptCatalogCard } from "@/components/prompts/prompt-catalog-card";
import { PromptDetailModal } from "@/components/prompts/prompt-detail-modal";
import { PromptsPaywall } from "@/components/prompts/prompts-paywall";
import { SPECIALTIES, type Specialty } from "@/lib/specialties";
import type { PromptMeta } from "@/lib/prompts-data";
import type { PromptData } from "@/components/lesson/prompt-card";

const ROLE_KEY = "prompts-role";
const FAVS_KEY = "prompts-favorites";

interface Category {
  id: string;
  label: string;
  description: string;
}

interface PromptsClientProps {
  meta: PromptMeta[];
  bodies: Record<string, string> | null;
  hasAccess: boolean;
  categories: Category[];
  botUsername: string;
}

export function PromptsClient({
  meta,
  bodies,
  hasAccess,
  categories,
  botUsername,
}: PromptsClientProps) {
  const { addToast } = useToast();

  // Full prompts (meta + body) exist only for entitled users.
  const prompts: PromptData[] = useMemo(
    () =>
      hasAccess && bodies
        ? meta.map((m) => ({ ...m, prompt: bodies[m.id] ?? "" }))
        : [],
    [meta, bodies, hasAccess]
  );

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Specialty>("all");
  const [category, setCategory] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem(ROLE_KEY);
      const storedFavs = JSON.parse(localStorage.getItem(FAVS_KEY) || "[]");
      /* eslint-disable react-hooks/set-state-in-effect */
      if (storedRole) setRole(storedRole as Specialty);
      if (Array.isArray(storedFavs)) setFavorites(new Set(storedFavs));
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const selectRole = (next: Specialty) => {
    setRole(next);
    try {
      localStorage.setItem(ROLE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAVS_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const categoryLabel = (id: string) =>
    categories.find((c) => c.id === id)?.label ?? id;

  const matches = (
    p: PromptData,
    ignore: "role" | "category" | "favorites" | null
  ) => {
    if (ignore !== "role" && role !== "all" && p.specialty !== role && p.specialty !== "all")
      return false;
    if (ignore !== "category" && category !== "all" && p.category !== category)
      return false;
    if (ignore !== "favorites" && favoritesOnly && !favorites.has(p.id)) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const hit =
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  };

  const results = useMemo(
    () => prompts.filter((p) => matches(p, null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prompts, query, role, category, favoritesOnly, favorites]
  );

  const roleCount = (id: Specialty) =>
    prompts.filter(
      (p) => matches(p, "role") && (id === "all" || p.specialty === id || p.specialty === "all")
    ).length;

  const categoryCount = (id: string) =>
    prompts.filter(
      (p) => matches(p, "category") && (id === "all" || p.category === id)
    ).length;

  const isDirty =
    !!query.trim() || role !== "all" || category !== "all" || favoritesOnly;

  const resetFilters = () => {
    setQuery("");
    selectRole("all");
    setCategory("all");
    setFavoritesOnly(false);
  };

  const openPrompt = openId ? prompts.find((p) => p.id === openId) ?? null : null;

  // Non-buyers see the paywall (metadata preview + CTA to the bot). Hooks above
  // still run on the empty prompt set, so this early return is order-safe.
  if (!hasAccess) {
    return (
      <PromptsPaywall
        meta={meta}
        categories={categories}
        botUsername={botUsername}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in p-4 lg:p-8">
      {/* Header */}
      <header className="mb-5 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10">
          <Sparkles className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Библиотека промптов
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted lg:text-base">
            Готовые промпты под вашу роль. Найдите нужный, заполните переменные —
            и копируйте готовый текст.
          </p>
          <div className="mt-3 flex flex-wrap gap-5 text-[12.5px] text-muted">
            <span>
              <b className="font-bold text-foreground tabular-nums">{prompts.length}</b> промптов
            </span>
            <span>
              <b className="font-bold text-foreground tabular-nums">{categories.length}</b> категорий
            </span>
            <span>
              под <b className="font-bold text-foreground tabular-nums">{SPECIALTIES.length - 1}</b> ролей
            </span>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-border bg-background/85 px-4 py-3.5 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: контент-план, договор, SWOT, оценка…"
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-11 text-[15px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Очистить"
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg bg-card-hover text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              Ваша роль
            </span>
            {SPECIALTIES.map((s) => (
              <FilterChip
                key={s.id}
                active={role === s.id}
                onClick={() => selectRole(s.id)}
                count={s.id === "all" ? undefined : roleCount(s.id)}
              >
                {s.emoji} {s.label}
              </FilterChip>
            ))}
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
                favoritesOnly
                  ? "border-transparent bg-amber-400 font-semibold text-amber-950"
                  : "border-border bg-card text-muted hover:border-border-hover hover:text-foreground"
              }`}
            >
              <Star className="h-3.5 w-3.5" fill={favoritesOnly ? "currentColor" : "none"} />
              Избранное
              {favorites.size > 0 && (
                <span className={favoritesOnly ? "text-amber-950/60" : "text-muted-foreground"}>
                  {favorites.size}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
              Категория
            </span>
            <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
              Все
            </FilterChip>
            {categories.map((c) => (
              <FilterChip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                count={categoryCount(c.id)}
              >
                {c.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* Result bar */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">
          Найдено <b className="font-semibold text-foreground tabular-nums">{results.length}</b> из{" "}
          {prompts.length}
        </span>
        {isDirty && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[12.5px] text-accent hover:text-accent-hover"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Grid / empty */}
      {results.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card px-5 py-16 text-center text-muted">
          <Search className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <h3 className="mb-1.5 text-lg font-semibold text-foreground">Ничего не найдено</h3>
          <p className="mx-auto max-w-sm text-sm">
            Попробуйте другую роль, категорию или упростите запрос.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <PromptCatalogCard
              key={p.id}
              data={p}
              categoryLabel={categoryLabel(p.category)}
              isFavorite={favorites.has(p.id)}
              onToggleFavorite={toggleFavorite}
              onOpen={setOpenId}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {openPrompt && (
        <PromptDetailModal
          data={openPrompt}
          categoryLabel={categoryLabel(openPrompt.category)}
          isFavorite={favorites.has(openPrompt.id)}
          onToggleFavorite={toggleFavorite}
          onClose={() => setOpenId(null)}
          onCopied={(msg) => addToast(msg, "success")}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
        active
          ? "border-transparent bg-accent font-semibold text-accent-foreground"
          : "border-border bg-card text-muted hover:border-border-hover hover:text-foreground"
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`tabular-nums text-[10.5px] ${
            active ? "text-accent-foreground/60" : "text-muted-foreground"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
