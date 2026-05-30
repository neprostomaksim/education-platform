"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useProgress(userId: string) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const markComplete = async (lessonId: string) => {
    setLoading(true);
    const { error } = await supabase.from("progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
    setLoading(false);
    return { error };
  };

  const markIncomplete = async (lessonId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("progress")
      .delete()
      .eq("user_id", userId)
      .eq("lesson_id", lessonId);
    setLoading(false);
    return { error };
  };

  return { markComplete, markIncomplete, loading };
}
