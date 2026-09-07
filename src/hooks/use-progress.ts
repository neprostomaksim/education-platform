"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function useProgress(userId: string) {
  const [loading, setLoading] = useState(false);
  const update = async (lessonId: string, completed: boolean) => {
    if (!userId || !navigator.onLine) return { error: new Error("Для сохранения прогресса подключитесь к сети и войдите в аккаунт") };
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = completed
        ? await supabase.from("progress").upsert({ user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" })
        : await supabase.from("progress").delete().eq("user_id", userId).eq("lesson_id", lessonId);
      return { error };
    } catch { return { error: new Error("Не удалось сохранить прогресс") }; }
    finally { setLoading(false); }
  };
  return { markComplete: (id: string) => update(id, true), markIncomplete: (id: string) => update(id, false), loading };
}
