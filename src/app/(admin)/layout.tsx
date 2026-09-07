import { requirePageAccount } from "@/lib/security/auth";
import type { Metadata } from "next";
import AdminShell from "./admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель",
  description: "Управление темами, уроками и пользователями AI Learning платформы",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccount("admin");
  return <AdminShell>{children}</AdminShell>;
}
