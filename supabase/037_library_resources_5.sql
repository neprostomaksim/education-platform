-- =========================================================================
-- Migration 037: Библиотека — claude-video (/watch), анализ видео
-- =========================================================================
-- Вставка с access/quick_install. Применять после 036. Идемпотентна.
-- =========================================================================

INSERT INTO public.library_items
    (id, kind, title, description, source_url, install_md, platform, category, tags, access, quick_install, sort_order)
VALUES
  ('ab0e8400-e29b-41d4-a716-446655900001', $lib$skill$lib$, $lib$claude-video (/watch)$lib$, $lib$Скил для анализа видео: извлекает кадры с учётом сцен и таймкод-транскрипт (из субтитров или Whisper) и передаёт Claude — чтобы он «посмотрел» и «послушал» видео.$lib$, $lib$https://github.com/bradautomates/claude-video$lib$, $lib$В Claude Code:
```
/plugin marketplace add bradautomates/claude-video
/plugin install watch@claude-video
```
В других агентах одной командой:
```
npx skills add bradautomates/claude-video -g
```
Ключ не обязателен: используются бесплатные субтитры. Ключ Groq (дешевле) или OpenAI нужен только для видео без субтитров.$lib$, $lib$Claude Code / 50+ агентов$lib$, $lib$Видео и медиа$lib$, ARRAY[$lib$видео$lib$,$lib$анализ$lib$,$lib$кадры$lib$,$lib$транскрипт$lib$,$lib$скилл$lib$]::text[], $lib$session$lib$, $lib$npx skills add bradautomates/claude-video -g$lib$, 5000)
ON CONFLICT (id) DO UPDATE SET
    kind = EXCLUDED.kind, title = EXCLUDED.title, description = EXCLUDED.description,
    source_url = EXCLUDED.source_url, install_md = EXCLUDED.install_md,
    platform = EXCLUDED.platform, category = EXCLUDED.category, tags = EXCLUDED.tags,
    access = EXCLUDED.access, quick_install = EXCLUDED.quick_install, sort_order = EXCLUDED.sort_order;
