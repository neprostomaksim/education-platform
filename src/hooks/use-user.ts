"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearPrivateCache } from "@/lib/security/clear-private-cache";
import type { Profile } from "@/types";
import type { User, Session } from "@supabase/supabase-js";

interface UserContextType { user: User | null; profile: Profile | null; loading: boolean }
const UserContext = createContext<UserContextType>({ user: null, profile: null, loading: true });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserContextType>({ user: null, profile: null, loading: true });
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let generation = 0;
    let previousId: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void clearPrivateCache();
    const load = async () => {
      const version = ++generation;
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!active || version !== generation) return;
        if (error || !user) {
          previousId = null;
          void clearPrivateCache();
          setState({ user: null, profile: null, loading: false });
          return;
        }
        if (previousId !== user.id) {
          void clearPrivateCache();
          setState({ user: null, profile: null, loading: true });
        }
        previousId = user.id;
        const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (active && version === generation) setState({ user, profile: profileError ? null : profile, loading: false });
      } catch {
        if (active && version === generation) setState({ user: null, profile: null, loading: false });
      }
    };
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      // Release the auth lock before making another Supabase request.
      clearTimeout(timer);
      if (event === "SIGNED_OUT") {
        ++generation;
        previousId = null;
        void clearPrivateCache();
        setState({ user: null, profile: null, loading: false });
      } else {
        if (session?.user.id && previousId && session.user.id !== previousId) {
          // Server-rendered paid content belongs to the old account too.
          ++generation;
          setState({ user: null, profile: null, loading: true });
          void clearPrivateCache();
          window.location.reload();
          return;
        }
        timer = setTimeout(() => { void load(); }, 0);
      }
    });
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      active = false; ++generation; clearTimeout(timer); subscription.unsubscribe();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);
  return React.createElement(UserContext.Provider, { value: state }, children);
}
export function useUser() { return useContext(UserContext); }
