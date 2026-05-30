"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Shield,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Redirect to pending if not approved
  useEffect(() => {
    if (!loading && user && profile && profile.role !== "admin" && !profile.is_approved) {
      router.push("/pending");
    }
  }, [user, profile, loading, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/20 animate-pulse" />
          <div className="w-32 h-4 skeleton rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border h-16 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-card-hover transition-colors text-foreground"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-accent" />
          </div>
          <span className="font-semibold text-foreground">AI Learning</span>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-accent" />
              </div>
              <span className="text-lg font-bold text-foreground">AI Learning</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === "/dashboard" || pathname?.startsWith("/courses")
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground hover:bg-sidebar-hover"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4" />
              Дашборд
            </Link>

            {profile?.role === "admin" && (
              <Link
                href="/admin/users"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  pathname?.startsWith("/admin")
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-sidebar-hover"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Shield className="w-4 h-4" />
                Админ-панель
              </Link>
            )}

            <Link
              href="/prompts"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname?.startsWith("/prompts")
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground hover:bg-sidebar-hover"
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Sparkles className="w-4 h-4" />
              Библиотека промптов
            </Link>

          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
                {getInitials(profile?.full_name || user?.email || "U")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || "Пользователь"}
                </p>
                <p className="text-xs text-muted truncate">
                  {user?.email} (Роль: {profile?.role || "none"})
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
