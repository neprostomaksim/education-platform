"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { Lock, Check, LogIn, AlertTriangle, Loader2, Sparkles } from "lucide-react";

type Phase = "loading" | "no_token" | "need_login" | "ready" | "working" | "done";

export default function ClaimPage() {
  const { user, loading } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");


  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    /* eslint-disable react-hooks/set-state-in-effect */
    setToken(t);
    if (!t) setPhase("no_token");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!token || loading) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!userId) {
      setPhase("need_login");
      return;
    }
    setPhase(current => current === "done" || current === "working" ? current : "ready");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [token, userId, loading]);

  const activate = () => {
    if (phase !== "ready") return;
    setPhase("working");
    fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.status || "error");
        window.history.replaceState(null, "", "/claim");
        setPhase("done");
      })
      .catch(() => {
        setStatus("error");
        setPhase("done");
      });
  };

  const loginHref = `/login?next=${encodeURIComponent(`/claim?token=${token ?? ""}`)}`;
  const registerHref = `/register?next=${encodeURIComponent(`/claim?token=${token ?? ""}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        {(phase === "loading" || phase === "working") && (
          <State
            icon={<Loader2 className="h-7 w-7 animate-spin text-accent" />}
            title="Активируем доступ…"
            sub="Секунду — привязываем покупку к вашему аккаунту."
          />
        )}

        {phase === "no_token" && (
          <State
            tone="warn"
            icon={<AlertTriangle className="h-7 w-7" />}
            title="Ссылка неполная"
            sub="Откройте ссылку активации из сообщения бота целиком."
          />
        )}

        {phase === "need_login" && (
          <>
            <State
              icon={<Lock className="h-7 w-7 text-accent" />}
              title="Остался один шаг"
              sub="Войдите или создайте аккаунт, затем подтвердите активацию покупки."
            />
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href={registerHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                <LogIn className="h-4 w-4" />
                Создать аккаунт
              </Link>
              <Link
                href={loginHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card-hover px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-border-hover"
              >
                Войти
              </Link>
            </div>
          </>
        )}

        {phase === "ready" && <>
          <State icon={<Lock className="h-7 w-7" />} title="Подтвердите аккаунт" sub={`Открыть доступ для ${user?.email || "текущего аккаунта"}? Покупка будет привязана к нему.`} />
          <button onClick={activate} className="mt-6 rounded-xl bg-accent px-5 py-3 text-accent-foreground font-semibold">Активировать доступ</button>
        </>}
        {phase === "done" && <Result status={status} />}
      </div>
    </div>
  );
}

function Result({ status }: { status: string | null }) {
  if (status === "claimed" || status === "already_claimed") {
    return (
      <>
        <State
          tone="ok"
          icon={<Check className="h-7 w-7" />}
          title={status === "already_claimed" ? "Доступ уже открыт" : "Доступ открыт 🎉"}
          sub="Библиотека промптов теперь ваша — навсегда. Она всегда в меню слева."
        />
        <Link
          href="/prompts"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          <Sparkles className="h-4 w-4" />
          Перейти к промптам
        </Link>
      </>
    );
  }

  const messages: Record<string, { title: string; sub: string }> = {
    telegram_conflict: { title: "Не совпадает привязка Telegram", sub: "Войдите в аккаунт, связанный с покупкой, или обратитесь в поддержку." },
    expired: {
      title: "Ссылка истекла",
      sub: "Ссылка активации действует 30 дней. Обратитесь в поддержку, чтобы получить новую ссылку по вашей покупке.",
    },
    claimed_by_other: {
      title: "Ссылка привязана к другому аккаунту",
      sub: "Эта покупка уже активирована на другом аккаунте. Войдите под ним или напишите в поддержку.",
    },
    not_found: {
      title: "Ссылка недействительна",
      sub: "Токен не найден. Проверьте, что открыли ссылку из бота целиком.",
    },
    not_paid: {
      title: "Оплата не найдена",
      sub: "По этой ссылке нет подтверждённой оплаты. Если вы только что оплатили — подождите минуту и обновите страницу.",
    },
    error: {
      title: "Что-то пошло не так",
      sub: "Не удалось активировать доступ. Обновите страницу или напишите в поддержку.",
    },
  };
  const m = messages[status ?? "error"] ?? messages.error;

  return (
    <State
      tone="warn"
      icon={<AlertTriangle className="h-7 w-7" />}
      title={m.title}
      sub={m.sub}
    />
  );
}

function State({
  icon,
  title,
  sub,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "border-success/30 bg-success/10 text-success shadow-[0_0_34px_rgba(74,222,128,0.18)]"
      : tone === "warn"
      ? "border-warning/30 bg-warning/10 text-warning"
      : "border-border bg-card text-accent shadow-[0_0_30px_var(--color-accent-glow)]";
  return (
    <>
      <div
        className={`mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border ${toneClass}`}
      >
        {icon}
      </div>
      <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mx-auto mt-2.5 max-w-sm text-sm text-muted">{sub}</p>
    </>
  );
}
