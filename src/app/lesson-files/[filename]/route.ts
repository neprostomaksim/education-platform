import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAssetAccess } from "@/lib/security/assets";
import { errorResponse, HttpError, privateHeaders } from "@/lib/security/http";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    if (!filename || filename.length > 255 || /[/\\\u0000-\u001f]/.test(filename) || filename === "." || filename === "..") throw new HttpError(400, "Некорректное имя файла");
    await requireAssetAccess(`/lesson-files/${filename}`);
    let data;
    try { data = await readFile(path.join(process.cwd(), "private", "lesson-files", filename)); }
    catch { throw new HttpError(404, "Файл не найден"); }
    return new Response(data, { headers: { ...privateHeaders, "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` } });
  } catch (error) { return errorResponse(error); }
}
