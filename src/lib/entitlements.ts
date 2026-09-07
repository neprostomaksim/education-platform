import { createClient } from "@/lib/supabase/server";

export type Product = "prompts";

/**
 * Server-side access check for a paid product (currently only "prompts").
 *
 * Reads the current user's own `entitlements` row through the request session,
 * so RLS ("Users can view own entitlements") applies. An entitlement grants
 * access while it has no expiry (one-time purchase) or the expiry is in the
 * future. Returns the user id too, so callers can reuse it.
 */
export async function getProductAccess(
  product: Product = "prompts"
): Promise<{ userId: string | null; hasAccess: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, hasAccess: false };

  // Admins always see the library (content management). Everyone else needs an
  // active entitlement. Both reads run against the user's own session (RLS-safe).
  const [{ data: profile }, { data: entitlement }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("entitlements")
      .select("expires_at,source")
      .eq("user_id", user.id)
      .eq("product", product)
      .maybeSingle(),
  ]);

  const isAdmin = profile?.role === "admin";
  const entitled =
    !!entitlement &&
    (entitlement.expires_at === null ||
      new Date(entitlement.expires_at) > new Date());

  let paymentValid = true;
  if (entitled && entitlement?.source?.startsWith("purchase:")) {
    const { data, error } = await supabase.from("purchases").select("id").eq("claimed_by", user.id).eq("product", product).eq("status", "paid").limit(1);
    paymentValid = !error && !!data?.length;
  }
  return { userId: user.id, hasAccess: isAdmin || (entitled && paymentValid) };
}
