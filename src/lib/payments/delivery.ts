import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appOrigin } from "@/lib/security/http";
/** Failed deliveries remain pending; retries acquire a database lease. */
export async function deliverPurchase(purchaseId: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("lease_purchase_delivery", { p_id: purchaseId });
  if (error || !data) return false;
  if (data.status === "done") return true;
  if (data.status !== "leased") return false;
  let sent = false;
  try {
    const url = new URL("/claim", appOrigin());
    url.searchParams.set("token", data.claim_token);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ chat_id: data.telegram_id, text: "Оплата получена. Подтвердите аккаунт для активации доступа. Ссылка действует 30 дней.", reply_markup: { inline_keyboard: [[{ text: "Открыть доступ", url: url.href }]] } }),
    });
    const body = await response.json();
    sent = response.ok && body.ok === true;
  } catch { sent = false; }
  const { error: finishError } = await admin.rpc("finish_purchase_delivery", { p_id: purchaseId, p_lease: data.lease, p_sent: sent });
  return sent && !finishError;
}
