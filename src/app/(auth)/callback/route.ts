import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/security/redirect";
import { appOrigin, errorResponse, privateHeaders } from "@/lib/security/http";

export async function GET(request: Request) {
  try {
    const origin = appOrigin();
    const params = new URL(request.url).searchParams;
    const code = params.get("code");
    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext(params.get("next")), origin), { headers: privateHeaders });
    }
    return NextResponse.redirect(new URL("/login?error=auth", origin), { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
