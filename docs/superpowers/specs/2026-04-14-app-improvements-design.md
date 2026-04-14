# Task Manager — Plan for App Improvements

**Date:** 2026-04-14  
**Approach:** Layered sprints — each stage delivers one major feature + one technical improvement + one UX detail  
**Context:** Personal tool first, with potential to grow into a product

---

## Overview

Six sequential stages. Each stage is independently valuable and does not block the next. Stages 1–2 make the app comfortable for daily use. Stages 3–4 add intelligence. Stages 5–6 prepare for growth.

| Stage | Theme | Technical | UX |
|-------|-------|-----------|-----|
| 1 | PWA + Responsive | — | Touch zones |
| 2 | Priorities + Labels | Refactor `tasks/page.tsx` | Empty states |
| 3 | Search | Custom hooks + API pagination | Loading skeletons |
| 4 | Push notifications | Push API + Service Worker | Dark theme |
| 5 | Statistics | Query optimization | SVG charts |
| 6 | Product foundation | Rate limiting + E2E tests | Onboarding |

---

## Stage 1: PWA + Responsive Interface

### Goal
Allow adding and viewing tasks from a mobile phone without opening a browser tab.

### Implementation

**PWA:**
- Add `manifest.json`: app name, icons (192×192, 512×512), `theme_color`, `background_color`, `display: standalone`
- Add Service Worker via `next-pwa` package: cache static assets, enable offline viewing of previously loaded tasks
- Register service worker in `layout.tsx`

**Responsive layout:**
- Bottom navigation bar on mobile (Projects | Tasks | Add): replaces top-level tabs
- Minimum tap target size: 44×44px for all interactive elements
- Add task input fixed above keyboard on mobile (CSS: `position: sticky; bottom: 0`)
- Task list uses full viewport width on mobile, max-w-2xl on desktop

**UX detail:**
- On mobile, "Delete" and "Subtasks" buttons hidden inside a swipe-left gesture on each task row — keeps the list visually clean
- Swipe reveals action buttons with 48px height

### Files affected
- `public/manifest.json` (new)
- `public/icons/` (new — icon assets)
- `src/app/layout.tsx` (add manifest link, service worker registration)
- `src/app/tasks/page.tsx` (responsive classes)
- `next.config.ts` (next-pwa configuration)

---

## Stage 2: Priorities + Labels + Architecture Refactor

### Goal
Make tasks visually distinguishable by importance. Reduce `tasks/page.tsx` from 570 lines into focused, testable units.

### Implementation

**Priorities:**
- 4 levels: `none` | `low` | `medium` | `high`
- Stored as new `priority` field on `Task` model (enum or string with validation)
- UI: colored dot next to task title (gray / blue / yellow / red)
- Sorting: tasks sorted by priority descending within each filter view
- Add priority selector to task creation form and task row (single click cycles through levels)

**Labels:**
- Free-form tags attached to tasks
- New Prisma models:
  ```prisma
  model Tag {
    id     String    @id @default(cuid())
    name   String
    userId String
    user   User      @relation(...)
    tasks  TaskTag[]
  }
  model TaskTag {
    taskId String
    tagId  String
    task   Task @relation(...)
    tag    Tag  @relation(...)
    @@id([taskId, tagId])
  }
  ```
- Tag input on task: type to create or select existing. Displayed as colored pills
- Filter bar gains a tag filter (multi-select dropdown)
- New API routes: `GET/POST /api/tags`, tag assignment handled via `PATCH /api/tasks/[id]`

**Architecture refactor:**
Split `src/app/tasks/page.tsx` into:
- `src/components/tasks/TaskList.tsx` — renders sorted/filtered list
- `src/components/tasks/TaskItem.tsx` — single task row with all interactions
- `src/components/tasks/AddTaskForm.tsx` — creation form with date/recurrence/priority
- `src/components/tasks/SubtaskPanel.tsx` — subtask expand/collapse panel
- `src/components/projects/ProjectTabs.tsx` — project filter tabs with drag targets
- `src/components/filters/DateFilters.tsx` — date filter buttons
- `src/hooks/useTasks.ts` — fetch, optimistic updates, reorder logic
- `src/hooks/useProjects.ts` — fetch, create, rename, delete

`tasks/page.tsx` becomes a thin coordinator (~80 lines) that composes these components.

