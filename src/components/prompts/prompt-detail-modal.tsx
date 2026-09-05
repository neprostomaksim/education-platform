"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Copy, Check, Star, SlidersHorizontal } from "lucide-react";
import { getSpecialtyInfo } from "@/lib/specialties";
import { extractVariables, buildPrompt, allVariablesFilled } from "@/lib/prompt-utils";
import type { PromptData } from "@/components/lesson/prompt-card";

interface PromptDetailModalProps {
  data: PromptData;
  categoryLabel: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onCopied: (message: string) => void;
}

/**
 * Detail view for one prompt. Shows the full template, lets the user optionally
 * fill each {переменная} inline (filled values are substituted live and copied),
 * and always keeps a plain "copy the template as-is" path.
 */
export function PromptDetailModal({
  data,
  categoryLabel,
  isFavorite,
  onToggleFavorite,
  onClose,
  onCopied,
}: PromptDetailModalProps) {
  const specialty = getSpecialtyInfo(data.specialty);
  const variables = useMemo(() => extractVariables(data.prompt), [data.prompt]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copiedFilled, setCopiedFilled] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const copy = async (text: string, which: "filled" | "raw") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    if (which === "filled") {
      setCopiedFilled(true);
      setTimeout(() => setCopiedFilled(false), 1700);
      onCopied(
        allVariablesFilled(data.prompt, values)
          ? "Готовый промпт скопирован 📋"
          : "Скопировано (с переменными) 📋"
      );
    } else {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 1700);
      onCopied("Шаблон скопирован — с {переменными} 📋");
    }
  };

  // Full template as React nodes, highlighting each variable (green once filled).
  const renderedBody = useMemo(() => {
    const parts = data.prompt.split(/(\{[^}]+\})/g);
    return parts.map((part, i) => {
      if (/^\{[^}]+\}$/.test(part)) {
        const filled = values[part]?.trim();
        return (
          <span
            key={i}
            className={
              filled
                ? "rounded bg-success/15 px-1 py-0.5 font-semibold text-success"
                : "prompt-variable"
            }
          >
            {filled || part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [data.prompt, values]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-7 animate-fade-in"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl">
        {/* Header */}
        <div className="relative border-b border-border p-5 sm:p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-border bg-card-hover text-muted transition-colors hover:border-border-hover hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="pr-12 text-lg font-bold tracking-tight text-foreground">
            {data.title}
          </h2>
          <p className="mt-1.5 pr-12 text-sm text-muted">{data.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${specialty.colorClass}`}
            >
              {specialty.emoji} {specialty.label}
            </span>
            <span className="rounded-full border border-border bg-card-hover px-2.5 py-1 text-[10.5px] font-medium text-muted">
              {categoryLabel}
            </span>
            <button
              type="button"
              onClick={() => onToggleFavorite(data.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                isFavorite
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
                  : "border-border bg-card-hover text-muted hover:text-amber-400"
              }`}
            >
              <Star className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />
              {isFavorite ? "В избранном" : "В избранное"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 sm:p-6">
          {variables.length > 0 && (
            <div className="mb-4 rounded-2xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <SlidersHorizontal className="h-4 w-4 text-accent" />
                Заполнить переменные
                <span className="text-[11px] font-medium text-muted-foreground">
                  — необязательно
                </span>
              </div>
              <p className="mb-3 mt-1 text-[11.5px] text-muted">
                Впишите значения — промпт соберётся автоматически. Или скопируйте
                шаблон как есть и заполните в чате.
              </p>
              <div className="grid gap-2.5">
                {variables.map((token) => (
                  <div key={token}>
                    <label className="mb-1 block font-mono text-[11px] text-accent">
                      {token}
                    </label>
                    <input
                      type="text"
                      value={values[token] ?? ""}
                      placeholder={token.slice(1, -1)}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [token]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            Промпт
          </div>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-border bg-background p-4 font-mono text-[12.5px] leading-relaxed text-[#D4D4D8]">
            {renderedBody}
          </pre>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => copy(buildPrompt(data.prompt, values), "filled")}
              className={`inline-flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                copiedFilled
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-transparent bg-accent text-accent-foreground shadow-[0_0_20px_var(--color-accent-glow)] hover:bg-accent-hover"
              }`}
            >
              {copiedFilled ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedFilled
                ? "Скопировано"
                : variables.length > 0
                ? "Скопировать готовый"
                : "Копировать"}
            </button>
            {variables.length > 0 && (
              <button
                type="button"
                onClick={() => copy(data.prompt, "raw")}
                className={`inline-flex min-w-[150px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  copiedRaw
                    ? "border-success/40 bg-success/15 text-success"
                    : "border-border bg-card-hover text-foreground hover:border-border-hover"
                }`}
              >
                {copiedRaw ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedRaw ? "Скопировано" : "Скопировать шаблон"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
