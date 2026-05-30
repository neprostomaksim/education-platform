"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Topic } from "@/types";
import { ArrowLeft, Save, Loader2, Eye, Code } from "lucide-react";
import Link from "next/link";

export default function NewLessonPage() {
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const editId = searchParams.get("edit");

  useEffect(() => {
    supabase.from("topics").select("*").order("sort_order").then(({ data }) => {
      setTopics(data || []);
      if (data && data.length > 0 && !topicId) setTopicId(data[0].id);
    });

    if (editId) {
      setIsEditing(true);
      supabase.from("lessons").select("*").eq("id", editId).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setTopicId(data.topic_id);
          setContent(data.content || "");
          setVideoUrl(data.video_url || "");
          setSortOrder(data.sort_order);
          setDurationMinutes(data.duration_minutes);
          setIsPublished(data.is_published);
        }
      });
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      title,
      topic_id: topicId,
      content,
      video_url: videoUrl || null,
      sort_order: sortOrder,
      duration_minutes: durationMinutes,
      is_published: isPublished,
    };

    if (isEditing && editId) {
      await supabase.from("lessons").update(data).eq("id", editId);
    } else {
      await supabase.from("lessons").insert(data);
    }

    router.push("/admin/lessons");
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <Link href="/admin/lessons" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />Назад к урокам
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-8">{isEditing ? 'Редактировать урок' : 'Новый урок'}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Название</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название урока" required className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Тема</label>
            <select value={topicId} onChange={e => setTopicId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground transition-colors">
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Видео URL (YouTube embed)</label>
          <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">Содержание (Markdown)</label>
            <button type="button" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer">
              {showPreview ? <><Code className="w-3.5 h-3.5" />Редактор</> : <><Eye className="w-3.5 h-3.5" />Превью</>}
            </button>
          </div>
          {showPreview ? (
            <div className="min-h-[300px] p-4 rounded-xl bg-input border border-border prose-dark">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*Нет содержания*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="# Заголовок\n\nТекст урока в формате Markdown..." rows={12} className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground placeholder:text-muted-foreground transition-colors resize-y font-mono" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Порядок</label>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Длительность (мин)</label>
            <input type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-sm text-foreground transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsPublished(!isPublished)} className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${isPublished ? 'bg-accent' : 'bg-border'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublished ? 'translate-x-5' : ''}`} />
          </button>
          <label className="text-sm text-foreground">Опубликовать</label>
        </div>

        <button type="submit" disabled={loading || !title || !topicId} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 cursor-pointer glow-accent">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEditing ? 'Сохранить' : 'Создать'}
        </button>
      </form>
    </div>
  );
}
