"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Mail, Lock, Eye, EyeOff, Loader2, User } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) setError(error.message);
  };

  if (success) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 shadow-xl text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Проверьте почту</h1>
        <p className="text-sm text-muted mb-6">
          Мы отправили ссылку для подтверждения на <span className="text-foreground font-medium">{email}</span>
        </p>
        <Link
          href="/login"
          className="text-accent hover:text-accent-hover transition-colors text-sm font-medium"
        >
          Вернуться к входу
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-8 shadow-xl">
      <h1 className="text-xl font-semibold text-foreground mb-1">Создать аккаунт</h1>
      <p className="text-sm text-muted mb-6">Начните изучать ИИ уже сегодня</p>

      {/* Google Auth */}
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card-hover hover:bg-input transition-colors text-sm font-medium text-foreground cursor-pointer"
      >
        <GoogleIcon className="w-5 h-5" />
        Регистрация через Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted">или</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Form */}
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Имя</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ваше имя"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Пароль</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              required
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer glow-accent"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {loading ? "Создание..." : "Создать аккаунт"}
        </button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-muted mt-6">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
          Войти
        </Link>
      </p>
    </div>
  );
}
