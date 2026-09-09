"use client";

import { useState } from "react";
import { X, Loader2, Trash2, Save } from "lucide-react";
import { SPECIALTIES } from "@/lib/specialties";
import { LIBRARY_KINDS, type LibraryItem, type LibraryKind } from "@/lib/library-shared";
import { KIND_META } from "./kind-meta";

export interface LibraryDraft {
  id?: string;
  kind: LibraryKind;
  title: string;
  description: string;
  body: string;
  source_url: string;
  install_md: string;
  platform: string;
  category: string;
  specialty: string;
  tags: string;
  is_published: boolean;
  admin_note: string;
}

export function draftFrom(item: LibraryItem | null, note = ""): LibraryDraft {
  return {
    id: item?.id,
    kind: item?.kind ?? "skill",
    title: item?.title ?? "",
    description: item?.description ?? "",
    body: item?.body ?? "",
    source_url: item?.source_url ?? "",
    install_md: item?.install_md ?? "",
    platform: item?.platform ?? "",
    category: item?.category ?? "",
    specialty: item?.specialty ?? "all",
    tags: (item?.tags ?? []).join(", "),
    is_published: item?.is_published ?? true,
    admin_note: note,
  };
}

interface LibraryFormProps {
  draft: LibraryDraft;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

export function LibraryForm({ draft, categories, onClose, onSaved, onError }: LibraryFormProps) {
  const [form, setForm] = useState<LibraryDraft>(draft);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const editing = Boolean(form.id);
  const set = <K extends keyof LibraryDraft>(key: K, value: LibraryDraft[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const send = async (method: "POST" | "PATCH" | "DELETE", payload: unknown) => {
    const res = await fetch("/api/library/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Не удалось сохранить");
    }
  };

  const save = async () => {
    if (!form.title.trim()) { onError("Укажите название"); return; }
    setSaving(true);
    try {
      const payload = {
        ...(form.id ? { id: form.id } : {}),
        kind: form.kind,
        title: form.title,
        description: form.description,
        body: form.body || null,
        source_url: form.source_url || null,
        install_md: form.install_md || null,
        platform: form.platform || null,
        category: form.category || null,
        specialty: form.specialty || "all",
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_published: form.is_published,
        admin_note: form.admin_note,
      };
      await send(form.id ? "PATCH" : "POST", payload);
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!form.id || !window.confirm("Удалить запись без возможности восстановить?")) return;
    setDeleting(true);
    try {
      await send("DELETE", { id: form.id });
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Не удалось удалить");
    } finally {
      setDeleting(false);
    }
  };

  const isPrompt = form.kind === "prompt";
  const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent";
  const label = "mb-1.5 block text-xs font-semibold text-foreground";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-7"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-2xl">
        <div className="relative border-b border-border p-5 pr-14">
          <button
            type="button" onClick={onClose} aria-label="Закрыть"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-border bg-card-hover text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {editing ? "Редактировать запись" : "Добавить в библиотеку"}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Название и описание — то, по чему вы будете находить это снова.
          </p>
        </div>

        <div className="grid gap-4 overflow-y-auto p-5">
          <div>
            <span className={label}>Тип</span>
            <div className="flex flex-wrap gap-2">
              {LIBRARY_KINDS.map((k) => (
                <button
                  key={k} type="button" onClick={() => set("kind", k)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all ${
                    form.kind === k
                      ? "border-transparent bg-accent font-semibold text-accent-foreground"
                      : "border-border bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {KIND_META[k].emoji} {KIND_META[k].one}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label}>Название *</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="Например: Claude Code Reviewer" className={field} />
          </div>

          <div>
            <label className={label}>Что делает (описание)</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              rows={2} placeholder="Одной фразой: какую задачу решает" className={`${field} resize-y`} />
          </div>

          {isPrompt ? (
            <div>
              <label className={label}>Текст промпта</label>
              <textarea value={form.body} onChange={(e) => set("body", e.target.value)}
                rows={8} placeholder="Используйте {переменные} в фигурных скобках"
                className={`${field} resize-y font-mono text-[12.5px]`} />
            </div>
          ) : (
            <>
              <div>
                <label className={label}>Ссылка (GitHub / сайт)</label>
                <input value={form.source_url} onChange={(e) => set("source_url", e.target.value)}
                  placeholder="https://github.com/..." className={`${field} font-mono text-[12.5px]`} />
              </div>
              <div>
                <label className={label}>Платформа</label>
                <input value={form.platform} onChange={(e) => set("platform", e.target.value)}
                  placeholder="Claude Code / Cursor / ChatGPT…" className={field} />
              </div>
              <div>
                <label className={label}>Инструкция по установке (markdown)</label>
                <textarea value={form.install_md} onChange={(e) => set("install_md", e.target.value)}
                  rows={6} placeholder={"1. Склонируйте репозиторий\n2. `npm install`"}
                  className={`${field} resize-y font-mono text-[12.5px]`} />
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Категория</label>
              <input value={form.category} onChange={(e) => set("category", e.target.value)}
                list="library-categories" placeholder="Своя или из списка" className={field} />
              <datalist id="library-categories">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={label}>Роль</label>
              <select value={form.specialty} onChange={(e) => set("specialty", e.target.value)} className={field}>
                {SPECIALTIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Теги (через запятую)</label>
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)}
              placeholder="код, ревью, автоматизация" className={field} />
          </div>

          <div>
            <label className={label}>Личная заметка (видите только вы)</label>
            <textarea value={form.admin_note} onChange={(e) => set("admin_note", e.target.value)}
              rows={2} placeholder="Где нашёл, что доработать, свои мысли" className={`${field} resize-y`} />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background p-3">
            <input type="checkbox" checked={form.is_published}
              onChange={(e) => set("is_published", e.target.checked)}
              className="h-4 w-4 accent-[#A3E635]" />
            <span className="text-[13px] text-foreground">
              Опубликовано
              <span className="ml-1.5 text-[11.5px] text-muted">
                — если снять, запись останется черновиком и её увидите только вы
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-border p-5">
          <button
            type="button" onClick={save} disabled={saving || deleting}
            className="inline-flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Сохраняю…" : "Сохранить"}
          </button>
          {editing && (
            <button
              type="button" onClick={remove} disabled={saving || deleting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-semibold text-error transition-colors hover:bg-error/15 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
