-- =========================================================================
-- Migration 033: Библиотека — ещё 6 скилов и инструментов
-- =========================================================================
-- Дизайн-скилы (taste), исследования (last30days), текст (humanizer),
-- знания (obsidian), видео (hyperframes, OpenMontage). Формат тот же, что 032.
-- Идемпотентна (ON CONFLICT (id) DO UPDATE), применять после 032.
-- =========================================================================

INSERT INTO public.library_items
    (id, kind, title, description, source_url, install_md, platform, category, tags, sort_order)
VALUES
  ('cc0e8400-e29b-41d4-a716-446655600001', $lib$skill$lib$, $lib$Taste Skill$lib$, $lib$Набор скилов, который улучшает интерфейсы, генерируемые ИИ: раскладка, типографика, отступы, движение — чтобы вместо «дженерик-слопа» получался вкусный UI.$lib$, $lib$https://github.com/Leonxlnx/taste-skill$lib$, $lib$```bash
npx skills add https://github.com/Leonxlnx/taste-skill
```
Работает с React, Vue, Svelte в Claude, Cursor, Codex.$lib$, $lib$Claude / Cursor / Codex$lib$, $lib$Дизайн и UI$lib$, ARRAY[$lib$дизайн$lib$,$lib$ui$lib$,$lib$типографика$lib$,$lib$frontend$lib$,$lib$скилл$lib$]::text[], 2000),
  ('cc0e8400-e29b-41d4-a716-446655600002', $lib$skill$lib$, $lib$/last30days$lib$, $lib$Скилл-исследователь: ищет по Reddit, X, YouTube, HN, Polymarket и вебу одновременно и сводит в резюме, ранжированное по реальной вовлечённости, а не по редакторским топам. Данные за последние 30 дней.$lib$, $lib$https://github.com/mvanhorn/last30days-skill$lib$, $lib$В Claude Code:
```
/plugin marketplace add mvanhorn/last30days-skill
```
В других агентах: `npx skills add mvanhorn/last30days-skill -g`$lib$, $lib$Claude Code / 50+ агентов$lib$, $lib$Исследования$lib$, ARRAY[$lib$исследования$lib$,$lib$reddit$lib$,$lib$real-time$lib$,$lib$поиск$lib$,$lib$скилл$lib$]::text[], 2010),
  ('cc0e8400-e29b-41d4-a716-446655600003', $lib$skill$lib$, $lib$Humanizer$lib$, $lib$Переписывает ИИ-текст, чтобы он звучал по-человечески: убирает 25 характерных паттернов машинного письма (избитые слова, искусственный ритм), сохраняя смысл.$lib$, $lib$https://github.com/blader/humanizer$lib$, $lib$```
npx skills add blader/humanizer --global
```
Или в Claude Code: `/plugin marketplace add blader/humanizer`$lib$, $lib$Claude Code / Desktop$lib$, $lib$Работа с текстом$lib$, ARRAY[$lib$текст$lib$,$lib$редактура$lib$,$lib$письмо$lib$,$lib$humanize$lib$,$lib$скилл$lib$]::text[], 2020),
  ('cc0e8400-e29b-41d4-a716-446655600004', $lib$skill$lib$, $lib$Obsidian Skills$lib$, $lib$Скилы для работы ИИ с хранилищами Obsidian и открытыми форматами (Markdown, Bases, JSON Canvas): агент управляет заметками через Obsidian CLI, создаёт и правит файлы.$lib$, $lib$https://github.com/kepano/obsidian-skills$lib$, $lib$```
npx skills add https://github.com/kepano/obsidian-skills
```$lib$, $lib$Claude Code / Codex / OpenCode$lib$, $lib$Знания и заметки$lib$, ARRAY[$lib$obsidian$lib$,$lib$заметки$lib$,$lib$markdown$lib$,$lib$знания$lib$,$lib$скилл$lib$]::text[], 2030),
  ('cc0e8400-e29b-41d4-a716-446655600005', $lib$tool$lib$, $lib$HyperFrames$lib$, $lib$Open-source фреймворк: превращает HTML, CSS и анимации в детерминированные MP4-видео. CLI + npm-пакет + скилы для ИИ-агентов. Идеально для авто-генерации видео в пайплайнах.$lib$, $lib$https://github.com/heygen-com/hyperframes$lib$, $lib$Требует Node.js 22+ и FFmpeg.
```bash
npx hyperframes init my-video
```
Или как скилл для агента: `npx skills add heygen-com/hyperframes`$lib$, $lib$Node.js / Claude / Cursor$lib$, $lib$Видео и медиа$lib$, ARRAY[$lib$видео$lib$,$lib$html$lib$,$lib$рендеринг$lib$,$lib$анимации$lib$,$lib$open-source$lib$]::text[], 2040),
  ('cc0e8400-e29b-41d4-a716-446655600006', $lib$tool$lib$, $lib$OpenMontage$lib$, $lib$Первая open-source агентная система видеопродакшна: превращает ИИ-ассистента в видеостудию — исследование, сценарий, генерация ассетов, монтаж и сборка. Монтаж реальных кадров без платных API.$lib$, $lib$https://github.com/calesthio/OpenMontage$lib$, $lib$```bash
git clone https://github.com/calesthio/OpenMontage.git
cd OpenMontage
make setup
```
Python, работает с любым ИИ-ассистентом с чтением файлов и запуском Python.$lib$, $lib$Python / ИИ-агенты$lib$, $lib$Видео и медиа$lib$, ARRAY[$lib$видео$lib$,$lib$монтаж$lib$,$lib$агенты$lib$,$lib$продакшн$lib$,$lib$python$lib$]::text[], 2050)
ON CONFLICT (id) DO UPDATE SET
    kind = EXCLUDED.kind,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    source_url = EXCLUDED.source_url,
    install_md = EXCLUDED.install_md,
    platform = EXCLUDED.platform,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    sort_order = EXCLUDED.sort_order;
