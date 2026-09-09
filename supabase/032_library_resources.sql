-- =========================================================================
-- Migration 032: Наполнение библиотеки — скилы и инструменты для ИИ
-- =========================================================================
-- 12 проверенных ресурсов (скрейпинг, браузер-автоматизация, MCP,
-- Claude-скилы, дизайн). Каждый с описанием «что делает», платформой, ссылкой
-- на источник и краткой инструкцией установки.
--
-- Идемпотентна (ON CONFLICT (id) DO UPDATE), применять после 031.
-- =========================================================================

INSERT INTO public.library_items
    (id, kind, title, description, source_url, install_md, platform, category, tags, sort_order)
VALUES
  ('bb0e8400-e29b-41d4-a716-446655500001', $lib$tool$lib$, $lib$Scrapling$lib$, $lib$Адаптивный веб-скрейпинг: селекторы сами «переезжают», когда сайт меняет вёрстку, плюс обход анти-бот защит (Cloudflare Turnstile).$lib$, $lib$https://github.com/d4vinci/Scrapling$lib$, $lib$```bash
pip install "scrapling[fetchers]"
scrapling install
```
Поддерживает одиночные запросы и полноценные краулеры с паузой/возобновлением.$lib$, $lib$Python$lib$, $lib$Веб-скрейпинг$lib$, ARRAY[$lib$скрейпинг$lib$,$lib$python$lib$,$lib$автоматизация$lib$,$lib$краулер$lib$,$lib$анти-бот$lib$]::text[], 1000),
  ('bb0e8400-e29b-41d4-a716-446655500002', $lib$tool$lib$, $lib$Chrome MCP (mcp-chrome)$lib$, $lib$MCP-сервер в виде расширения Chrome: ИИ управляет вашим обычным браузером с уже залогиненными сессиями — без отдельного процесса и повторного входа.$lib$, $lib$https://github.com/hangwin/mcp-chrome$lib$, $lib$```bash
npm install -g mcp-chrome-bridge
```
Затем в `chrome://extensions/` включите «Режим разработчика» и загрузите распакованное расширение из релиза на GitHub.$lib$, $lib$Chrome + MCP$lib$, $lib$Браузер и MCP$lib$, ARRAY[$lib$браузер$lib$,$lib$mcp$lib$,$lib$chrome$lib$,$lib$автоматизация$lib$]::text[], 1010),
  ('bb0e8400-e29b-41d4-a716-446655500003', $lib$tool$lib$, $lib$Firecrawl MCP$lib$, $lib$Официальный MCP-сервер Firecrawl: даёт ИИ-агентам чистый, готовый к обработке контент живых веб-страниц и веб-поиск.$lib$, $lib$https://github.com/firecrawl/firecrawl-mcp-server$lib$, $lib$Добавьте в конфиг MCP (Claude Desktop / Cursor). Нужен ключ Firecrawl:
```json
{
  "mcpServers": {
    "firecrawl-mcp": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": { "FIRECRAWL_API_KEY": "fc-ВАШ_КЛЮЧ" }
    }
  }
}
```$lib$, $lib$MCP (Claude, Cursor)$lib$, $lib$Веб-скрейпинг$lib$, ARRAY[$lib$скрейпинг$lib$,$lib$mcp$lib$,$lib$поиск$lib$,$lib$данные$lib$]::text[], 1020),
  ('bb0e8400-e29b-41d4-a716-446655500004', $lib$tool$lib$, $lib$Playwright MCP$lib$, $lib$MCP-сервер от Microsoft для автоматизации браузера через дерево доступности (accessibility), а не скриншоты — детерминированно и экономно по токенам, без vision-модели.$lib$, $lib$https://github.com/microsoft/playwright-mcp$lib$, $lib$Добавьте в конфиг MCP:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```$lib$, $lib$MCP$lib$, $lib$Браузер и MCP$lib$, ARRAY[$lib$браузер$lib$,$lib$mcp$lib$,$lib$playwright$lib$,$lib$тестирование$lib$]::text[], 1030),
  ('bb0e8400-e29b-41d4-a716-446655500005', $lib$tool$lib$, $lib$Graphify$lib$, $lib$Превращает кодовую базу (плюс доки, PDF, конфиги) в запрашиваемый граф знаний через локальный AST-разбор — можно искать связи концепций вместо grep по файлам.$lib$, $lib$https://github.com/Graphify-Labs/graphify$lib$, $lib$```bash
uv tool install graphifyy && graphify install
```
Работает как скилл в Claude Code, Cursor, Gemini CLI и других ИИ-ассистентах.$lib$, $lib$Claude Code / CLI$lib$, $lib$Код и разработка$lib$, ARRAY[$lib$граф-знаний$lib$,$lib$анализ-кода$lib$,$lib$ast$lib$,$lib$claude-code$lib$]::text[], 1040),
  ('bb0e8400-e29b-41d4-a716-446655500006', $lib$tool$lib$, $lib$Headroom$lib$, $lib$Сжимает вывод инструментов, логи, RAG-чанки и файлы перед отправкой в LLM — экономит 20–95% токенов без потери смысла. Прокси, библиотека или MCP.$lib$, $lib$https://github.com/headroomlabs-ai/headroom$lib$, $lib$```bash
pip install "headroom-ai[all]"
headroom proxy --port 8787
```$lib$, $lib$Claude Code / прокси$lib$, $lib$Код и разработка$lib$, ARRAY[$lib$токены$lib$,$lib$сжатие$lib$,$lib$контекст$lib$,$lib$прокси$lib$]::text[], 1050),
  ('bb0e8400-e29b-41d4-a716-446655500007', $lib$skill$lib$, $lib$Apple Design Skill$lib$, $lib$Скилл для создания интерфейсов в духе Apple: жесты, пружинные анимации, «мысль и жест происходят параллельно». Переводит идеи из докладов WWDC в приёмы для веба.$lib$, $lib$https://github.com/emilkowalski/skills/tree/main/skills/apple-design$lib$, $lib$Скопируйте папку скилла в `~/.claude/skills/apple-design/` (или в `.claude/skills/` проекта). Claude подхватит его по описанию, когда делаете drag/swipe/sheet-интерфейсы.$lib$, $lib$Claude$lib$, $lib$Дизайн и UI$lib$, ARRAY[$lib$дизайн$lib$,$lib$анимации$lib$,$lib$жесты$lib$,$lib$ui$lib$,$lib$apple$lib$]::text[], 1060),
  ('bb0e8400-e29b-41d4-a716-446655500008', $lib$skill$lib$, $lib$Andrej Karpathy Skills$lib$, $lib$Набор принципов работы с кодом от Андрея Карпаты (думай до кода, простота, точечные правки, цель-ориентированность) — один `CLAUDE.md`, улучшающий поведение Claude Code.$lib$, $lib$https://github.com/multica-ai/andrej-karpathy-skills$lib$, $lib$Через маркетплейс плагинов Claude Code, либо просто добавьте `CLAUDE.md` из репозитория в корень своего проекта.$lib$, $lib$Claude Code$lib$, $lib$Claude-скилы$lib$, ARRAY[$lib$claude-code$lib$,$lib$принципы$lib$,$lib$best-practices$lib$,$lib$карпаты$lib$]::text[], 1070),
  ('bb0e8400-e29b-41d4-a716-446655500009', $lib$skill$lib$, $lib$Anthropic Skills (официальные)$lib$, $lib$Официальный репозиторий примеров скилов от Anthropic — папки с инструкциями, скриптами и ресурсами, которые учат Claude выполнять специализированные задачи.$lib$, $lib$https://github.com/anthropics/skills$lib$, $lib$В Claude Code:
```
/plugin install example-skills@anthropic-agent-skills
/plugin install document-skills@anthropic-agent-skills
```
В Claude.ai — загрузить скилл в настройках. Структура скилла: папка с `SKILL.md` (YAML-фронтматтер + инструкции).$lib$, $lib$Claude / Claude Code / API$lib$, $lib$Claude-скилы$lib$, ARRAY[$lib$скилы$lib$,$lib$claude$lib$,$lib$anthropic$lib$,$lib$агенты$lib$]::text[], 1080),
  ('bb0e8400-e29b-41d4-a716-446655500010', $lib$skill$lib$, $lib$UI/UX Pro Max Skill$lib$, $lib$Дизайн-интеллект: генерирует цельные дизайн-системы (паттерны, цвета, типографика, компоненты). 192 отраслевых правила, 79 UI-стилей, 22 стека.$lib$, $lib$https://github.com/nextlevelbuilder/ui-ux-pro-max-skill$lib$, $lib$```bash
npm install -g ui-ux-pro-max-cli
uipro init --ai claude
```
Либо установка через Claude Marketplace.$lib$, $lib$Claude Code / Cursor$lib$, $lib$Дизайн и UI$lib$, ARRAY[$lib$дизайн-система$lib$,$lib$ui-ux$lib$,$lib$скилл$lib$,$lib$компоненты$lib$]::text[], 1090),
  ('bb0e8400-e29b-41d4-a716-446655500011', $lib$tool$lib$, $lib$Claude Code Setup (плагин)$lib$, $lib$Анализирует ваш проект и советует, какие MCP-серверы, скилы, хуки, сабагенты и слэш-команды подключить под ваш стек. Ничего не меняет — только рекомендации.$lib$, $lib$https://claude.com/plugins/claude-code-setup$lib$, $lib$Установите плагин в Claude Code и спросите: «recommend automations for this project» или «какие хуки мне подойдут?».$lib$, $lib$Claude Code$lib$, $lib$Claude-скилы$lib$, ARRAY[$lib$claude-code$lib$,$lib$автоматизация$lib$,$lib$настройка$lib$,$lib$mcp$lib$]::text[], 1100),
  ('bb0e8400-e29b-41d4-a716-446655500012', $lib$tool$lib$, $lib$21st.dev$lib$, $lib$Реестр из 12 000+ React-компонентов, шаблонов и shadcn-тем от дизайн-инженеров. Копируете готовый AI-промпт компонента и вставляете в Cursor/Claude Code — он собирает его в вашем коде.$lib$, $lib$https://21st.dev$lib$, $lib$Найдите компонент на 21st.dev → «Copy prompt» → вставьте в свой ИИ-инструмент (Cursor, Claude Code, v0). Либо классическая установка через `shadcn` CLI.$lib$, $lib$React / AI-агенты$lib$, $lib$Дизайн и UI$lib$, ARRAY[$lib$react$lib$,$lib$компоненты$lib$,$lib$shadcn$lib$,$lib$ui$lib$,$lib$дизайн$lib$]::text[], 1110)
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
