-- =========================================================================
-- Migration 038: Библиотека — Marketing Skills (60+ маркетинговых скилов)
-- =========================================================================
-- Вставка с access/quick_install. Новая категория «Маркетинг». Применять
-- после 037. Идемпотентна.
-- =========================================================================

INSERT INTO public.library_items
    (id, kind, title, description, source_url, install_md, platform, category, tags, access, quick_install, sort_order)
VALUES
  ('ac0e8400-e29b-41d4-a716-446655a00001', $lib$skill$lib$, $lib$Marketing Skills$lib$, $lib$60+ скилов по маркетингу для ИИ-агентов: CRO, копирайтинг, SEO, аналитика, growth. Все опираются на общий контекст-документ о вашем продукте, аудитории и позиционировании, и ссылаются друг на друга.$lib$, $lib$https://github.com/coreyhaines31/marketingskills$lib$, $lib$Одной командой:
```
npx skills add coreyhaines31/marketingskills
```
Или плагином в Claude Code:
```
/plugin marketplace add coreyhaines31/marketingskills
```
Ключ не нужен — работает в вашей сессии агента.$lib$, $lib$Claude Code / агенты$lib$, $lib$Маркетинг$lib$, ARRAY[$lib$маркетинг$lib$,$lib$cro$lib$,$lib$копирайтинг$lib$,$lib$seo$lib$,$lib$скилы$lib$]::text[], $lib$session$lib$, $lib$npx skills add coreyhaines31/marketingskills$lib$, 6000)
ON CONFLICT (id) DO UPDATE SET
    kind = EXCLUDED.kind, title = EXCLUDED.title, description = EXCLUDED.description,
    source_url = EXCLUDED.source_url, install_md = EXCLUDED.install_md,
    platform = EXCLUDED.platform, category = EXCLUDED.category, tags = EXCLUDED.tags,
    access = EXCLUDED.access, quick_install = EXCLUDED.quick_install, sort_order = EXCLUDED.sort_order;
