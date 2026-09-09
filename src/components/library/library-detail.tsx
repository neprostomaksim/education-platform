"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, Copy, Check, Star, ExternalLink, SlidersHorizontal, Pencil, EyeOff, NotebookPen } from "lucide-react";
import { extractVariables, buildPrompt, allVariablesFilled } from "@/lib/prompt-utils";
import type { LibraryItem } from "@/lib/library";
import { KIND_META } from "./kind-meta";

interface LibraryDetailProps {
  item: LibraryItem;
  note?: string;
  isFavorite: boolean;
  isAdmin: boolean;
  onToggleFavorite: (id: string) => void;
  onEdit: (id: string) => void;
  onClose: () => void;
  onCopied: (message: string) => void;
}

export function LibraryDetail({
  item, note, isFavorite, isAdmin, onToggleFavorite, onEdit, onClose, onCopied,
}: LibraryDetailProps) {
  const kind = KIND_META[item.kind];
  const variables = useMemo(() => (item.body ? extractVariables(item.body) : []), [item.body]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<"filled" | "raw" | null>(null);

  const copy = async (text: string, which: "filled" | "raw", message: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(which);
    onCopied(message);
    setTimeout(() => setCopied(null), 1700);
  };

  // Prompt body with {variables} highlighted; filled ones turn green.
  const rendered = useMemo(() => {
    if (!item.body) return null;
    return item.body.split(/(\{[^}]+\})/g).map((part, i) => {
      if (/^\{[^}]+\}$/.test(part)) {
        const filled = values[part]?.trim();
        return (
          <span
            key={i}
            className={`rounded px-1 py-0.5 font-semibold ${
              filled ? "bg-success/15 text-success" : "bg-accent/12 text-accent"
            }`}
          >
            {filled || part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [item.body, values]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-7"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-2xl">
        {/* Header */}
        <div className="relative border-b border-border p-5 pr-14 sm:p-6 sm:pr-16">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-border bg-card-hover text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${kind.badge}`}>
              {kind.emoji} {kind.one}
            </span>
            {item.platform && (
              <span className="rounded-full border border-border bg-card-hover px-2.5 py-1 text-[10.5px] font-semibold text-muted">
                {item.platform}
              </span>
            )}
            {item.category && (
              <span className="rounded-full border border-border bg-card-hover px-2.5 py-1 text-[10.5px] font-semibold text-muted">
                {item.category}
              </span>
            )}
            {isAdmin && !item.is_published && (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10.5px] font-semibold text-warning">
                <EyeOff className="h-3 w-3" /> Черновик
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{item.title}</h2>
          {/* What it does — the thing you actually scan for. */}
          {item.description && <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                isFavorite
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                  : "border-border bg-card-hover text-muted hover:text-foreground"
              }`}
            >
              <Star className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
              {isFavorite ? "В избранном" : "В избранное"}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onEdit(item.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card-hover px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" /> Редактировать
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              <ExternalLink className="h-4 w-4" />
              Открыть источник
            </a>
          )}

          {variables.length > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-background p-4">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-accent" />
                Заполнить переменные
                <span className="text-[11px] font-medium text-muted-foreground">— необязательно</span>
              </div>
              <p className="mb-3 text-[11.5px] text-muted">
                Впишите значения — промпт соберётся сам. Или скопируйте шаблон как есть.
              </p>
              <div className="grid gap-2.5">
                {variables.map((variable) => (
                  <div key={variable}>
                    <label className="mb-1 block font-mono text-[11px] text-accent">{variable}</label>
                    <input
                      value={values[variable] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [variable]: e.target.value }))}
                      placeholder={variable.slice(1, -1)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.body && (
            <>
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                {item.kind === "prompt" ? "Промпт" : "Текст"}
              </div>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-4 font-mono text-[12.5px] leading-relaxed text-[#D4D4D8]">
                {rendered}
              </pre>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      buildPrompt(item.body!, values),
                      "filled",
                      allVariablesFilled(item.body!, values) ? "Готовый текст скопирован" : "Скопировано"
                    )
                  }
                  className={`inline-flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                    copied === "filled"
                      ? "border border-success/40 bg-success/15 text-success"
                      : "bg-accent text-accent-foreground hover:bg-accent-hover"
                  }`}
                >
                  {copied === "filled" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === "filled" ? "Скопировано" : variables.length ? "Скопировать готовый" : "Копировать"}
                </button>
                {variables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => copy(item.body!, "raw", "Шаблон скопирован — с {переменными}")}
                    className={`inline-flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors ${
                      copied === "raw"
                        ? "border-success/40 bg-success/15 text-success"
                        : "border-border bg-card-hover text-foreground hover:border-border-hover"
                    }`}
                  >
                    {copied === "raw" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === "raw" ? "Скопировано" : "Скопировать шаблон"}
                  </button>
                )}
              </div>
            </>
          )}

          {item.install_md && (
            <div className={item.body ? "mt-6" : ""}>
              <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                Установка
              </div>
              <div className="prose-dark rounded-xl border border-border bg-background p-4 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.install_md}</ReactMarkdown>
              </div>
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-md border border-border bg-card-hover px-2 py-1 text-[10.5px] font-medium text-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Private to the admin — never sent to anyone else. */}
          {isAdmin && note && (
            <div className="mt-6 rounded-xl border border-warning/25 bg-warning/5 p-4">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-warning">
                <NotebookPen className="h-3.5 w-3.5" /> Личная заметка (видите только вы)
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
