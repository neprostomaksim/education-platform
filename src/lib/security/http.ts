import "server-only";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function appOrigin(): string {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production" ? "https://education-platform-chi-peach.vercel.app" : "");
  if (!raw) {
    if (process.env.NODE_ENV === "development") return "http://localhost:3000";
    throw new HttpError(503, "Не настроен адрес приложения");
  }
  const url = new URL(raw);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new HttpError(503, "Некорректный адрес приложения");
  }
  return url.origin;
}

export function requireSameOrigin(request: Request): void {
  // Browser mutations must have an Origin, including when cookie auth is used.
  if (request.headers.get("origin") !== appOrigin() || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "Недопустимый источник запроса");
  }
}

export async function readBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new HttpError(413, "Запрос слишком большой");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Запрос слишком большой");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export async function readJson(request: Request, maxBytes = 8192): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "Ожидается JSON");
  try {
    const value = JSON.parse(new TextDecoder().decode(await readBody(request, maxBytes)));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Некорректный JSON");
  }
}

export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export function errorResponse(error: unknown): Response {
  const known = error instanceof HttpError;
  if (!known) console.error("Request failed", error instanceof Error ? error.name : "unknown");
  return Response.json({ error: known ? error.message : "Внутренняя ошибка сервера" }, { status: known ? error.status : 500, headers: privateHeaders });
}
