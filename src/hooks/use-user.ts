"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const lastTokenRef = useRef<string | null>(null);
  const currentUserRef = useRef<User | null>(null);
  const currentProfileRef = useRef<Profile | null>(null);

  const setUser = (u: User | null) => {
    currentUserRef.current = u;
    setUserState(u);
  };

  const setProfile = (p: Profile | null) => {
    currentProfileRef.current = p;
    setProfileState(p);
  };

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const loadUserAndProfile = async () => {
      console.log("UserProvider: Starting initial load...");
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn("UserProvider: Session error:", sessionError);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const currentUser = session?.user ?? null;
        const currentToken = session?.access_token ?? null;
        
        lastTokenRef.current = currentToken;
        if (mounted) setUser(currentUser);

        if (currentUser) {
          console.log("UserProvider: Fetching profile for user:", currentUser.id);
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();

          if (profileError) {
            console.warn("UserProvider: Profile query error:", profileError);
          } else if (mounted) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error("UserProvider: Critical error loading user:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("UserProvider: Auth state changed:", event);
        
        if (event === 'SIGNED_OUT') {
          lastTokenRef.current = null;
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          router.push("/login");
          return;
        }

        const currentUser = session?.user ?? null;
        const currentToken = session?.access_token ?? null;

        // Skip redundant profile fetches if the session token hasn't changed and profile exists
        if (
          currentToken === lastTokenRef.current &&
          currentUserRef.current !== null &&
          currentProfileRef.current !== null
        ) {
          console.log("UserProvider: Token has not changed. Skipping profile fetch.");
          return;
        }

        lastTokenRef.current = currentToken;
        if (mounted) setUser(currentUser);

        if (currentUser) {
          console.log("UserProvider: Fetching profile for user on auth change (deferred):", currentUser.id);
          // Defer the database query to the next tick of the event loop to release Supabase auth lock first
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const { data: profileData, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", currentUser.id)
                .single();
              if (error) {
                console.warn("UserProvider: Deferred profile fetch error:", error);
              } else if (mounted) {
                setProfile(profileData);
              }
            } catch (err) {
              console.error("UserProvider: Deferred profile fetch critical error:", err);
            }
          }, 0);
        } else {
          if (mounted) setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return React.createElement(UserContext.Provider, { value: { user, profile, loading } }, children);
}

export function useUser() {
  return useContext(UserContext);
}
