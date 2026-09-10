-- =========================================================================
-- Migration 034: Библиотека — безопасность и ревью кода (+6)
-- =========================================================================
-- Superpowers, Ponytail (скилы-методологии), официальные плагины Anthropic по
-- безопасности и ревью PR. Новая категория «Безопасность». Формат как в 032/033.
-- Идемпотентна (ON CONFLICT (id) DO UPDATE), применять после 033.
-- =========================================================================

INSERT INTO public.library_items
    (id, kind, title, description, source_url, install_md, platform, category, tags, sort_order)
VALUES
  ('ee0e8400-e29b-41d4-a716-446655700001', $lib$skill$lib$, $lib$Superpowers$lib$, $lib$Методология разработки для ИИ-агентов на основе композируемых скилов: ведёт агента по структурированному процессу — проектирование, тесты, ревью — вместо «сразу писать код».$lib$, $lib$https://github.com/obra/superpowers$lib$, $lib$В Claude Code:
```
/plugin install superpowers@claude-plugins-official
```
Для Cursor, Gemini, Copilot CLI и др. — см. инструкции в репозитории.$lib$, $lib$Claude Code / многие агенты$lib$, $lib$Claude-скилы$lib$, ARRAY[$lib$методология$lib$,$lib$tdd$lib$,$lib$агенты$lib$,$lib$workflow$lib$,$lib$скилл$lib$]::text[], 3000),
  ('ee0e8400-e29b-41d4-a716-446655700002', $lib$skill$lib$, $lib$Ponytail$lib$, $lib$«Ленивый сеньор»: заставляет агента писать минимум необходимого кода — сначала переиспользовать и встроенные решения, а не плодить зависимости и бойлерплейт. Экономит токены и сложность.$lib$, $lib$https://github.com/dietrichgebert/ponytail$lib$, $lib$В Claude Code:
```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```
Есть режимы для Cursor, Codex, Copilot, Gemini и др.$lib$, $lib$Claude Code / Cursor / Codex$lib$, $lib$Claude-скилы$lib$, ARRAY[$lib$минимализм$lib$,$lib$yagni$lib$,$lib$код$lib$,$lib$агенты$lib$,$lib$скилл$lib$]::text[], 3010),
  ('ee0e8400-e29b-41d4-a716-446655700003', $lib$skill$lib$, $lib$Security Guidance (Anthropic)$lib$, $lib$Официальный плагин Anthropic: трёхслойное ревью безопасности кода от Claude — мгновенные regex-предупреждения, LLM-разбор диффа на серьёзные находки и агентное ревью коммита на уязвимости в нескольких файлах.$lib$, $lib$https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance$lib$, $lib$В Claude Code:
```
/plugin install security-guidance@claude-plugins-official
```
Официальная документация: https://code.claude.com/docs/en/security-guidance$lib$, $lib$Claude Code$lib$, $lib$Безопасность$lib$, ARRAY[$lib$безопасность$lib$,$lib$ревью$lib$,$lib$уязвимости$lib$,$lib$claude-code$lib$,$lib$sast$lib$]::text[], 3020),
  ('ee0e8400-e29b-41d4-a716-446655700004', $lib$tool$lib$, $lib$Claude Code Security Review$lib$, $lib$GitHub Action от Anthropic: Claude семантически анализирует пулл-реквесты на уязвимости (инъекции, дыры в аутентификации, утечки данных, крипто-ошибки) — меньше ложных срабатываний, чем у обычных SAST.$lib$, $lib$https://github.com/anthropics/claude-code-security-review$lib$, $lib$Добавьте в `.github/workflows/security.yml`:
```yaml
- uses: anthropics/claude-code-security-review@main
  with:
    comment-pr: true
    claude-api-key: ${{ secrets.CLAUDE_API_KEY }}
```
и задайте секрет `CLAUDE_API_KEY` в настройках репозитория.$lib$, $lib$GitHub Action$lib$, $lib$Безопасность$lib$, ARRAY[$lib$безопасность$lib$,$lib$github-action$lib$,$lib$уязвимости$lib$,$lib$ci$lib$,$lib$ревью$lib$]::text[], 3030),
  ('ee0e8400-e29b-41d4-a716-446655700005', $lib$skill$lib$, $lib$Code Review (плагин Claude Code)$lib$, $lib$Официальный плагин Claude Code: запускает несколько специализированных агентов параллельно для независимого ревью пулл-реквеста, с оценкой уверенности — чтобы в фидбек попадали только качественные находки.$lib$, $lib$https://github.com/anthropics/claude-code/blob/main/plugins/code-review/README.md$lib$, $lib$Встроен в Claude Code — отдельная установка не нужна. Запуск командой `/code-review`.$lib$, $lib$Claude Code$lib$, $lib$Код и разработка$lib$, ARRAY[$lib$ревью$lib$,$lib$pr$lib$,$lib$мульти-агент$lib$,$lib$качество$lib$,$lib$claude-code$lib$]::text[], 3040),
  ('ee0e8400-e29b-41d4-a716-446655700006', $lib$skill$lib$, $lib$PR Review Toolkit$lib$, $lib$Официальный плагин Claude Code: 6 агентов для всестороннего ревью PR — проверка комментариев, покрытия тестами, обработки ошибок (silent failures), дизайна типов, качества кода и упрощения.$lib$, $lib$https://github.com/anthropics/claude-code/tree/main/plugins/pr-review-toolkit$lib$, $lib$Установите из маркетплейса плагинов: откройте `/plugins`, найдите «pr-review-toolkit» и установите.$lib$, $lib$Claude Code$lib$, $lib$Код и разработка$lib$, ARRAY[$lib$ревью$lib$,$lib$pr$lib$,$lib$тесты$lib$,$lib$типы$lib$,$lib$агенты$lib$]::text[], 3050)
ON CONFLICT (id) DO UPDATE SET
    kind = EXCLUDED.kind, title = EXCLUDED.title, description = EXCLUDED.description,
    source_url = EXCLUDED.source_url, install_md = EXCLUDED.install_md,
    platform = EXCLUDED.platform, category = EXCLUDED.category,
    tags = EXCLUDED.tags, sort_order = EXCLUDED.sort_order;
