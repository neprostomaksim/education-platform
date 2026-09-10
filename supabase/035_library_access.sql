-- =========================================================================
-- Migration 035: доступ (нужен ли API-ключ) и быстрая установка по ссылке
-- =========================================================================
-- Два новых поля у library_items:
--   access        — что нужно, чтобы этим пользоваться:
--                     'none'        — ключ не нужен (обычный локальный инструмент)
--                     'session'     — работает в вашей сессии Claude Code/Codex
--                     'claude_key'  — нужен свой API-ключ Anthropic (headless/CI)
--                     'service_key' — нужен ключ стороннего сервиса (не Claude)
--   quick_install — одна команда установки «по ссылке» (npx skills add / plugin),
--                   когда она есть; показывается отдельным блоком с копированием.
--
-- Идемпотентна, применять после 034.
-- =========================================================================

ALTER TABLE public.library_items
    ADD COLUMN IF NOT EXISTS access TEXT NOT NULL DEFAULT 'none'
        CHECK (access IN ('none', 'session', 'claude_key', 'service_key'));
ALTER TABLE public.library_items
    ADD COLUMN IF NOT EXISTS quick_install TEXT;

-- --- access: по умолчанию 'none' (промпты и локальные инструменты) ---
-- Все скилы работают внутри сессии агента — ключ не нужен.
UPDATE public.library_items SET access = 'session' WHERE kind = 'skill';
-- Плагин-советник тоже живёт в Claude Code.
UPDATE public.library_items SET access = 'session' WHERE title = 'Claude Code Setup (плагин)';
-- Headless GitHub Action — нужен собственный ключ Anthropic API.
UPDATE public.library_items SET access = 'claude_key' WHERE title = 'Claude Code Security Review';
-- Нужен ключ стороннего сервиса.
UPDATE public.library_items SET access = 'service_key' WHERE title = 'Firecrawl MCP';

-- --- quick_install: одна команда установки по ссылке ---
UPDATE public.library_items SET quick_install = 'npx skills add https://github.com/Leonxlnx/taste-skill' WHERE title = 'Taste Skill';
UPDATE public.library_items SET quick_install = 'npx skills add https://github.com/kepano/obsidian-skills' WHERE title = 'Obsidian Skills';
UPDATE public.library_items SET quick_install = 'npx skills add blader/humanizer --global' WHERE title = 'Humanizer';
UPDATE public.library_items SET quick_install = 'npx skills add mvanhorn/last30days-skill -g' WHERE title = '/last30days';
UPDATE public.library_items SET quick_install = 'npx skills add heygen-com/hyperframes' WHERE title = 'HyperFrames';
UPDATE public.library_items SET quick_install = '/plugin install superpowers@claude-plugins-official' WHERE title = 'Superpowers';
UPDATE public.library_items SET quick_install = '/plugin install security-guidance@claude-plugins-official' WHERE title = 'Security Guidance (Anthropic)';
UPDATE public.library_items SET quick_install = '/plugin marketplace add DietrichGebert/ponytail' WHERE title = 'Ponytail';
UPDATE public.library_items SET quick_install = '/plugin install example-skills@anthropic-agent-skills' WHERE title = 'Anthropic Skills (официальные)';
