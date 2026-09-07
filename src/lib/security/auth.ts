import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HttpError } from "./http";

export const currentAccount = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("id, role, is_approved").eq("id", user.id).single();
  return { supabase, user, profile };
});

export async function requirePageAccount(level: "user" | "approved" | "admin" = "user") {
  const account = await currentAccount();
  if (!account.user) redirect("/login");
  if (!account.profile) redirect("/pending");
  if (level === "admin" && account.profile.role !== "admin") redirect("/dashboard");
  if (level === "approved" && account.profile.role !== "admin" && !account.profile.is_approved) redirect("/pending");
  return account;
}

export async function requireApiAccount(level: "user" | "approved" | "admin" = "user") {
  const account = await currentAccount();
  if (!account.user) throw new HttpError(401, "Неавторизован");
  if (!account.profile || (level === "admin" && account.profile.role !== "admin") ||
      (level === "approved" && account.profile.role !== "admin" && !account.profile.is_approved)) {
    throw new HttpError(403, "Доступ запрещён");
  }
  return { ...account, user: account.user, profile: account.profile };
}
