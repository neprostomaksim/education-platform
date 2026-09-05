import Link from "next/link";
import { FlaskConical, ArrowRight } from "lucide-react";

// TEST-ONLY helper page. Visible only while ENABLE_TEST_PURCHASE=true.
export const dynamic = "force-dynamic";

export default function TestPurchasePage() {
  const enabled = process.env.ENABLE_TEST_PURCHASE === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-warning/30 bg-warning/10 text-warning">
          <FlaskConical className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Тест оплаты без оплаты
        </h1>

        {enabled ? (
          <>
            <p className="mx-auto mt-2.5 max-w-sm text-sm text-muted">
              Кнопка создаёт «оплаченную» покупку и ведёт на страницу активации.
              Дальше пройдёте весь путь: активация → доступ → библиотека промптов.
              Войдите под тем аккаунтом, которому хотите открыть доступ.
            </p>
            <a
              href="/api/dev/simulate-purchase"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Сымитировать оплату
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mx-auto mt-4 max-w-sm text-[12px] text-muted-foreground">
              Режим включён через <code className="font-mono text-accent">ENABLE_TEST_PURCHASE</code>.
              Перед запуском на реальную аудиторию выключите его.
            </p>
          </>
        ) : (
          <>
            <p className="mx-auto mt-2.5 max-w-sm text-sm text-muted">
              Тестовый режим выключен. Добавьте в <code className="font-mono text-accent">.env.local</code>{" "}
              строку <code className="font-mono text-accent">ENABLE_TEST_PURCHASE=true</code> и
              перезапустите сервер.
            </p>
            <Link
              href="/prompts"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card-hover px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-border-hover"
            >
              К промптам
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
