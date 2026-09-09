import { loadLibrary } from "@/lib/library";
import { LibraryClient } from "./library-client";

// Access and drafts depend on the viewer, so this must never be cached.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const data = await loadLibrary();
  return <LibraryClient {...data} />;
}
