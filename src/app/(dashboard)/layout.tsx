import { requirePageAccount } from "@/lib/security/auth";
import type { Metadata } from "next";
import DashboardShell from "./dashboard-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Дашборд",
  description:
    "Ваш прогресс обучения искусственному интеллекту — темы, уроки и статистика",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccount("user");
  return <DashboardShell>{children}</DashboardShell>;
}
