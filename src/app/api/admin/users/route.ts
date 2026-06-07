import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Authenticate the admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
    }

    // 2. Check if the user is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    // 3. Parse and validate the request body
    const body = await request.json();
    const { email, password, fullName, role, isApproved } = body;

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Не заполнены обязательные поля: email, password, fullName, role" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "student") {
      return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });
    }

    // 4. Create user in Supabase Auth using the Admin client
    const adminClient = createAdminClient();
    const { data: authData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    });

    if (createUserError || !authData.user) {
      return NextResponse.json(
        { error: createUserError?.message || "Не удалось создать пользователя" },
        { status: 500 }
      );
    }

    const newUserId = authData.user.id;

    // 5. Update the public.profiles table (created by the DB trigger)
    const { data: updatedProfile, error: updateError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        role: role,
        is_approved: isApproved ?? true,
        email: email,
      })
      .eq("id", newUserId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile after creation:", updateError);
      // Try to return a friendly message
      return NextResponse.json(
        { error: `Пользователь создан в Auth, но не удалось обновить профиль: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile
    });

  } catch (err: any) {
    console.error("Admin user creation endpoint error:", err);
    return NextResponse.json({ error: err.message || "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
