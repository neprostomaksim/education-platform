import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Our funnel's payments carry an order id shaped `prompts_<telegram_id>_<unique>`.
// The same Prodamus form may serve other funnels (e.g. Salebot); anything without
// this prefix is ignored, so the two funnels never interfere.
const PROMPTS_ORDER_PREFIX = "prompts_";

/**
 * Prodamus payment notification (server → server).
 *
 * Records the purchase (idempotent on the provider order id), then sends the
 * one-time activation link to the buyer in Telegram. The buyer's telegram_id
 * must be carried in the payment link and echoed back here.
 *
 * SIGNATURE: verified against PRODAMUS_SECRET_KEY using Prodamus's published
 * Hmac scheme (see prodamusSign). While the key is unset the endpoint runs in
 * TEST MODE and skips verification. Confirm with ONE real Prodamus test payment
 * before launch — on mismatch the computed/received signatures are logged so the
 * exact serialization can be reconciled.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const raw = await request.text();
    const data = parseProdamusBody(raw, contentType);

    const secret = process.env.PRODAMUS_SECRET_KEY;
    if (secret) {
      const received =
        request.headers.get("sign") ??
        request.headers.get("signature") ??
        stringField(data.signature) ??
        stringField(data.sign) ??
        "";
      if (!verifyProdamusSignature(data, received, secret)) {
        return new NextResponse("bad signature", { status: 403 });
      }
    } else {
      console.warn(
        "Prodamus webhook: PRODAMUS_SECRET_KEY не задан — ТЕСТОВЫЙ РЕЖИМ, подпись не проверяется"
      );
    }

    const orderId =
      stringField(data.order_num) ??
      stringField(data.order_id) ??
      stringField(data.invoice_id);

    // Isolation: only handle our funnel's payments; ignore everything else on
    // this Prodamus form (acknowledge with 200 so Prodamus stops retrying).
    if (!orderId || !orderId.startsWith(PROMPTS_ORDER_PREFIX)) {
      return new NextResponse("ignored", { status: 200 });
    }

    // telegram_id is embedded in the order id: prompts_<telegram_id>_<unique>.
    // Fall back to explicit fields just in case.
    const telegramFromOrder = orderId.split("_")[1];
    const telegramRaw =
      telegramFromOrder ||
      stringField(data.telegram_id) ||
      stringField(data.customer_extra) ||
      stringField(data._param_telegram_id);
    const telegramId = telegramRaw ? Number(telegramRaw) : NaN;
    const amount = Number.parseInt(stringField(data.sum) ?? stringField(data.amount) ?? "", 10);
    const paymentStatus = stringField(data.payment_status);
    const paid = !paymentStatus || paymentStatus === "success";

    if (Number.isNaN(telegramId)) {
      console.warn("Prodamus webhook: no telegram_id in order", { orderId });
      return new NextResponse("missing telegram", { status: 400 });
    }
    if (!paid) {
      return new NextResponse("ignored", { status: 200 });
    }

    const admin = createAdminClient();
    const { data: purchase, error } = await admin
      .from("purchases")
      .upsert(
        {
          telegram_id: telegramId,
          telegram_username:
            stringField(data.telegram_username) ?? stringField(data.customer_extra2) ?? null,
          provider: "prodamus",
          provider_order_id: orderId,
          product: "prompts",
          amount: Number.isNaN(amount) ? null : amount,
          currency: stringField(data.currency) ?? "RUB",
          status: "paid",
        },
        { onConflict: "provider_order_id" }
      )
      .select("id, claim_token")
      .single();

    if (error || !purchase) {
      console.error("Prodamus webhook: purchase upsert failed", error);
      return new NextResponse("db error", { status: 500 });
    }

    const claimUrl = `${appOrigin(request)}/claim?token=${purchase.claim_token}`;
    await sendClaimLink(telegramId, claimUrl);

    return new NextResponse("success", { status: 200 });
  } catch (err) {
    console.error("Prodamus webhook error:", err);
    return new NextResponse("error", { status: 500 });
  }
}

/** Nested value that mirrors what PHP's $_POST would build from the body. */
type ProdamusValue = string | ProdamusValue[] | { [key: string]: ProdamusValue };
type ProdamusData = { [key: string]: ProdamusValue };

