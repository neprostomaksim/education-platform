-- =========================================================================
-- Migration 036: Библиотека — Cybersecurity Skills и Screenshot to Code
-- =========================================================================
-- Вставка с полями access/quick_install (добавлены в 035). Применять после 035.
-- Идемпотентна (ON CONFLICT (id) DO UPDATE).
-- =========================================================================

INSERT INTO public.library_items
    (id, kind, title, description, source_url, install_md, platform, category, tags, access, quick_install, sort_order)
VALUES
  ('ff0e8400-e29b-41d4-a716-446655800001', $lib$skill$lib$, $lib$Anthropic Cybersecurity Skills$lib$, $lib$818 структурированных скилов по кибербезопасности в 34 доменах (threat hunting, форензика, реагирование на инциденты, MITRE ATT&CK) по стандарту agentskills.io. Ключ не нужен — работает в вашей сессии агента.$lib$, $lib$https://github.com/mukul975/anthropic-cybersecurity-skills$lib$, $lib$Одной командой:
```
npx skills add mukul975/Anthropic-Cybersecurity-Skills
```
Или склонировать и указать агенту на репозиторий:
```bash
git clone https://github.com/mukul975/Anthropic-Cybersecurity-Skills.git
```$lib$, $lib$Claude Code / 26+ агентов$lib$, $lib$Безопасность$lib$, ARRAY[$lib$кибербезопасность$lib$,$lib$скилы$lib$,$lib$threat-hunting$lib$,$lib$mitre$lib$,$lib$агенты$lib$]::text[], $lib$session$lib$, $lib$npx skills add mukul975/Anthropic-Cybersecurity-Skills$lib$, 4000),
  ('ff0e8400-e29b-41d4-a716-446655800002', $lib$tool$lib$, $lib$Screenshot to Code$lib$, $lib$Превращает скриншоты, макеты, Figma-дизайны и записи экрана в чистый код (HTML+Tailwind, React, Vue, Bootstrap). Веб-приложение, запускаете локально.$lib$, $lib$https://github.com/abi/screenshot-to-code$lib$, $lib$Нужен ключ одного из провайдеров на выбор: OpenAI, Anthropic или Gemini.
```bash
git clone https://github.com/abi/screenshot-to-code.git
cd screenshot-to-code/backend
# в .env добавьте ключ: OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY
poetry install && poetry run uvicorn main:app --reload --port 7001
```
Фронтенд (в папке `frontend`): `pnpm install && pnpm dev`, затем откройте http://localhost:5173$lib$, $lib$Локальное приложение (React + FastAPI)$lib$, $lib$Дизайн и UI$lib$, ARRAY[$lib$скриншот-в-код$lib$,$lib$ui$lib$,$lib$генерация-кода$lib$,$lib$figma$lib$,$lib$open-source$lib$]::text[], $lib$service_key$lib$, NULL, 4010)
ON CONFLICT (id) DO UPDATE SET
    kind = EXCLUDED.kind, title = EXCLUDED.title, description = EXCLUDED.description,
    source_url = EXCLUDED.source_url, install_md = EXCLUDED.install_md,
    platform = EXCLUDED.platform, category = EXCLUDED.category, tags = EXCLUDED.tags,
    access = EXCLUDED.access, quick_install = EXCLUDED.quick_install, sort_order = EXCLUDED.sort_order;
