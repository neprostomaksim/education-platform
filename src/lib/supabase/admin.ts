import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fallback: If serviceRoleKey is not in process.env (e.g. dev server not restarted),
  // try to read it directly from .env.local file.
  if (!serviceRoleKey) {
    try {
      const envPath = path.join(process.cwd(), ".env.local");
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        const match = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
        if (match && match[1]) {
          serviceRoleKey = match[1].trim().replace(/"/g, "").replace(/\r/g, "");
        }
      }
    } catch (e) {
      console.error("Failed to read SUPABASE_SERVICE_ROLE_KEY from .env.local fallback:", e);
    }
  }

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase URL or Service Role Key in environment variables!");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
