import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: async (...args) => {
          // Bypass navigator.locks entirely to fix hanging requests on page reload
          const acquire = args.find(arg => typeof arg === 'function');
          if (acquire) {
            return await acquire();
          }
        },
      },
    }
  );
}
