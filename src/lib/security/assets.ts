import "server-only";
import { requireApiAccount } from "./auth";
import { HttpError } from "./http";
import { lessonReferencesAsset } from "@/lib/lesson-assets";
export async function requireAssetAccess(target: string) {
  const { supabase, profile } = await requireApiAccount("approved");
  if (profile.role === "admin") return;
  // Queries use the student's session: RLS enforces course and lesson grants.
  for (let offset = 0; offset < 10000; offset += 100) {
    const { data, error } = await supabase.from("lessons").select("id,content").order("id").range(offset, offset + 99);
    if (error) throw new HttpError(503, "Не удалось проверить доступ");
    if (data?.some(row => lessonReferencesAsset(row.content || "", target))) return;
    if (!data || data.length < 100) break;
  }
  throw new HttpError(403, "Материал недоступен");
}
