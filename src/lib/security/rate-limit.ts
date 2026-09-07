import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError } from "./http";
export async function rateLimit(userId: string, action: string, limit: number, seconds = 60) {
  const { data, error } = await createAdminClient().rpc("consume_request_limit", { p_key: `${action}:${userId}`, p_limit: limit, p_seconds: seconds });
  if (error) throw new HttpError(503, "Защита запросов временно недоступна");
  if (data !== true) throw new HttpError(429, "Слишком много запросов. Попробуйте позже");
}
