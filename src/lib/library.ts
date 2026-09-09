import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductAccess } from "@/lib/entitlements";
import type { LibraryData, LibraryItem, LibraryTeaser } from "@/lib/library-shared";

const FULL_COLUMNS =
  "id, kind, slug, title, description, body, source_url, install_md, platform, category, specialty, tags, is_published, sort_order, created_at";
// Teasers are fetched with the service role, so the column list is the only
// thing standing between a non-buyer and the paid content. Keep it minimal.
const TEASER_COLUMNS = "id, kind, title, description, category, tags";

/**
 * Loads the library for the current viewer.
 *
 * Entitled viewers (and admins) get full records through their own session, so
 * RLS decides what they may see — admins additionally see drafts. Everyone else
 * gets a column-limited teaser list for the paywall, with no bodies or install
 * instructions. Admin notes are read from a separate, admin-only table.
 */
export async function loadLibrary(): Promise<LibraryData> {
  const supabase = await createClient();
  const [{ data: { user } }, { hasAccess }] = await Promise.all([
    supabase.auth.getUser(),
    getProductAccess("prompts"),
  ]);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

  if (!user) {
    return { userId: null, items: [], teasers: [], favorites: [], notes: {}, hasAccess: false, isAdmin: false, botUsername };
  }

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = profile?.role === "admin";

  if (!hasAccess) {
    const { data } = await createAdminClient()
      .from("library_items")
      .select(TEASER_COLUMNS)
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .limit(12);
    return {
      userId: user.id, items: [], teasers: (data ?? []) as LibraryTeaser[], favorites: [],
      notes: {}, hasAccess: false, isAdmin, botUsername,
    };
  }

  const [{ data: items }, { data: favorites }] = await Promise.all([
    supabase.from("library_items").select(FULL_COLUMNS)
      .order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
    supabase.from("library_favorites").select("item_id").eq("user_id", user.id),
  ]);

  let notes: Record<string, string> = {};
  if (isAdmin) {
    const { data } = await supabase.from("library_admin_notes").select("item_id, note");
    notes = Object.fromEntries((data ?? []).map((n) => [n.item_id, n.note]));
  }

  return {
    userId: user.id,
    items: (items ?? []) as LibraryItem[],
    teasers: [],
    favorites: (favorites ?? []).map((f) => f.item_id as string),
    notes,
    hasAccess: true,
    isAdmin,
    botUsername,
  };
}
