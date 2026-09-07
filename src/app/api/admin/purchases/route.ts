import { requireApiAccount } from "@/lib/security/auth";
import { errorResponse, HttpError, privateHeaders, readJson, requireSameOrigin } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverPurchase } from "@/lib/payments/delivery";
export async function GET() {
  try {
    await requireApiAccount("admin");
    const { data, error } = await createAdminClient().from("purchases")
      .select("id,provider_order_id,status,amount,amount_minor,currency,claimed_at,delivery_sent_at,claim_expires_at,created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new HttpError(503, "Не удалось загрузить оплаты");
    return Response.json({ purchases: data }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount("admin");
    await rateLimit(user.id, "manage-purchases", 20);
    const { id, action } = await readJson(request);
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, "Некорректная покупка");
    if (action === "record_refund") {
      // Records a refund already performed with the provider; never transfers money.
      const { data, error } = await createAdminClient().from("purchases").update({ status: "refunded" }).eq("id", id).select("id").single();
      if (error || !data) throw new HttpError(409, "Не удалось отметить возврат");
    } else if (action === "retry_delivery") {
      if (!await deliverPurchase(id)) throw new HttpError(503, "Доставка не завершена. Повторите позже");
    } else throw new HttpError(400, "Неизвестное действие");
    return Response.json({ success: true }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