function stringField(v: ProdamusValue | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/**
 * Parse the notification body into the same nested shape PHP would, so the
 * signature can be recomputed. Handles `products[0][name]=…` style keys.
 */
function parseProdamusBody(raw: string, contentType: string): ProdamusData {
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw) as ProdamusData;
    } catch {
      return {};
    }
  }
  const root: ProdamusData = {};
  const params = new URLSearchParams(raw);
  for (const [key, value] of params) {
    const path = keyPath(key);
    setPath(root, path, value);
  }
  return root;
}

function keyPath(key: string): string[] {
  // "products[0][name]" -> ["products", "0", "name"]
  const path: string[] = [];
  const open = key.indexOf("[");
  if (open === -1) return [key];
  path.push(key.slice(0, open));
  const re = /\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(key)) !== null) path.push(m[1]);
  return path;
}

function setPath(root: ProdamusData, path: string[], value: string): void {
  let cur: { [key: string]: ProdamusValue } = root;
  for (let i = 0; i < path.length; i++) {
    const k = path[i];
    if (i === path.length - 1) {
      cur[k] = value;
    } else {
      if (typeof cur[k] !== "object" || cur[k] === null || Array.isArray(cur[k])) {
        cur[k] = {};
      }
      cur = cur[k] as { [key: string]: ProdamusValue };
    }
  }
}

/**
 * Prodamus Hmac scheme: cast every value to a string, sort keys recursively,
 * json_encode (unescaped unicode & slashes — which JSON.stringify already does),
 * then HMAC-SHA256 with the secret key.
 */
function prodamusSign(data: ProdamusData, key: string): string {
  const copy: ProdamusData = { ...data };
  delete copy.signature;
  delete copy.sign;
  const json = phpJsonEncode(copy);
  return crypto.createHmac("sha256", key).update(json, "utf8").digest("hex");
}

function verifyProdamusSignature(
  data: ProdamusData,
  received: string,
  secret: string
): boolean {
  if (!received) return false;
  const expected = prodamusSign(data, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    console.warn("Prodamus signature mismatch", { expected, received });
  }
  return ok;
}

/** json_encode with PHP semantics: sequential-int-keyed maps become arrays. */
function phpJsonEncode(value: ProdamusValue): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(phpJsonEncode).join(",") + "]";
  }
  const keys = Object.keys(value);
  if (isSequentialList(keys)) {
    return (
      "[" +
      keys
        .map(Number)
        .sort((x, y) => x - y)
        .map((i) => phpJsonEncode(value[String(i)]))
        .join(",") +
      "]"
    );
  }
  const sorted = keys.sort();
  return (
    "{" +
    sorted.map((k) => JSON.stringify(k) + ":" + phpJsonEncode(value[k])).join(",") +
    "}"
  );
}

function isSequentialList(keys: string[]): boolean {
  if (keys.length === 0) return false;
  const nums = new Set(keys);
  for (let i = 0; i < keys.length; i++) {
    if (!nums.has(String(i))) return false;
  }
  return true;
}

function appOrigin(request: Request): string {
  // Prefer the host this request actually hit, so claim links resolve to the
  // same environment (preview or production) that received the webhook. Falls
  // back to an explicit override, then the request URL.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

async function sendClaimLink(chatId: number, claimUrl: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("sendClaimLink: TELEGRAM_BOT_TOKEN не задан — сообщение не отправлено");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text:
          "✅ Оплата получена!\n\nОсталось привязать доступ к вашему аккаунту — нажмите кнопку ниже. Ссылка одноразовая и действует 30 дней.",
        reply_markup: {
          inline_keyboard: [[{ text: "Открыть доступ →", url: claimUrl }]],
        },
      }),
    });
  } catch (err) {
    console.error("sendClaimLink failed:", err);
  }
}
