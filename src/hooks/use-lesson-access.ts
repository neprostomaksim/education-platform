"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function useLessonAccess(userId?: string) {
  const [state, setState] = useState<{ userId?: string; ids: Set<string>; loading: boolean }>({ ids: new Set(), loading: true });
  const generation = useRef(0);
  const refetch = useCallback(async () => {
    const version = ++generation.current;
    const { data, error } = userId
      ? await createClient().from("user_lesson_access").select("lesson_id").eq("user_id", userId)
      : { data: [], error: null };
    if (version === generation.current) setState({ userId, ids: new Set(error ? [] : (data || []).map((row: { lesson_id: string }) => String(row.lesson_id))), loading: false });
  }, [userId]);
  useEffect(() => { void refetch(); return () => { ++generation.current; }; }, [refetch]);
  return { accessibleLessonIds: state.userId === userId ? state.ids : new Set<string>(), loading: state.userId !== userId || state.loading, refetch };
}
