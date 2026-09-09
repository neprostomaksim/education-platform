"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Star, Library, Plus, EyeOff } from "lucide-react";
import { useToast } from "@/components/shared/toast-provider";
import { createClient } from "@/lib/supabase/client";
import { LibraryCard } from "@/components/library/library-card";
import { LibraryDetail } from "@/components/library/library-detail";
import { LibraryPaywall } from "@/components/library/library-paywall";
import { LibraryForm, draftFrom, type LibraryDraft } from "@/components/library/library-form";
import { KIND_META } from "@/components/library/kind-meta";
import { SPECIALTIES, type Specialty } from "@/lib/specialties";
import { LIBRARY_KINDS, type LibraryData, type LibraryKind } from "@/lib/library";

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

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter((c): c is string => !!c))).sort(),
    [items]
  );

  const matches = (item: (typeof items)[number], ignore: "kind" | "category" | null) => {
    if (ignore !== "kind" && kind !== "all" && item.kind !== kind) return false;
    if (ignore !== "category" && category !== "all" && item.category !== category) return false;
    if (specialty !== "all" && item.specialty !== specialty && item.specialty !== "all") return false;
    if (favoritesOnly && !favorites.has(item.id)) return false;
    if (draftsOnly && item.is_published) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const hit =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.platform ?? "").toLowerCase().includes(q) ||
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

  const toggleFavorite = async (id: string) => {
    if (!userId) return;
    const next = new Set(favorites);
    const adding = !next.has(id);
    if (adding) next.add(id); else next.delete(id);
    setFavorites(next);
    const { error } = adding
      ? await supabase.from("library_favorites").insert({ user_id: userId, item_id: id })
      : await supabase.from("library_favorites").delete().eq("user_id", userId).eq("item_id", id);
    if (error) {
      setFavorites(favorites);
      addToast("Не удалось обновить избранное", "error");
    }
  };

  const openItem = openId ? items.find((i) => i.id === openId) ?? null : null;
  const dirty = !!query.trim() || kind !== "all" || category !== "all" || specialty !== "all" || favoritesOnly || draftsOnly;
  const reset = () => {
    setQuery(""); setKind("all"); setCategory("all");
    setSpecialty("all"); setFavoritesOnly(false); setDraftsOnly(false);
  };

  if (!hasAccess) return <LibraryPaywall teasers={teasers} botUsername={botUsername} />;

  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
      active
        ? "border-transparent bg-accent font-semibold text-accent-foreground"
        : "border-border bg-card text-muted hover:border-border-hover hover:text-foreground"
    }`;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in p-4 lg:p-8">
      <header className="mb-5 flex flex-wrap items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10">
          <Library className="h-6 w-6 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">Библиотека</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted lg:text-base">
            Промпты, скилы и инструменты для работы с ИИ — в одном поиске.
          </p>
          <div className="mt-3 flex flex-wrap gap-5 text-[12.5px] text-muted">
            {LIBRARY_KINDS.map((k) => (
              <span key={k}>
                <b className="font-bold tabular-nums text-foreground">
                  {items.filter((i) => i.kind === k).length}
                </b>{" "}
                {KIND_META[k].label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setDraft(draftFrom(null))}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" /> Добавить
          </button>
        )}
      </header>

      <div className="sticky top-0 z-10 -mx-4 mb-5 border-b border-border bg-background/85 px-4 py-3.5 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, описанию, тегам…"
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-11 text-[15px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Очистить"
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg bg-card-hover text-muted hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Тип</span>
            <button type="button" onClick={() => setKind("all")} className={chip(kind === "all")}>Все</button>
            {LIBRARY_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={chip(kind === k)}>
                {KIND_META[k].emoji} {KIND_META[k].label}
                <span className={`tabular-nums text-[10.5px] ${kind === k ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                  {items.filter((i) => matches(i, "kind") && i.kind === k).length}
                </span>
              </button>
            ))}
            <button
              type="button" onClick={() => setFavoritesOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
                favoritesOnly ? "border-transparent bg-amber-400 font-semibold text-amber-950" : "border-border bg-card text-muted hover:border-border-hover hover:text-foreground"
              }`}
            >
              <Star className="h-3.5 w-3.5" fill={favoritesOnly ? "currentColor" : "none"} />
              Избранное
              {favorites.size > 0 && <span className={favoritesOnly ? "text-amber-950/60" : "text-muted-foreground"}>{favorites.size}</span>}
            </button>
            {isAdmin && (
              <button
                type="button" onClick={() => setDraftsOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-all ${
                  draftsOnly ? "border-transparent bg-warning font-semibold text-[#1a1206]" : "border-border bg-card text-muted hover:border-border-hover hover:text-foreground"
                }`}
              >
                <EyeOff className="h-3.5 w-3.5" /> Черновики
                <span className={draftsOnly ? "text-[#1a1206]/60" : "text-muted-foreground"}>
                  {items.filter((i) => !i.is_published).length}
                </span>
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Категория</span>
              <button type="button" onClick={() => setCategory("all")} className={chip(category === "all")}>Все</button>
              {categories.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)} className={chip(category === c)}>
                  {c}
                  <span className={`tabular-nums text-[10.5px] ${category === c ? "text-accent-foreground/60" : "text-muted-foreground"}`}>
                    {items.filter((i) => matches(i, "category") && i.category === c).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Роль</span>
            {SPECIALTIES.map((s) => (
              <button key={s.id} type="button" onClick={() => setSpecialty(s.id)} className={chip(specialty === s.id)}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">
          Найдено <b className="font-semibold tabular-nums text-foreground">{results.length}</b> из {items.length}
        </span>
        {dirty && (
          <button type="button" onClick={reset} className="text-[12.5px] text-accent hover:text-accent-hover">
            Сбросить фильтры
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
              : "Попробуйте другой тип, категорию или упростите запрос."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
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
          draft={draft} categories={categories}
          onClose={() => setDraft(null)}
          onSaved={() => { setDraft(null); addToast("Сохранено", "success"); router.refresh(); }}
          onError={(message) => addToast(message, "error")}
        />
      )}
    </div>
  );
}
