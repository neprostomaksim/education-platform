import { PROMPTS_META, PROMPT_BODIES, PROMPT_CATEGORIES } from "@/lib/prompts-data";
import { getProductAccess } from "@/lib/entitlements";
import { PromptsClient } from "./prompts-client";

// Access depends on the user's entitlement, so this must never be cached.
export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const { hasAccess } = await getProductAccess("prompts");

  // Prompt bodies (the paid content) are handed to the client ONLY when the
  // user is entitled. Non-buyers get metadata only → the paywall preview.
  const bodies = hasAccess ? PROMPT_BODIES : null;
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

  return (
    <PromptsClient
      meta={PROMPTS_META}
      bodies={bodies}
      hasAccess={hasAccess}
      categories={PROMPT_CATEGORIES}
      botUsername={botUsername}
    />
  );
}
