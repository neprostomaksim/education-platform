"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Star, Library, Plus, SlidersHorizontal, EyeOff } from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { LibraryCard } from "@/components/library/library-card";
import { LibraryDetail } from "@/components/library/library-detail";
import { LibraryPaywall } from "@/components/library/library-paywall";
import { LibraryFilters } from "@/components/library/library-filters";
import { LibraryForm, draftFrom, type LibraryDraft } from "@/components/library/library-form";
import { KIND_META } from "@/components/library/kind-meta";
import { getSpecialtyInfo, type Specialty } from "@/lib/specialties";
import { LIBRARY_KINDS, type LibraryData, type LibraryKind } from "@/lib/library-shared";

type KindFilter = LibraryKind | "all";

export function LibraryClient({
  userId, items, teasers, favorites: initialFavorites, notes, hasAccess, isAdmin, botUsername,
}: LibraryData) {
  const { addToast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [category, setCategory] = useState("all");
  const [specialty, setSpecialty] = useState<Specialty | "all">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [draftsOnly, setDraftsOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LibraryDraft | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /** `skip` lets a control count its own options without filtering itself out. */
  const matches = (item: (typeof items)[number], skip: "kind" | "category" | null) => {
    if (skip !== "kind" && kind !== "all" && item.kind !== kind) return false;
    if (skip !== "category" && category !== "all" && item.category !== category) return false;
    if (specialty !== "all" && item.specialty !== specialty && item.specialty !== "all") return false;
    if (favoritesOnly && !favorites.has(item.id)) return false;
    if (draftsOnly && item.is_published) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const hit =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.platform ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  };

  const results = useMemo(
    () => items.filter((i) => matches(i, null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, query, kind, category, specialty, favoritesOnly, draftsOnly, favorites]
  );

  // Prompt topics and tool topics are different taxonomies, so categories are
  // scoped to the selected type instead of merged into one meaningless list.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.category || !matches(item, "category")) continue;
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, kind, specialty, favoritesOnly, draftsOnly, favorites, query]);

  const selectKind = (next: KindFilter) => {
    setKind(next);
    setCategory("all"); // категории у типов разные — старый выбор дал бы пустой список
  };

  const toggleFavorite = async (id: string) => {
    if (!userId) return;
    const previous = favorites;
    const next = new Set(favorites);
    const adding = !next.has(id);
    if (adding) next.add(id); else next.delete(id);
    setFavorites(next);
    const { error } = adding
      ? await supabase.from("library_favorites").insert({ user_id: userId, item_id: id })
      : await supabase.from("library_favorites").delete().eq("user_id", userId).eq("item_id", id);
    if (error) {
      setFavorites(previous);
      addToast("Не удалось обновить избранное", "error");
    }
  };

  const openItem = openId ? items.find((i) => i.id === openId) ?? null : null;
  const draftCount = items.filter((i) => !i.is_published).length;
  const extraFilters = (category !== "all" ? 1 : 0) + (specialty !== "all" ? 1 : 0) + (draftsOnly ? 1 : 0);
  const anyFilter = extraFilters > 0 || favoritesOnly || kind !== "all" || !!query.trim();

  const resetAll = () => {
    setQuery(""); setKind("all"); setCategory("all");
    setSpecialty("all"); setFavoritesOnly(false); setDraftsOnly(false);
  };

  if (!hasAccess) return <LibraryPaywall teasers={teasers} botUsername={botUsername} />;

  const segment = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${
      active
        ? "border-transparent bg-accent font-semibold text-accent-foreground"
        : "border-border bg-card text-muted hover:border-border-hover hover:text-foreground"
    }`;

  const pill = "inline-flex items-center gap-1.5 rounded-full border border-border bg-card-hover px-2.5 py-1 text-[11.5px] text-muted";

  return (
    <div className="mx-auto max-w-6xl animate-fade-in p-4 lg:p-8">
      {/* Header */}
      <header className="mb-4 flex items-start gap-3 sm:gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 sm:h-12 sm:w-12">
          <Library className="h-5 w-5 text-accent sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">Библиотека</h1>
          <p className="mt-0.5 text-[13px] text-muted sm:text-sm">
            <b className="font-semibold tabular-nums text-foreground">{items.length}</b> материалов для работы с ИИ
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setDraft(draftFrom(null))}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover sm:px-4"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Добавить</span>
          </button>
        )}
      </header>

      {/* Toolbar: search + type. Everything else lives behind «Фильтры». */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск…"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-9 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Очистить"
                className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md bg-card-hover text-muted hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <button
            type="button" onClick={() => setFavoritesOnly((v) => !v)}
            aria-label="Только избранное"
            title="Только избранное"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${
              favoritesOnly
                ? "border-transparent bg-amber-400 text-amber-950"
                : "border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            <Star className="h-4 w-4" fill={favoritesOnly ? "currentColor" : "none"} />
          </button>

          <button
            type="button" onClick={() => setFiltersOpen(true)}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
              extraFilters > 0
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-card text-muted hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Фильтры</span>
            {extraFilters > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {extraFilters}
              </span>
            )}
          </button>
        </div>

        <div className="hide-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
          <button type="button" onClick={() => selectKind("all")} className={segment(kind === "all")}>
            Все
            <span className={`tabular-nums text-[10.5px] ${kind === "all" ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
              {items.filter((i) => matches(i, "kind")).length}
            </span>
          </button>
          {LIBRARY_KINDS.map((k) => (
            <button key={k} type="button" onClick={() => selectKind(k)} className={segment(kind === k)}>
              {KIND_META[k].emoji} {KIND_META[k].label}
              <span className={`tabular-nums text-[10.5px] ${kind === k ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                {items.filter((i) => matches(i, "kind") && i.kind === k).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active secondary filters, removable one by one */}
      {extraFilters > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {category !== "all" && (
            <span className={pill}>
              {category}
              <button type="button" onClick={() => setCategory("all")} aria-label="Убрать категорию" className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {specialty !== "all" && (
            <span className={pill}>
              {getSpecialtyInfo(specialty).emoji} {getSpecialtyInfo(specialty).label}
              <button type="button" onClick={() => setSpecialty("all")} aria-label="Убрать роль" className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {draftsOnly && (
            <span className={pill}>
              <EyeOff className="h-3 w-3 text-warning" /> Черновики
              <button type="button" onClick={() => setDraftsOnly(false)} aria-label="Показать все" className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">
          <b className="font-semibold tabular-nums text-foreground">{results.length}</b>
          {results.length !== items.length && <> из {items.length}</>}
        </span>
        {anyFilter && (
          <button type="button" onClick={resetAll} className="text-[12.5px] text-accent hover:text-accent-hover">
            Сбросить
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card px-5 py-16 text-center text-muted">
          <Search className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <h3 className="mb-1.5 text-lg font-semibold text-foreground">
            {items.length === 0 ? "Библиотека пока пуста" : "Ничего не найдено"}
          </h3>
          <p className="mx-auto max-w-sm text-sm">
            {items.length === 0
              ? isAdmin ? "Нажмите «Добавить», чтобы положить сюда первый промпт, скил или инструмент." : "Скоро здесь появятся материалы."
              : "Попробуйте другой запрос или сбросьте фильтры."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((item) => (
            <LibraryCard
              key={item.id} item={item} isAdmin={isAdmin}
              isFavorite={favorites.has(item.id)}
              onToggleFavorite={toggleFavorite}
              onOpen={setOpenId}
              onEdit={(id) => {
                const target = items.find((i) => i.id === id);
                if (target) setDraft(draftFrom(target, notes[id] ?? ""));
              }}
            />
          ))}
        </div>
      )}

      {filtersOpen && (
        <LibraryFilters
          categories={categories} category={category} setCategory={setCategory}
          specialty={specialty} setSpecialty={setSpecialty}
          draftsOnly={draftsOnly} setDraftsOnly={setDraftsOnly}
          draftCount={draftCount} isAdmin={isAdmin}
          resultCount={results.length} hasActive={extraFilters > 0}
          onReset={() => { setCategory("all"); setSpecialty("all"); setDraftsOnly(false); }}
          onClose={() => setFiltersOpen(false)}
        />
      )}

      {openItem && (
        <LibraryDetail
          item={openItem} note={notes[openItem.id]} isAdmin={isAdmin}
          isFavorite={favorites.has(openItem.id)}
          onToggleFavorite={toggleFavorite}
          onEdit={(id) => {
            const target = items.find((i) => i.id === id);
            if (target) { setOpenId(null); setDraft(draftFrom(target, notes[id] ?? "")); }
          }}
          onClose={() => setOpenId(null)}
          onCopied={(message) => addToast(message, "success")}
        />
      )}

      {draft && (
        <LibraryForm
          draft={draft} categories={categories.map((c) => c.name)}
          onClose={() => setDraft(null)}
          onSaved={() => { setDraft(null); addToast("Сохранено", "success"); router.refresh(); }}
          onError={(message) => addToast(message, "error")}
        />
      )}
    </div>
  );
}
