import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Binds a paid purchase (identified by its one-time claim token) to the current
 * user, granting the prompts entitlement. Idempotent: re-claiming the same
 * purchase by the same user succeeds without side effects.
 *
 * The actual work is done atomically in the DB function claim_prompts_purchase
 * (SECURITY DEFINER), called here with the service-role client.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return NextResponse.json({ status: "bad_request" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("claim_prompts_purchase", {
      p_token: token,
      p_user_id: user.id,
      p_telegram_link: true,
    });

    if (error) {
      console.error("claim_prompts_purchase failed:", error);
      return NextResponse.json({ status: "error" }, { status: 500 });
    }

    const status = String(data); // claimed | already_claimed | expired | claimed_by_other | not_found | not_paid
    const ok = status === "claimed" || status === "already_claimed";
    return NextResponse.json({ status, ok });
  } catch (err) {
    console.error("claim route error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
