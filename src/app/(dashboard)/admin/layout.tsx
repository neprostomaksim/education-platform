import { requirePageAccount } from "@/lib/security/auth";
import AdminNavigation from "./admin-navigation";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePageAccount("admin");
  return <AdminNavigation>{children}</AdminNavigation>;
}
