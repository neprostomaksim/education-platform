# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite is configured.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server-only, for admin operations
```

## Architecture

**Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Supabase (PostgreSQL + Auth + RLS)

This is a Russian-language AI learning platform ("AI Learning"). The UI language is Russian throughout.

### Route Groups

- `(auth)` — `/login`, `/register`, `/callback` — Supabase OAuth callback handler
- `(dashboard)` — `/dashboard`, `/courses/[courseId]`, `/lessons/[lessonId]`, `/prompts` — requires authenticated + approved user
- `(admin)` — legacy admin shell (separate from the dashboard admin routes below)
- `/admin/users`, `/admin/courses`, `/admin/lesson-access` — admin-only pages inside `(dashboard)` group
- `/pending` — shown to authenticated but unapproved users

### Middleware

The Next.js middleware file is `src/proxy.ts` (not `middleware.ts` — this is a Next.js v16 breaking change). It calls `src/lib/supabase/middleware.ts` to refresh Supabase sessions and enforce auth redirects.

Protected routes: `/dashboard`, `/lessons`, `/admin`, `/prompts`

### Auth & User State

- **`UserProvider`** (`src/hooks/use-user.ts`) — React context wrapping the entire app. Loads session from Supabase, fetches `profiles` table, falls back to `localStorage` (`lms-user-cache`, `lms-profile-cache`) when offline or on error. Re-validates on tab visibility change.
- `useUser()` — returns `{ user, profile, loading }`. `profile.role` is `"admin" | "student"`. `profile.is_approved` gates access; unapproved students are redirected to `/pending`.
- Supabase clients: `src/lib/supabase/client.ts` (browser singleton), `src/lib/supabase/server.ts` (server RSC/Route Handler), `src/lib/supabase/admin.ts` (service role key — server only).

### Data Fetching & Caching

All pages are client components (`"use client"`). Data is fetched via custom hooks:

- `useCourses(userId)` — fetches courses → topics → lessons → progress. RLS on `courses` table filters by `user_courses` join (admins see all). Results cached in `localStorage` as `lms-courses-cache`.
- `useProgress(userId)` — manages lesson completion. Completed IDs cached as `lms-progress-completed-ids`.
- `useTopics(userId)` — fetches published topics + lessons with progress for the lessons grid (independent of the per-course hierarchy).
- `useLessonAccess(userId)` — reads `user_lesson_access` to determine which lessons a student may open. Cached as `lms-lesson-access-cache`.
- Lesson page (`/lessons/[lessonId]`) implements its own fetch + cache fallback for offline support.

Lesson gating: courses carry a `sequential_access` flag — when set, a lesson unlocks only after the previous one is completed (the first lesson is unlocked by default). Explicit per-lesson grants live in `user_lesson_access` and are managed from `/admin/lesson-access`. Locked lessons render a green lock in the UI.

The platform is PWA-enabled (`public/sw.js`, `public/manifest.json`, `src/components/providers/pwa-provider.tsx`).

### Database Schema (Supabase)

Key tables: `profiles`, `courses`, `topics`, `lessons`, `progress`, `user_courses`, `user_lesson_access`

- `profiles` — auto-created by trigger on `auth.users`. Fields: `id`, `full_name`, `email`, `role`, `is_approved`.
- `courses` — has a `sequential_access` flag controlling lesson gating (see Data Fetching above).
- `user_courses` — grants a student access to a course. RLS on `courses` reads through this table.
- `user_lesson_access` — explicit per-lesson grants `(user_id, lesson_id)` used by `useLessonAccess`.
- `topics` → `lessons` form the course hierarchy. Both have `sort_order`, `is_published`, `block_name` (used to group lessons in the sidebar).
- `progress` — one row per `(user_id, lesson_id)` with `completed` boolean.

SQL migrations are in `supabase/` (`001_initial_schema.sql` in `supabase/migrations/`, then numbered `002_` → `015_` at the `supabase/` root, plus `seed.sql`). Several are written to be idempotent and re-runnable.

### Admin API

`POST /api/admin/users` — creates a Supabase auth user + profile. Accepts Bearer token in `Authorization` header as fallback when cookie auth fails. Requires the caller's profile to have `role = "admin"`. Uses the admin client (service role key).

### Specialty Content System

Lesson markdown can include role-specific sections using HTML comment markers:

```
<!-- SPEC:marketer -->...content...<!-- /SPEC -->
```

Valid specialty IDs: `all`, `marketer`, `lawyer`, `doctor`, `manager`, `designer`, `hr`, `accountant`. The `filterContentBySpecialty` function in `src/lib/specialties.ts` strips or shows these blocks. Only lessons with `<!-- SPEC:` markers show the `SpecialtyFilter` UI. The selected specialty is persisted to `localStorage` as `ai-learning-specialty`.

### Prompts Library (`/prompts`)

Entirely static — data lives in `src/lib/prompts-data.ts`. No database queries. Filterable by specialty and category client-side.

### Styling

Tailwind v4 with custom CSS variables defined in `src/app/globals.css` under `@theme inline`. Key design tokens: `--color-accent` (`#A3E635` lime-green), `--color-background` (`#0A0A0B` near-black). Always dark mode — `<html class="dark">`.
