import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          lock: async (...args: any[]) => {
            const acquire = args.find(arg => typeof arg === 'function');
            return await acquire();
          },
        },
      }
    );
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          lock: async (...args: any[]) => {
            const acquire = args.find(arg => typeof arg === 'function');
            return await acquire();
          },
        },
      }
    );
  }
  return client;
}
