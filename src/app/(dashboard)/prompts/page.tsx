"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/shared/toast-provider";
import { SpecialtyFilter } from "@/components/lesson/specialty-filter";
import { PromptCard } from "@/components/lesson/prompt-card";
import { PROMPTS_DATA, PROMPT_CATEGORIES } from "@/lib/prompts-data";
import type { Specialty } from "@/lib/specialties";
import { Search, BookOpen, Sparkles } from "lucide-react";

export default function PromptsLibraryPage() {
  const [specialty, setSpecialty] = useState<Specialty>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { addToast } = useToast();

  const filteredPrompts = useMemo(() => {
    let prompts = PROMPTS_DATA;

    // Filter by specialty
    if (specialty !== "all") {
      prompts = prompts.filter(
        (p) => p.specialty === specialty || p.specialty === "all"
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      prompts = prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.prompt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return prompts;
  }, [specialty, searchQuery]);

  // Group prompts by category
  const groupedPrompts = useMemo(() => {
    const groups = new Map<string, typeof filteredPrompts>();
    for (const prompt of filteredPrompts) {
      const existing = groups.get(prompt.category) || [];
      existing.push(prompt);
      groups.set(prompt.category, existing);
    }
    return groups;
  }, [filteredPrompts]);

  const handleCopy = () => {
    addToast("Промпт скопирован в буфер! 📋", "success");
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Библиотека промптов
            </h1>
            <p className="text-muted text-sm">
              Готовые промпты для работы — выберите специальность и копируйте
            </p>
          </div>
        </div>
      </div>

      {/* Specialty Filter */}
      <SpecialtyFilter onChange={setSpecialty} />

      {/* Search */}
      <div className="relative mb-6 mt-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Поиск по промптам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="prompts-search"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-6 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          {filteredPrompts.length} промптов
        </span>
        <span>
          {groupedPrompts.size} категорий
        </span>
      </div>

      {/* Content */}
      {filteredPrompts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted" />
          </div>
          <p className="text-foreground font-medium mb-1">Ничего не найдено</p>
          <p className="text-sm text-muted">
            Попробуйте изменить фильтр или поисковый запрос
          </p>
        </div>
      ) : (
        <div>
          {PROMPT_CATEGORIES.map((category) => {
            const categoryPrompts = groupedPrompts.get(category.id);
            if (!categoryPrompts || categoryPrompts.length === 0) return null;

            return (
              <div key={category.id}>
                <div className="category-header">
                  <div>
                    <h2>{category.label}</h2>
                    <p>{category.description}</p>
                  </div>
                </div>
                <div className="prompts-grid">
                  {categoryPrompts.map((prompt) => (
                    <PromptCard
                      key={prompt.id}
                      data={prompt}
                      onCopy={handleCopy}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
