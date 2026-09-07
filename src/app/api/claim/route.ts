import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAccount } from "@/lib/security/auth";
import { requireSameOrigin, readJson, errorResponse, HttpError, privateHeaders } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount();
    await rateLimit(user.id, "claim", 10);
    const { token } = await readJson(request);
    if (typeof token !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) throw new HttpError(400, "Некорректная ссылка");
    const { data, error } = await createAdminClient().rpc("claim_prompts_purchase", { p_token: token, p_user_id: user.id, p_telegram_link: true });
    if (error) throw new HttpError(503, "Не удалось активировать покупку");
    return Response.json({ status: data, ok: data === "claimed" || data === "already_claimed" }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
