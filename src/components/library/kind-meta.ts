import type { LibraryKind, LibraryAccess } from "@/lib/library-shared";

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


/**
 * How to use an item, in plain language. `key` is null for the two "no key
 * needed" states (shown green), truthy for the two that require a key (amber).
 */
export const ACCESS_META: Record<
  LibraryAccess,
  { label: string; short: string; emoji: string; badge: string; needsKey: boolean; hint: string }
> = {
  none: {
    short: "без ключа",
    label: "Ключ не нужен",
    emoji: "🟢",
    badge: "text-success bg-success/10 border-success/25",
    needsKey: false,
    hint: "Обычный инструмент — ставится локально, отдельный ключ не нужен.",
  },
  session: {
    short: "в сессии",
    label: "Работает в вашей сессии",
    emoji: "🟢",
    badge: "text-success bg-success/10 border-success/25",
    needsKey: false,
    hint: "Скил/плагин расширяет ваш Claude Code или Codex и работает по вашей подписке — отдельный API-ключ не нужен.",
  },
  claude_key: {
    short: "ключ Claude",
    label: "Нужен API-ключ Claude",
    emoji: "🔑",
    badge: "text-warning bg-warning/10 border-warning/30",
    needsKey: true,
    hint: "Работает автономно (например, в CI/GitHub), где нет вашей сессии, поэтому нужен свой ключ Anthropic API с console.anthropic.com. Это не подписка Claude Code.",
  },
  service_key: {
    short: "ключ сервиса",
    label: "Нужен ключ сервиса",
    emoji: "🗝️",
    badge: "text-warning bg-warning/10 border-warning/30",
    needsKey: true,
    hint: "Нужен API-ключ стороннего сервиса (не Claude) — см. инструкцию по установке.",
  },
};
