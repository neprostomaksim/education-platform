// review-lessons.mjs — тянет тексты уроков из Supabase и печатает их в stdout
// с разделителями. Сам LLM здесь НЕ вызывается: оценку делает Claude Code
// (через слэш-команду /review-lessons) — на твоей подписке Claude, без API-ключа.
//
// Обычный node-скрипт не может использовать подписку Claude Code напрямую,
// поэтому роли разделены: этот скрипт достаёт данные, а ревью выполняет Claude Code.
//
// Использование (обычно через /review-lessons, но можно и напрямую):
//   node --env-file=.env.local scripts/review-lessons.mjs --course нейроконтент
//   node --env-file=.env.local scripts/review-lessons.mjs --topic <topic_id>
//   node --env-file=.env.local scripts/review-lessons.mjs --lesson <lesson_id>
//   node --env-file=.env.local scripts/review-lessons.mjs            (список курсов/тем)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Запускай с --env-file=.env.local");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
};
const courseQ = getArg("--course");
const topicId = getArg("--topic");
const lessonId = getArg("--lesson");

async function listAndExit() {
  const { data: courses } = await admin.from("courses").select("id, title").order("created_at");
  console.log("Укажи область: --course <часть названия> | --topic <id> | --lesson <id>\n");
  for (const c of courses || []) {
    const { data: topics } = await admin.from("topics").select("id, title").eq("course_id", c.id).order("sort_order");
    console.log(`• ${c.title}`);
    for (const t of topics || []) console.log(`    тема: ${t.title}  (--topic ${t.id})`);
  }
  process.exit(0);
}

async function fetchLessons() {
  if (lessonId) {
    const { data } = await admin.from("lessons").select("id, title, content").eq("id", lessonId);
    return data || [];
  }
  if (topicId) {
    const { data } = await admin.from("lessons").select("id, title, content").eq("topic_id", topicId).order("sort_order");
    return data || [];
  }
  if (courseQ) {
    const { data: courses } = await admin.from("courses").select("id").ilike("title", `%${courseQ}%`);
    const courseIds = (courses || []).map((c) => c.id);
    if (courseIds.length === 0) return [];
    const { data: topics } = await admin.from("topics").select("id").in("course_id", courseIds);
    const topicIds = (topics || []).map((t) => t.id);
    const { data } = await admin.from("lessons").select("id, title, content").in("topic_id", topicIds).order("sort_order");
    return data || [];
  }
  return null;
}

const lessons = await fetchLessons();
if (lessons === null) await listAndExit();

const withContent = lessons.filter((l) => l.content && l.content.trim());
if (withContent.length === 0) {
  console.log("Уроки с контентом под заданную область не найдены.");
  process.exit(0);
}

for (const l of withContent) {
  console.log(`\n===== LESSON: ${l.title} (id: ${l.id}) =====`);
  console.log(l.content);
  console.log(`===== END LESSON: ${l.title} =====`);
}
