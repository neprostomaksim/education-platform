"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useProgress } from "@/hooks/use-progress";
import { useToast } from "@/components/shared/toast-provider";
import { CodeBlockWrapper } from "@/components/lesson/code-block";
import { SpecialtyFilter } from "@/components/lesson/specialty-filter";
import { filterContentBySpecialty, type Specialty } from "@/lib/specialties";
import { formatDuration } from "@/lib/utils";
import type { Lesson, Topic, Progress } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Loader2,
  Play,
} from "lucide-react";

interface LessonWithTopic extends Lesson {
  topic: Topic;
}

interface TopicWithLessons extends Topic {
  lessons: (Lesson & { completed: boolean })[];
}

// Topic ID for Prompt Engineering module
const PROMPT_ENGINEERING_TOPIC_ID = "550e8400-e29b-41d4-a716-446655440001";

export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const [lesson, setLesson] = useState<LessonWithTopic | null>(null);
  const [topics, setTopics] = useState<TopicWithLessons[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty>("all");
  const { user, loading: userLoading } = useUser();
  const { markComplete, markIncomplete, loading: progressLoading } = useProgress(user?.id || "");
  const { addToast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Check if current lesson belongs to prompt engineering topic
  const isPromptEngineeringLesson = lesson?.topic_id === PROMPT_ENGINEERING_TOPIC_ID;

  // Check if content has specialty markers
  const hasSpecialtyContent = useMemo(() => {
    if (!lesson?.content) return false;
    return lesson.content.includes("<!-- SPEC:");
  }, [lesson?.content]);

  // Filter content by selected specialty and strip duplicate H1 title
  const filteredContent = useMemo(() => {
    if (!lesson?.content) return "";
    const rawContent = hasSpecialtyContent
      ? filterContentBySpecialty(lesson.content, selectedSpecialty)
      : lesson.content;

    // Remove the first H1 header (# Title) at the start of markdown to prevent duplication with the page header
    const trimmed = rawContent.trimStart();
    return trimmed.replace(/^#\s+[^\r\n]+(\r?\n)*/, "");
  }, [lesson?.content, selectedSpecialty, hasSpecialtyContent]);

  useEffect(() => {
    // Don't fetch until useUser has finished loading
    if (userLoading) return;

    // If no user after loading is done, redirect to login
    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch current lesson with topic
        const { data: lessonData } = await supabase
          .from("lessons")
          .select("*, topic:topics(*)")
          .eq("id", lessonId)
          .single();

        if (!lessonData) {
          router.push("/dashboard");
          return;
        }

        setLesson({
          ...lessonData,
          topic: Array.isArray(lessonData.topic) ? lessonData.topic[0] : lessonData.topic,
        } as LessonWithTopic);

        // Fetch all topics with lessons for sidebar
        const { data: topicsData } = await supabase
          .from("topics")
          .select("*")
          .eq("is_published", true)
          .order("sort_order");

        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("*")
          .eq("is_published", true)
          .order("sort_order");

        // Fetch progress
        let progressData: Progress[] = [];
        if (user?.id) {
          const { data } = await supabase
            .from("progress")
            .select("*")
            .eq("user_id", user.id);
          progressData = data || [];
        }

        const completedIds = new Set(progressData.filter(p => p.completed).map(p => p.lesson_id));
        setIsCompleted(completedIds.has(lessonId));
        const topicsWithLessons: TopicWithLessons[] = (topicsData || []).map((topic: any) => ({
          ...topic,
          lessons: (lessonsData || [])
            .filter((l: any) => l.topic_id === topic.id)
            .map((l: any) => ({ ...l, completed: completedIds.has(l.id) })),
        }));

        setTopics(topicsWithLessons);

        // Expand the current topic
        const currentTopic = topicsWithLessons.find(t => 
          t.lessons.some(l => l.id === lessonId)
        );
        if (currentTopic) {
          setExpandedTopics(new Set([currentTopic.id]));
        }
      } catch (error) {
        console.error("Error fetching lesson data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lessonId, user?.id, userLoading]);

  const handleToggleComplete = async () => {
    if (isCompleted) {
      const { error } = await markIncomplete(lessonId);
      if (!error) {
        setIsCompleted(false);
        addToast("Отметка снята", "info");
      } else {
        addToast("Ошибка при обновлении прогресса", "error");
      }
    } else {
      const { error } = await markComplete(lessonId);
      if (!error) {
        setIsCompleted(true);
        addToast("Урок отмечен как пройденный! 🎉", "success");
      } else {
        addToast("Ошибка при обновлении прогресса", "error");
      }
    }
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  // Find prev/next lessons
  const allLessons = topics.flatMap(t => t.lessons);
  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="hidden lg:block w-80 border-r border-border p-4 space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 skeleton rounded-lg" />)}
        </div>
        <div className="flex-1 p-8">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="h-8 w-64 skeleton rounded" />
            <div className="h-4 w-48 skeleton rounded" />
            <div className="h-64 skeleton rounded-xl mt-6" />
            <div className="space-y-2 mt-6">
              {[1,2,3,4].map(i => <div key={i} className="h-4 skeleton rounded w-full" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg glow-accent"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Lesson Sidebar */}
      <aside className={`fixed lg:relative top-0 right-0 lg:right-auto z-50 lg:z-auto h-full w-80 bg-sidebar border-l lg:border-l-0 lg:border-r border-border overflow-y-auto transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Назад к дашборду
          </Link>

          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Оглавление</h3>

          <div className="space-y-1">
            {topics.map(topic => (
              <div key={topic.id}>
                <button
                  onClick={() => toggleTopic(topic.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-sidebar-hover transition-colors cursor-pointer"
                >
                  {expandedTopics.has(topic.id) ? (
                    <ChevronDown className="w-4 h-4 text-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                  )}
                  <span className="truncate">{topic.title}</span>
                  <span className="ml-auto text-xs text-muted">
                    {topic.lessons.filter(l => l.completed).length}/{topic.lessons.length}
                  </span>
                </button>

                 {expandedTopics.has(topic.id) && (
                  <div className="ml-4 pl-2 border-l border-border space-y-3 mb-2 mt-1">
                    {Object.entries(
                      topic.lessons.reduce((acc, l) => {
                        const block = l.block_name || "";
                        if (!acc[block]) acc[block] = [];
                        acc[block].push(l);
                        return acc;
                      }, {} as Record<string, typeof topic.lessons>)
                    ).map(([blockName, blockLessons]) => (
                      <div key={blockName} className="space-y-1">
                        {blockName && (
                          <div className="px-2 py-0.5 text-[9px] font-bold text-accent/80 bg-accent/5 rounded uppercase tracking-wider select-none">
                            {blockName}
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {blockLessons.map(l => (
                            <Link
                              key={l.id}
                              href={`/lessons/${l.id}`}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                l.id === lessonId
                                  ? 'bg-accent/10 text-accent font-medium'
                                  : 'text-muted hover:text-foreground hover:bg-sidebar-hover'
                              }`}
                            >
                              {l.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                              ) : l.id === lessonId ? (
                                <Play className="w-4 h-4 text-accent shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 shrink-0" />
                              )}
                              <span className="truncate">{l.title}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto animate-fade-in">
        <div className="max-w-3xl mx-auto p-4 lg:p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted mb-6">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Дашборд</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="hover:text-foreground transition-colors">{lesson.topic.title}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{lesson.title}</span>
          </div>

          {/* Lesson Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">{lesson.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted">
              {lesson.duration_minutes > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatDuration(lesson.duration_minutes)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {lesson.topic.title}
              </span>
            </div>
          </div>

          {/* Specialty Filter — only for prompt engineering lessons with tagged content */}
          {hasSpecialtyContent && (
            <div className="mb-6 p-4 rounded-xl bg-card border border-border">
              <SpecialtyFilter
                onChange={setSelectedSpecialty}
                className="!p-0"
              />
              <p className="text-xs text-muted mt-2">
                💡 Примеры промптов адаптируются под выбранную специальность
              </p>
            </div>
          )}

          {/* Video Player */}
          {lesson.video_url && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-border bg-card">
              <div className="aspect-video">
                <iframe
                  src={lesson.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            </div>
          )}

          {/* Markdown Content */}
          {filteredContent && (
            <div className="prose-dark mb-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: CodeBlockWrapper,
                }}
              >
                {filteredContent}
              </ReactMarkdown>
            </div>
          )}

          {/* Mark Complete */}
          <div className="border-t border-border pt-6 mb-8">
            <button
              onClick={handleToggleComplete}
              disabled={progressLoading}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                isCompleted
                  ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20'
                  : 'bg-accent text-accent-foreground hover:bg-accent-hover glow-accent'
              }`}
            >
              {progressLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              {isCompleted ? "Урок пройден" : "Отметить как пройденное"}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pb-8">
            {prevLesson ? (
              <Link
                href={`/lessons/${prevLesson.id}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-muted hover:text-foreground hover:bg-card-hover border border-border transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{prevLesson.title}</span>
                <span className="sm:hidden">Назад</span>
              </Link>
            ) : <div />}

            {nextLesson ? (
              <Link
                href={`/lessons/${nextLesson.id}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
              >
                <span className="hidden sm:inline">{nextLesson.title}</span>
                <span className="sm:hidden">Далее</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-accent text-accent-foreground hover:bg-accent-hover transition-colors glow-accent"
              >
                Завершить курс
                <CheckCircle2 className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
