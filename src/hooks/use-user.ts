"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          router.push("/login");
          return;
        }

        const currentUser = session?.user ?? null;
        if (mounted) setUser(currentUser);

        if (currentUser) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();
          if (mounted) setProfile(profileData);
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
