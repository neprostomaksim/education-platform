import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * TEST-ONLY: simulate a successful payment without money or Prodamus.
 *
 * Creates a "paid" purchase and redirects to the activation page, so the whole
 * post-payment funnel (claim → entitlement → unlocked prompts) can be walked
 * end to end. Guarded by ENABLE_TEST_PURCHASE=true — MUST be off in production.
 */
export async function GET(request: Request) {
  if (process.env.ENABLE_TEST_PURCHASE !== "true") {
    return new NextResponse("Тестовые покупки выключены (ENABLE_TEST_PURCHASE).", {
      status: 404,
    });
  }

  const url = new URL(request.url);
  const tgParam = url.searchParams.get("tg");
  const telegramId = tgParam ? Number(tgParam) : Math.floor(Date.now() / 1000);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("purchases")
    .insert({
      telegram_id: Number.isNaN(telegramId) ? Math.floor(Date.now() / 1000) : telegramId,
      telegram_username: "test",
      provider: "test",
      provider_order_id: `TEST-${Date.now()}`,
      product: "prompts",
      amount: 0,
      currency: "RUB",
      status: "paid",
    })
    .select("claim_token")
    .single();

  if (error || !data) {
    console.error("simulate-purchase failed:", error);
    return new NextResponse("Не удалось создать тестовую покупку.", { status: 500 });
  }

  return NextResponse.redirect(new URL(`/claim?token=${data.claim_token}`, request.url));
}
