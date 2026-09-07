"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Course, CourseWithTopics, Topic, Lesson } from "@/types";

export function useCourses(userId?: string) {
  const [state, setState] = useState<{ userId?: string; courses: CourseWithTopics[]; loading: boolean }>({ courses: [], loading: true });
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!userId) { if (active) setState({ userId, courses: [], loading: false }); return; }
      const supabase = createClient();
      try {
        const results = await Promise.all([
          supabase.from("courses").select("*").eq("is_published", true).order("created_at"),
          supabase.from("topics").select("*").eq("is_published", true).order("sort_order"),
          // Course lists need metadata only; never download/cache every lesson body.
          supabase.from("lessons").select("id,topic_id,title,sort_order,duration_minutes,block_name,is_published,created_at").eq("is_published", true).order("sort_order"),
          supabase.from("progress").select("lesson_id").eq("user_id", userId).eq("completed", true),
        ]);
        if (results.some(r => r.error)) throw new Error("Course query failed");
        const completed = new Set((results[3].data || []).map((p: { lesson_id: string }) => p.lesson_id));
        const topics = (results[1].data as unknown as Topic[] || []).map(topic => {
          const lessons = (results[2].data as unknown as Lesson[] || []).filter(l => l.topic_id === topic.id);
          return { ...topic, lessons, totalLessons: lessons.length, completedLessons: lessons.filter(l => completed.has(l.id)).length };
        });
        const courses = (results[0].data as unknown as Course[] || []).map(course => {
          const ct = topics.filter(t => t.course_id === course.id);
          return { ...course, topics: ct, totalTopics: ct.length, completedTopics: ct.filter(t => t.totalLessons > 0 && t.completedLessons === t.totalLessons).length };
        });
        if (active) setState({ userId, courses, loading: false });
      } catch { if (active) setState({ userId, courses: [], loading: false }); }
    };
    void load();
    return () => { active = false; };
  }, [userId]);
  return state.userId === userId ? state : { courses: [], loading: !!userId };
}
