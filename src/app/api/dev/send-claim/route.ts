import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * TEST-ONLY: imitate a paid order and DELIVER the activation link to Telegram,
 * exactly like the Prodamus webhook would after a real payment — but without
 * Prodamus and without any charge. Lets you walk the full in-bot buyer path.
 *
 * Usage: /api/dev/send-claim?tg=<telegram_id>
 * Guarded by ENABLE_TEST_PURCHASE=true — MUST be off in production.
 */
export async function GET(request: Request) {
  if (process.env.ENABLE_TEST_PURCHASE !== "true") {
    return text("Тестовый режим выключен (ENABLE_TEST_PURCHASE).", 404);
  }

  const tg = new URL(request.url).searchParams.get("tg");
  const telegramId = tg ? Number(tg) : NaN;
  if (!telegramId || Number.isNaN(telegramId)) {
    return text("Укажите ?tg=<telegram_id> (ваш Telegram-ID).", 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("purchases")
    .insert({
      telegram_id: telegramId,
      telegram_username: "test",
      provider: "test",
      provider_order_id: `TESTBOT-${Date.now()}`,
      product: "prompts",
      amount: 0,
      currency: "RUB",
      status: "paid",
    })
    .select("claim_token")
    .single();

  if (error || !data) {
    console.error("send-claim insert failed:", error);
    return text("Не удалось создать тестовую покупку.", 500);
  }

  const claimUrl = `${appOrigin(request)}/claim?token=${data.claim_token}`;
  const sent = await sendClaimLink(telegramId, claimUrl);

  return text(
    sent
      ? `Готово! Claim-ссылка отправлена в Telegram (id ${telegramId}). Откройте бота и нажмите «Открыть доступ».`
      : `Покупка создана, но отправить в бот не удалось (проверьте TELEGRAM_BOT_TOKEN и что вы писали этому боту).\nСсылка активации: ${claimUrl}`,
    200
  );
}

function text(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function appOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return new URL(request.url).origin;
}

async function sendClaimLink(chatId: number, claimUrl: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("send-claim: TELEGRAM_BOT_TOKEN не задан");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          "✅ Оплата получена!\n\nОсталось привязать доступ к вашему аккаунту — нажмите кнопку ниже. Ссылка одноразовая.",
        reply_markup: {
          inline_keyboard: [[{ text: "Открыть доступ →", url: claimUrl }]],
        },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (!json.ok) console.warn("send-claim: sendMessage not ok", json);
    return !!json.ok;
  } catch (err) {
    console.error("send-claim sendMessage failed:", err);
    return false;
  }
}
