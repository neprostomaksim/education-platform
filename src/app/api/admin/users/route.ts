import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiAccount } from "@/lib/security/auth";
import { requireSameOrigin, readJson, errorResponse, HttpError, privateHeaders } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount("admin");
    await rateLimit(user.id, "create-user", 10);
    const { email, password, fullName, role, isApproved } = await readJson(request);
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== "string" || password.length < 6 || password.length > 128 ||
        typeof fullName !== "string" || !fullName.trim() || fullName.length > 200 ||
        !["admin", "student"].includes(String(role)) || typeof isApproved !== "boolean") throw new HttpError(400, "Проверьте поля. Пароль должен содержать 6–128 символов");
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true, user_metadata: { full_name: fullName.trim() } });
    if (error || !data.user) throw new HttpError(400, "Не удалось создать аккаунт. Проверьте email и требования к паролю");
    const { data: profile, error: profileError } = await admin.from("profiles").update({ full_name: fullName.trim(), email: email.trim(), role, is_approved: isApproved }).eq("id", data.user.id).select().single();
    if (profileError) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
      if (cleanupError) console.error("Incomplete user creation requires reconciliation", data.user.id);
      throw new HttpError(503, "Не удалось завершить создание аккаунта");
    }
    return Response.json({ success: true, user: profile }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireApiAccount("admin");
    await rateLimit(user.id, "delete-user", 10);
    const { userId } = await readJson(request);
    if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId) || userId === user.id) throw new HttpError(400, "Недопустимый пользователь");
    const admin = createAdminClient();
    const { data: target, error } = await admin.from("profiles").select("role").eq("id", userId).single();
    if (error || !target) throw new HttpError(404, "Пользователь не найден");
    if (target.role === "admin") throw new HttpError(403, "Нельзя удалить администратора");
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new HttpError(503, "Не удалось удалить пользователя");
    return Response.json({ success: true }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
