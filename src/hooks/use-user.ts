"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

// Timeout wrapper to prevent hanging requests
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    Promise.resolve(promise).then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    
    // Failsafe timeout: if 4 seconds pass and we are still loading, force it to false
    const failsafe = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Failsafe triggered: useUser loading took more than 4 seconds.");
        setLoading(false);
      }
    }, 4000);

    const getUser = async () => {
      console.log("useUser: Starting getUser...");
      try {
        let user = null;
        let userError = null;

        try {
          console.log("useUser: Calling supabase.auth.getSession()...");
          const result = await withTimeout(supabase.auth.getSession(), 2000);
          console.log("useUser: getSession returned", result);
          user = result.data.session?.user ?? null;
          userError = result.error;
        } catch (e) {
          console.warn("useUser: getSession timed out", e);
        }
        
        if (userError && !user) {
          console.warn("useUser: Auth error, clearing session:", userError.message);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }
        
        if (mounted) setUser(user);

        if (user) {
          console.log("useUser: Fetching profile...");
          try {
            const { data: profile } = await withTimeout(
              supabase.from("profiles").select("*").eq("id", user.id).single(),
              2000
            );
            console.log("useUser: Profile fetched.");
            if (mounted) setProfile(profile);
          } catch (profileError) {
            console.warn("useUser: Profile fetch failed or timed out:", profileError);
          }
        }
      } catch (error) {
        console.warn("useUser: Error loading user:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        console.log("useUser: getUser complete, setting loading=false");
        if (mounted) setLoading(false);
      }
    };

    getUser();

    console.log("useUser: Setting up onAuthStateChange...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("useUser: onAuthStateChange event:", event);
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          router.push("/login");
          return;
        }

        if (mounted) setUser(session?.user ?? null);
        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (mounted) setProfile(profile);
          } catch (error) {
            console.warn("useUser: Error loading profile on auth change:", error);
          }
        } else {
          if (mounted) setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
