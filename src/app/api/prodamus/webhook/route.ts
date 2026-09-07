import { createAdminClient } from "@/lib/supabase/admin";
import { appOrigin, errorResponse, HttpError, privateHeaders } from "@/lib/security/http";
import { parsePayment, validatePurchase, verifyPayment } from "@/lib/payments/prodamus";
import { deliverPurchase } from "@/lib/payments/delivery";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const secret = process.env.PRODAMUS_SECRET_KEY;
    if (!secret) throw new HttpError(503, "Платежи не настроены");
    const data = await parsePayment(request);
    if (!verifyPayment(data, request.headers.get("sign") || "", secret)) throw new HttpError(403, "Недействительная подпись");
    const payment = validatePurchase(data);
    if (!payment) return new Response("ignored", { headers: privateHeaders });
    appOrigin();
    if (!process.env.TELEGRAM_BOT_TOKEN) throw new HttpError(503, "Доставка не настроена");
    const { data: purchase, error } = await createAdminClient().rpc("record_prodamus_purchase", {
      p_merchant_id: payment.merchantId, p_transaction_id: payment.transactionId,
      p_telegram_id: payment.telegramId, p_amount_minor: payment.amount,
    });
    if (error || !purchase) throw new HttpError(409, "Не удалось подтвердить заказ");
    if (purchase.status !== "refunded" && !await deliverPurchase(purchase.id)) throw new HttpError(503, "Доставка ожидает повторной попытки");
    return new Response("success", { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
