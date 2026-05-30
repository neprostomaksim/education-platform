export const APP_NAME = "AI Learning";
export const APP_DESCRIPTION = "Платформа для изучения искусственного интеллекта";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  LESSON: (id: string) => `/lessons/${id}`,
  ADMIN: "/admin",
  ADMIN_TOPICS: "/admin/topics",
  ADMIN_TOPICS_NEW: "/admin/topics/new",
  ADMIN_LESSONS: "/admin/lessons",
  ADMIN_LESSONS_NEW: "/admin/lessons/new",
} as const;

export const TOPIC_ICONS: Record<string, string> = {
  "prompt-engineering": "MessageSquareText",
  "ai-agents": "Bot",
  "visual-content": "Image",
  "vibe-coding": "Code",
} as const;

export const TOPIC_GRADIENTS = [
  "from-lime-400 to-emerald-500",
  "from-cyan-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-teal-400 to-green-500",
] as const;
