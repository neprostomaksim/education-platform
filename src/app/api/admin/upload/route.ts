import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAccount } from "@/lib/security/auth";
import { requireSameOrigin, readBody, errorResponse, HttpError, privateHeaders } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount("admin");
    await rateLimit(user.id, "upload", 20);
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data")) throw new HttpError(415, "Ожидается файл");
    const bytes = await readBody(request, 10 * 1024 * 1024 + 16384);
    const form = await new Response(bytes as BodyInit, { headers: { "content-type": contentType } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) throw new HttpError(400, "Допускается изображение PNG, JPEG, WEBP или GIF до 10 МБ");
    let image: Buffer;
    try {
      const raw = Buffer.from(await file.arrayBuffer());
      const raster = raw.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
        (raw[0] === 255 && raw[1] === 216 && raw[2] === 255) ||
        ["GIF87a", "GIF89a"].includes(raw.toString("ascii", 0, 6)) ||
        (raw.toString("ascii", 0, 4) === "RIFF" && raw.toString("ascii", 8, 12) === "WEBP");
      if (!raster) throw new Error();
      const decoder = sharp(raw, { limitInputPixels: 25_000_000 });
      const metadata = await decoder.metadata();
      if (!metadata.format || !["png", "jpeg", "webp", "gif"].includes(metadata.format)) throw new Error();
      // Re-encode instead of trusting filename or client MIME; strips active payloads/metadata.
      image = await decoder.rotate().webp({ quality: 88 }).toBuffer();
    } catch { throw new HttpError(400, "Не удалось прочитать изображение"); }
    const key = `lessons/${crypto.randomUUID()}.webp`;
    const { error } = await createAdminClient().storage.from("lesson-images").upload(key, image, { contentType: "image/webp", upsert: false });
    if (error) throw new HttpError(503, "Не удалось загрузить изображение");
    return Response.json({ success: true, url: `/api/lesson-images/${key}` }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