**UX detail:**
- Empty states: when no tasks match current filter, show an illustration + contextual message
  - No tasks at all: "Добавьте первую задачу"
  - Filter returns nothing: "Нет задач с таким фильтром"
  - Project is empty: "Перетащите задачи в этот проект"

### Files affected
- `prisma/schema.prisma` (priority field, Tag, TaskTag models)
- `prisma/migrations/` (new migration)
- `src/app/api/tasks/route.ts` (include tags)
- `src/app/api/tasks/[id]/route.ts` (priority validation, tag update)
- `src/app/api/tags/route.ts` (new)
- `src/app/tasks/page.tsx` (refactored to thin coordinator)
- `src/components/tasks/` (new directory)
- `src/components/projects/` (new directory)
- `src/components/filters/` (new directory)
- `src/hooks/` (new directory)

---

## Stage 3: Search + Pagination

### Goal
Make the app usable when task count grows into hundreds. Find any task instantly.

### Implementation

**Search:**
- Search input in the page header (not inside a modal)
- Debounce: 300ms before triggering API call
- Server-side: `prisma.task.findMany({ where: { title: { contains: query, mode: "insensitive" }, userId } })`
- Also searches subtask titles: `include: { subtasks: { where: { title: { contains: query } } } }`
- Search results override current project + date filter (show a "Результаты поиска" label)
- Clear button resets to previous filter state

**Pagination (cursor-based):**
- `GET /api/tasks?limit=50&cursor=<taskId>` returns `{ items: Task[], nextCursor: string | null }`
- Client: infinite scroll — `IntersectionObserver` on last task item triggers next page load
- Tasks appended to existing list, not replaced
- `useTasks` hook manages cursor state and deduplication

**Custom hooks:**
- `useTasks(filters)`: encapsulates fetch, pagination, optimistic create/update/delete/reorder
- `useProjects()`: encapsulates fetch, create, rename, delete
- Both hooks expose `isLoading`, `error`, `data` — components only receive these

**UX detail:**
- Loading skeletons: 5 task-shaped gray rectangles shown on initial load and filter change
- Skeleton matches actual task item height to prevent layout shift

### Files affected
- `src/app/api/tasks/route.ts` (cursor pagination, search param)
- `src/hooks/useTasks.ts` (pagination logic)
- `src/hooks/useProjects.ts`
- `src/components/tasks/TaskList.tsx` (infinite scroll observer)
- `src/components/tasks/TaskSkeleton.tsx` (new)
- `src/components/search/SearchInput.tsx` (new)

---

## Stage 4: Push Notifications + Dark Theme

### Goal
Never miss a deadline. Comfortable to use in any lighting.

### Implementation

**Push notifications:**
- Browser Notification API + Service Worker background sync
- Permission prompt: shown when user sets a due date for the first time (not on app open)
- Notification trigger: Service Worker checks every hour for tasks where `dueDate` is within 24 hours and `done === false`
- New Prisma model:
  ```prisma
  model PushSubscription {
    id       String @id @default(cuid())
    userId   String
    endpoint String @unique
    p256dh   String
    auth     String
    user     User   @relation(...)
  }
  ```
- New API routes: `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`
- Server sends notifications via `web-push` package
- Notification content: "Задача «{title}» — завтра дедлайн"

**Dark theme:**
- `globals.css` already has CSS variable structure — extend with full dark palette
- Add theme toggle button in page header (sun/moon icon)
- Preference saved to `localStorage` and applied via `data-theme` attribute on `<html>`
- All components use semantic CSS variables (`var(--color-bg)`, `var(--color-text)`, etc.) — no hardcoded Tailwind color classes
- System preference respected on first visit (`prefers-color-scheme`)

**UX detail:**
- Theme transition: `transition: background-color 200ms, color 200ms` on `body` — no flicker
- Service Worker notification includes task title and a "Открыть" action button that focuses the task

### Files affected
- `prisma/schema.prisma` (PushSubscription model)
- `src/app/api/push/subscribe/route.ts` (new)
- `src/app/api/push/unsubscribe/route.ts` (new)
- `public/sw.js` (Service Worker — notification scheduling)
- `src/app/globals.css` (dark theme variables)
- `src/app/layout.tsx` (theme initialization script)
- `src/components/ThemeToggle.tsx` (new)

