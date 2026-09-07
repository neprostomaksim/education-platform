import { requirePageAccount } from "@/lib/security/auth";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePageAccount("approved");
  return children;
}
