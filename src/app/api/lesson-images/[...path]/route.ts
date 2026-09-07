import { requireAssetAccess } from "@/lib/security/assets";
import { errorResponse, HttpError, privateHeaders } from "@/lib/security/http";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    if (path.length > 5 || path.some(p => !/^[a-zA-Z0-9._-]{1,180}$/.test(p) || p === "." || p === "..")) throw new HttpError(400, "Некорректный путь");
    const key = path.join("/");
    await requireAssetAccess(`/api/lesson-images/${key}`);
    const { data, error } = await createAdminClient().storage.from("lesson-images").download(key);
    if (error || !data) throw new HttpError(404, "Изображение не найдено");
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(data.type)) throw new HttpError(415, "Формат не поддерживается");
    return new Response(data, { headers: { ...privateHeaders, "Content-Type": data.type } });
  } catch (error) { return errorResponse(error); }
}
