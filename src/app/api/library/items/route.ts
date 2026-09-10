import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAccount } from "@/lib/security/auth";
import { requireSameOrigin, readJson, errorResponse, HttpError, privateHeaders } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { LIBRARY_KINDS, LIBRARY_ACCESS } from "@/lib/library-shared";

const MAX_BODY_BYTES = 64_000;
const LIMITS = { title: 200, description: 1000, body: 40_000, install_md: 20_000, platform: 80, category: 120, specialty: 40, slug: 120, note: 5_000, quick_install: 400 };

function str(value: unknown, max: number, field: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new HttpError(400, `Поле «${field}» должно быть текстом`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpError(400, `Поле «${field}» слишком длинное`);
  return trimmed || null;
}

/** Only http(s) links are stored — the UI renders these as clickable anchors. */
function url(value: unknown): string | null {
  const raw = str(value, 2000, "ссылка");
  if (!raw) return null;
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new HttpError(400, "Некорректная ссылка"); }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new HttpError(400, "Ссылка должна начинаться с http(s)://");
  return parsed.toString();
}

function tags(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new HttpError(400, "Теги должны быть списком");
  const list = value.slice(0, 20).map((t) => String(t).trim()).filter(Boolean).map((t) => t.slice(0, 40));
  return Array.from(new Set(list));
}

function accessValue(value: unknown): string {
  if (typeof value !== "string" || !(LIBRARY_ACCESS as readonly string[]).includes(value)) {
    throw new HttpError(400, "Неизвестный тип доступа");
  }
  return value;
}

function fields(payload: Record<string, unknown>, requireKind: boolean) {
  const kind = payload.kind;
  if (requireKind || kind !== undefined) {
    if (typeof kind !== "string" || !(LIBRARY_KINDS as readonly string[]).includes(kind)) {
      throw new HttpError(400, "Неизвестный тип записи");
    }
  }
  const title = str(payload.title, LIMITS.title, "название");
  if (requireKind && !title) throw new HttpError(400, "Укажите название");
  return {
    ...(kind !== undefined ? { kind } : {}),
    ...(payload.title !== undefined ? { title } : {}),
    ...(payload.description !== undefined ? { description: str(payload.description, LIMITS.description, "описание") ?? "" } : {}),
    ...(payload.body !== undefined ? { body: str(payload.body, LIMITS.body, "текст") } : {}),
    ...(payload.source_url !== undefined ? { source_url: url(payload.source_url) } : {}),
    ...(payload.install_md !== undefined ? { install_md: str(payload.install_md, LIMITS.install_md, "инструкция") } : {}),
    ...(payload.platform !== undefined ? { platform: str(payload.platform, LIMITS.platform, "платформа") } : {}),
    ...(payload.category !== undefined ? { category: str(payload.category, LIMITS.category, "категория") } : {}),
    ...(payload.specialty !== undefined ? { specialty: str(payload.specialty, LIMITS.specialty, "роль") ?? "all" } : {}),
    ...(payload.slug !== undefined ? { slug: str(payload.slug, LIMITS.slug, "slug") } : {}),
    ...(payload.tags !== undefined ? { tags: tags(payload.tags) } : {}),
    ...(payload.access !== undefined ? { access: accessValue(payload.access) } : {}),
    ...(payload.quick_install !== undefined ? { quick_install: str(payload.quick_install, LIMITS.quick_install, "быстрая установка") } : {}),
    ...(payload.is_published !== undefined ? { is_published: payload.is_published !== false } : {}),
    ...(payload.sort_order !== undefined ? { sort_order: Number(payload.sort_order) || 0 } : {}),
  };
}

function itemId(payload: Record<string, unknown>): string {
  const id = payload.id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, "Некорректный идентификатор записи");
  }
  return id;
}

/** Admin notes live in their own table so they can never reach a non-admin. */
async function saveNote(admin: ReturnType<typeof createAdminClient>, id: string, raw: unknown) {
  if (raw === undefined) return;
  const note = str(raw, LIMITS.note, "заметка");
  if (note) await admin.from("library_admin_notes").upsert({ item_id: id, note, updated_at: new Date().toISOString() });
  else await admin.from("library_admin_notes").delete().eq("item_id", id);
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount("admin");
    await rateLimit(user.id, "library-write", 60);
    const payload = await readJson(request, MAX_BODY_BYTES);
    const admin = createAdminClient();
    const { data, error } = await admin.from("library_items").insert(fields(payload, true)).select("id").single();
    if (error || !data) throw new HttpError(503, "Не удалось сохранить запись");
    await saveNote(admin, data.id, payload.admin_note);
    return Response.json({ id: data.id }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount("admin");
    await rateLimit(user.id, "library-write", 60);
    const payload = await readJson(request, MAX_BODY_BYTES);
    const id = itemId(payload);
    const admin = createAdminClient();
    const patch = fields(payload, false);
    if (Object.keys(patch).length) {
      const { error } = await admin.from("library_items").update(patch).eq("id", id);
      if (error) throw new HttpError(503, "Не удалось обновить запись");
    }
    await saveNote(admin, id, payload.admin_note);
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount("admin");
    await rateLimit(user.id, "library-write", 60);
    const id = itemId(await readJson(request));
    const { error } = await createAdminClient().from("library_items").delete().eq("id", id);
    if (error) throw new HttpError(503, "Не удалось удалить запись");
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
