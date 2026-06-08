"use client";

import { useState, useMemo } from "react";
import { useToast } from "@/components/shared/toast-provider";
import { SpecialtyFilter } from "@/components/lesson/specialty-filter";
import { PromptCard } from "@/components/lesson/prompt-card";
import { PROMPTS_DATA, PROMPT_CATEGORIES } from "@/lib/prompts-data";
import type { Specialty } from "@/lib/specialties";
import { Search, BookOpen, Sparkles, Layers } from "lucide-react";

export default function PromptsLibraryPage() {
  const [specialty, setSpecialty] = useState<Specialty>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { addToast } = useToast();

  const filteredPrompts = useMemo(() => {
    let prompts = PROMPTS_DATA;

    // Filter by category
    if (activeCategory !== "all") {
      prompts = prompts.filter((p) => p.category === activeCategory);
    }

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
  }, [specialty, activeCategory, searchQuery]);

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
      <div className="mb-6 lg:mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Библиотека промптов
            </h1>
            <p className="text-muted text-base mt-1">
              Готовые промпты для работы — выберите специализацию и нужную категорию
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar Categories */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="sticky top-24">
            <h3 className="text-sm font-semibold text-muted mb-4 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Категории
            </h3>
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 gap-2 hide-scrollbar">
              <button
                onClick={() => setActiveCategory("all")}
                className={`whitespace-nowrap px-4 py-3 rounded-xl text-sm font-medium transition-all text-left flex items-center justify-between group
                  ${
                    activeCategory === "all"
                      ? "bg-accent text-white shadow-lg shadow-accent/20"
                      : "bg-card text-foreground hover:bg-accent/10 border border-white/5"
                  }`}
              >
                Все промпты
                <span 
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeCategory === "all" 
                      ? "bg-white/20 text-white" 
                      : "bg-white/5 text-muted group-hover:bg-accent/20 group-hover:text-accent"
                  }`}
                >
                  {PROMPTS_DATA.length}
                </span>
              </button>
              {PROMPT_CATEGORIES.map((category) => {
                const count = PROMPTS_DATA.filter((p) => p.category === category.id).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`whitespace-nowrap px-4 py-3 rounded-xl text-sm font-medium transition-all text-left flex items-center justify-between group
                      ${
                        activeCategory === category.id
                          ? "bg-accent text-white shadow-lg shadow-accent/20"
                          : "bg-card text-foreground hover:bg-accent/10 border border-white/5"
                      }`}
                  >
                    {category.label}
                    <span 
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        activeCategory === category.id 
                          ? "bg-white/20 text-white" 
                          : "bg-white/5 text-muted group-hover:bg-accent/20 group-hover:text-accent"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-card/30 rounded-2xl p-4 lg:p-6 border border-white/5 mb-8">
            {/* Specialty Filter */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-foreground mb-3">Роль / Специализация</h4>
              <SpecialtyFilter onChange={setSpecialty} />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="Поиск по промптам, описанию или тегам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/10 bg-black/20 focus:bg-black/40 focus:outline-none focus:ring-1 focus:ring-accent transition-all text-sm placeholder:text-muted/70"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-6 text-sm text-muted/80">
            <span className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-4 h-4 text-accent" />
              Найдено: {filteredPrompts.length}
            </span>
            {activeCategory !== "all" && (
              <span className="px-2 py-0.5 rounded-md bg-white/5">
                {PROMPT_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </span>
            )}
          </div>

          {/* Content Grid */}
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-16 bg-card/20 rounded-3xl border border-white/5">
              <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
                <Search className="w-10 h-10 text-accent/60" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Ничего не найдено</p>
              <p className="text-sm text-muted max-w-sm mx-auto">
                Попробуйте изменить категорию, выбрать другую роль или упростить поисковый запрос
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {PROMPT_CATEGORIES.map((category) => {
                const categoryPrompts = groupedPrompts.get(category.id);
                if (!categoryPrompts || categoryPrompts.length === 0) return null;

                return (
                  <div key={category.id} className="scroll-mt-24" id={`category-${category.id}`}>
                    <div className="mb-6 pb-2 border-b border-white/5">
                      <h2 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
                        {category.label}
                      </h2>
                      <p className="text-muted text-sm mt-1">{category.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
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
        </main>
      </div>
    </div>
  );
}
