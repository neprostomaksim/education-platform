import type { LibraryKind } from "@/lib/library-shared";

/** Visual identity per record type — one source of truth for badges and tabs. */
export const KIND_META: Record<
  LibraryKind,
  { label: string; one: string; emoji: string; badge: string }
> = {
  prompt: {
    label: "Промпты",
    one: "Промпт",
    emoji: "✨",
    badge: "text-accent bg-accent/12 border-accent/30",
  },
  skill: {
    label: "Скилы",
    one: "Скил",
    emoji: "🧩",
    badge: "text-violet-300 bg-violet-400/12 border-violet-400/30",
  },
  tool: {
    label: "Инструменты",
    one: "Инструмент",
    emoji: "🛠",
    badge: "text-cyan-300 bg-cyan-400/12 border-cyan-400/30",
  },
};
