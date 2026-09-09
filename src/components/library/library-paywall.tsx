"use client";

import { Lock, Send, Library } from "lucide-react";
import type { LibraryTeaser } from "@/lib/library-shared";
import { KIND_META } from "./kind-meta";

interface LibraryPaywallProps {
  teasers: LibraryTeaser[];
  botUsername: string;
}

/**
 * Shown to signed-in users without access. Honest preview: real titles and
 * descriptions are visible but blurred, while prompt bodies and install
 * instructions never leave the server.
 */
export function LibraryPaywall({ teasers, botUsername }: LibraryPaywallProps) {
  const botUrl = botUsername ? `https://t.me/${botUsername.replace(/^@/, "")}` : undefined;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in p-4 lg:p-8">
      <header className="mb-6 flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10">
          <Library className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">Библиотека</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted lg:text-base">
            Готовые промпты, скилы и инструменты для работы с ИИ — собраны и описаны в одном месте.
          </p>
        </div>
      </header>

      <div className="relative overflow-hidden rounded-3xl border border-border">
        <div
          aria-hidden="true"
          className="pointer-events-none select-none opacity-50 blur-[6px]"
          style={{
            maskImage: "linear-gradient(180deg, #000 18%, transparent 96%)",
            WebkitMaskImage: "linear-gradient(180deg, #000 18%, transparent 96%)",
          }}
        >
          <div className="grid grid-cols-1 gap-3.5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {teasers.map((t) => {
              const kind = KIND_META[t.kind];
              return (
                <div key={t.id} className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4">
                  <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${kind.badge}`}>
                    {kind.emoji} {kind.one}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                  <p className="text-xs text-muted">{t.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(60%_60%_at_50%_45%,rgba(10,10,11,0.72),rgba(10,10,11,0.95))] px-6 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card text-accent shadow-[0_0_30px_var(--color-accent-glow)]">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Доступ пока закрыт</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Библиотека открывается после оплаты в Telegram-боте. Разовая покупка —{" "}
            <b className="font-semibold text-foreground">доступ навсегда</b>, включая всё, что добавится дальше.
          </p>
          <div className="mt-6">
            {botUrl ? (
              <a
                href={botUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-[0_0_22px_var(--color-accent-glow)] transition-colors hover:bg-accent-hover"
              >
                <Send className="h-4 w-4" /> Получить доступ в Telegram
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-muted">
                <Send className="h-4 w-4" /> Скоро — оплата в Telegram-боте
              </span>
            )}
          </div>
          <p className="mt-4 text-[12.5px] text-muted-foreground">
            Уже оплатили? Ссылка на активацию — в вашем боте.
          </p>
        </div>
      </div>
    </div>
  );
}