---

## Stage 5: Statistics + Query Optimization

### Goal
See patterns in your productivity. Ensure the app stays fast as data grows.

### Implementation

**Statistics page (`/stats`):**
- Cards row: tasks completed this week, completion rate by project (%), current streak (consecutive days with ≥1 completed task), overdue count
- Line chart: completed tasks per day over last 30 days (plain SVG, no chart library)
- Project breakdown table: project name | total tasks | done | % complete
- All data computed server-side via Prisma aggregations in a single API call `GET /api/stats`

**Server aggregations:**
```ts
// Single query pattern — no N+1
prisma.task.groupBy({
  by: ["projectId"],
  where: { userId },
  _count: { id: true, done: true }
})
```

**Query optimization:**
- Add database indexes to `schema.prisma`:
  ```prisma
  @@index([userId, dueDate])
  @@index([userId, order])
  @@index([userId, done])
  ```
- Audit all API routes — ensure no queries run inside loops
- Add `select` to all Prisma queries that currently use default select (avoid fetching unused fields)

**UX detail:**
- SVG line chart: 30 data points, hover shows exact count for that day
- Stats page linked from main nav (bar chart icon)
- Stats computed on server — page loads with data, no client-side spinner

### Files affected
- `src/app/api/stats/route.ts` (new)
- `src/app/stats/page.tsx` (new)
- `prisma/schema.prisma` (indexes)
- All API routes (select optimization)

---

## Stage 6: Product Foundation

### Goal
Prepare the app for other users: protect it from abuse, verify it works, make it discoverable.

### Implementation

**Rate limiting:**
- Middleware (`src/middleware.ts`) counts requests per `userId` (from JWT) per minute using an in-memory sliding window
- Limits: 60 requests/min for general API, 10 requests/min for write operations (POST/PATCH/DELETE)
- Returns 429 with `Retry-After` header on breach
- For production scale: replace in-memory with Redis (Upstash)

**E2E tests (Playwright):**
- Critical paths covered:
  1. Register → login → create task → mark done
  2. Create project → add task to project → drag task to different project
  3. Add due date → verify overdue styling
  4. PWA: verify manifest and service worker registration
- Run in CI on every push to `main`
- `playwright.config.ts` targets local dev server

**Onboarding:**
- 3-step tooltip tour on first login (state in `localStorage: onboarding_done`)
  1. "Это ваши проекты — группируйте задачи" (highlights project tabs)
  2. "Фильтруйте по дате" (highlights date filters)
  3. "Перетащите задачу на проект" (highlights drag handle)
- Skippable at any step, can be replayed from Settings

**Demo mode:**
- "Попробовать без регистрации" button on `/login`
- Creates a temporary session with seed tasks and one project
- Session expires after 24 hours, data deleted by a cleanup cron job
- Demo user cannot change email/password

**Settings page (`/settings`):**
- Change email / change password forms
- Manage push notification subscriptions (list devices, revoke)
- Export all tasks as JSON download
- Delete account (with confirmation modal)

### Files affected
- `src/middleware.ts` (new — rate limiting)
- `tests/` (new — Playwright test directory)
- `playwright.config.ts` (new)
- `.github/workflows/e2e.yml` (new — CI workflow)
- `src/app/login/page.tsx` (demo button)
- `src/app/api/auth/demo/route.ts` (new)
- `src/app/settings/page.tsx` (new)
- `src/app/api/settings/route.ts` (new)
- `src/components/Onboarding.tsx` (new)

---

## Dependency Order

```
Stage 1 (PWA)
    ↓
Stage 2 (Priorities + Refactor) — refactor unblocks all future component work
    ↓
Stage 3 (Search + Pagination) — requires hooks from Stage 2
    ↓
Stage 4 (Notifications + Dark theme) — requires PWA service worker from Stage 1
    ↓
Stage 5 (Stats) — independent, can be moved earlier if desired
    ↓
Stage 6 (Product foundation) — caps everything
```

## What This Explicitly Does Not Include

- Real-time collaboration (websockets, shared tasks between users)
- Native mobile app (React Native / Expo)
- Third-party integrations (Google Calendar, Notion, Slack)
- AI features (task suggestions, auto-prioritization)

These are valid future directions but out of scope for this improvement plan.
