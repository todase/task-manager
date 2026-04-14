# Task Manager — Plan for App Improvements

**Date:** 2026-04-14  
**Approach:** Layered sprints — each stage delivers one major feature + one technical improvement + one UX detail  
**Context:** Personal tool first, with potential to grow into a product

---

## Overview

Seven sequential stages. Each stage is independently valuable and does not block the next. Stages 1–3 make the app comfortable for daily use. Stages 4–5 add intelligence. Stages 6–7 prepare for growth.

| Stage | Theme | Technical | UX |
|-------|-------|-----------|-----|
| 1 | PWA + Responsive | — | Touch zones |
| 2a | Architecture refactor | Split `tasks/page.tsx` + Error Boundaries | Empty states |
| 2b | Labels + Description + Position priority | DB migrations, new API routes | Priority gradient |
| 3 | Search + Pagination + Archive | Custom hooks | Loading skeletons |
| 4 | Push notifications | Single SW (next-pwa) + Upstash Redis rate limiting | Dark theme |
| 5 | Statistics | Query optimization + DB indexes | SVG charts |
| 6 | Product foundation | E2E tests + CI + Password reset | Onboarding + Demo mode |

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

## Stage 2a: Architecture Refactor

### Goal
Split the 570-line `tasks/page.tsx` into focused, independently testable components and hooks. This unblocks all future feature work.

### Implementation

**Component split:**
`src/app/tasks/page.tsx` becomes a thin coordinator (~80 lines) that composes:
- `src/components/tasks/TaskList.tsx` — renders sorted/filtered list, owns `SortableContext`
- `src/components/tasks/TaskItem.tsx` — single task row with all interactions
- `src/components/tasks/AddTaskForm.tsx` — creation form with date/recurrence fields
- `src/components/tasks/SubtaskPanel.tsx` — subtask expand/collapse panel
- `src/components/projects/ProjectTabs.tsx` — project filter tabs with drag targets
- `src/components/filters/DateFilters.tsx` — date filter buttons
- `src/hooks/useTasks.ts` — fetch, optimistic create/update/delete/reorder
- `src/hooks/useProjects.ts` — fetch, create, rename, delete

Both hooks expose `{ data, isLoading, error }` — components receive only these, no raw fetch calls in components.

**Error Boundaries:**
- `src/components/ErrorBoundary.tsx` — generic React Error Boundary component
- Wrap `<TaskList>` and `<ProjectTabs>` independently: a crash in one does not take down the other
- Error state shows a "Что-то пошло не так — перезагрузить" button

**UX detail:**
- Empty states: when no tasks match current filter, show contextual message + illustration:
  - No tasks at all: "Добавьте первую задачу"
  - Filter returns nothing: "Нет задач с таким фильтром"
  - Project is empty: "Перетащите задачи в этот проект"

### Files affected
- `src/app/tasks/page.tsx` (refactored to thin coordinator)
- `src/components/tasks/` (new directory with 4 components)
- `src/components/projects/ProjectTabs.tsx` (new)
- `src/components/filters/DateFilters.tsx` (new)
- `src/components/ErrorBoundary.tsx` (new)
- `src/hooks/useTasks.ts` (new)
- `src/hooks/useProjects.ts` (new)

---

## Stage 2b: Labels + Task Description + Position-Based Priority

### Goal
Organize tasks by topic with labels. Add space for notes. Make the list order meaningful by surfacing implicit priority.

### Implementation

**Position-based priority (no separate priority field):**

The existing `order` field (0, 1, 2…) already encodes task importance — the higher the task in the list, the more important it is. Drag-and-drop is the only way to change priority. There is no dropdown or separate "priority" field.

Priority score is a derived display value: `priorityScore = 1 - (order / Math.max(totalTasks - 1, 1))`, ranging from 1.0 (top of list) to 0.0 (bottom).

Visual representation — choose one at implementation time:
- **Option A (gradient bar):** 3px left border on each task, color interpolated from `#3b82f6` (top, score ~1.0) to `#e5e7eb` (bottom, score ~0.0). No text, purely visual. Communicates urgency at a glance.
- **Option B (score badge):** Small gray badge showing `0.87` on hover/focus. Useful for power users who want to reason about relative importance numerically.

Both options require zero database changes — `order` is already stored. The score is computed client-side in `useTasks`.

Behavior:
- When a new task is created it is inserted at the top of the list (`order: 0`, existing tasks shift +1), giving it the highest priority by default
- The user drags tasks down to deprioritize them
- Date filters, project filters, and search do not affect the priority score — it is always relative to the full unfiltered list position

**Labels:**
- Free-form tags attached to tasks
- New Prisma models:
  ```prisma
  model Tag {
    id     String    @id @default(cuid())
    name   String
    color  String    @default("#6b7280")
    userId String
    user   User      @relation(fields: [userId], references: [id])
    tasks  TaskTag[]
    @@unique([name, userId])
  }

  model TaskTag {
    taskId String
    tagId  String
    task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
    tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
    @@id([taskId, tagId])
  }
  ```
- Tag input on task: type to create or select existing tags. Displayed as small colored pills
- Filter bar gains a tag filter (multi-select dropdown, above date filters)
- New API routes: `GET /api/tags`, `POST /api/tags`
- Tag assignment/removal handled via `PATCH /api/tasks/[id]` with `{ tagIds: string[] }`

**Task description:**
- New optional field `description: String?` on `Task` model
- Displayed as expandable textarea below the task title in `TaskItem`
- Collapsed by default (click pencil icon to expand)
- Saved on blur or Ctrl+Enter
- Markdown not supported in this stage — plain text only
- Shown in full in subtask panel when open

### Files affected
- `prisma/schema.prisma` (Tag, TaskTag models, Task.description field)
- `prisma/migrations/` (new migration)
- `src/app/api/tasks/route.ts` (include tags, insert new task at order 0)
- `src/app/api/tasks/[id]/route.ts` (description update, tag assignment)
- `src/app/api/tags/route.ts` (new)
- `src/components/tasks/TaskItem.tsx` (priority bar/badge, tag pills, description area)
- `src/components/tasks/AddTaskForm.tsx` (tag selector)
- `src/components/filters/TagFilter.tsx` (new)
- `src/hooks/useTasks.ts` (priorityScore derivation)

---

## Stage 3: Search + Pagination + Completed Tasks Archive

### Goal
Make the app usable when task count grows into hundreds. Find any task instantly. Keep the active list clean.

### Implementation

**Search:**
- Search input in the page header (not inside a modal)
- Debounce: 300ms before triggering API call
- Server-side: `prisma.task.findMany({ where: { title: { contains: query, mode: "insensitive" }, userId } })`
- Also searches subtask titles and description: `include: { subtasks: { where: { title: { contains: query } } } }`
- Search results override current project + date filter; label filter still applies
- "Результаты поиска для «{query}»" label shown above results
- Clear button (×) resets to previous filter state

**Pagination:**

Two options — choose at implementation time based on typical usage:

- **Option A (200-task limit):** Load all tasks up to 200 in a single request. DnD works freely across all tasks. Simple to implement. Sufficient for a personal tool.
- **Option B (sliding window):** Load current page + one page before + one page after (3 pages × 50 = 150 tasks in memory). DnD works within the window. On scroll to edge, drop the far page and load the next. More complex but handles unlimited tasks.

Recommendation: **start with Option A**. Switch to Option B only if a user hits the 200 limit. The `useTasks` hook interface stays the same for both — the switch is internal.

API: `GET /api/tasks?limit=200` (Option A) or `GET /api/tasks?limit=50&cursor=<taskId>` (Option B)  
DnD constraint: task reorder sends only changed positions to `/api/tasks/reorder`, not the full list.

**Completed tasks archive:**
- New route `/archive` — lists all tasks where `done === true`, ordered by completion date descending
- "Выполненные" tab in main nav (or link in header)
- Bulk actions: "Очистить архив" (hard delete all), "Восстановить" per task (sets `done: false`, moves back to active list)
- API: `GET /api/tasks?done=true` (reuse existing endpoint with new filter param)
- Active list (`/tasks`) shows only `done === false` tasks — no more clutter from completed items

**Custom hooks (finalized in this stage):**
- `useTasks(filters)`: encapsulates fetch, pagination, optimistic create/update/delete/reorder
- `useProjects()`: encapsulates fetch, create, rename, delete
- Both hooks expose `{ data, isLoading, error, loadMore? }`

**UX detail:**
- Loading skeletons: 5 task-shaped gray rectangles on initial load and filter change
- Skeleton matches actual `TaskItem` height to prevent layout shift
- Archive page has its own skeleton

### Files affected
- `src/app/api/tasks/route.ts` (limit param, done filter param)
- `src/app/archive/page.tsx` (new)
- `src/hooks/useTasks.ts` (pagination, archive mode)
- `src/components/tasks/TaskList.tsx` (infinite scroll observer for Option B)
- `src/components/tasks/TaskSkeleton.tsx` (new)
- `src/components/search/SearchInput.tsx` (new)

---

## Stage 4: Push Notifications + Dark Theme

### Goal
Never miss a deadline. Comfortable to use in any lighting.

### Implementation

**Push notifications (integrated into next-pwa Service Worker):**

Stage 1 sets up the SW via `next-pwa`. Notification logic must be added to the **same SW**, not a separate file — only one SW can be active per origin.

Implementation:
- Extend the next-pwa SW config to include custom notification handler code
- Permission prompt: shown when user sets a due date for the first time (not on app open)
- Notification check: server-side cron job (Vercel Cron) runs hourly, finds tasks where `dueDate` is within 24 hours and `done === false`, sends push via `web-push` package
- New Prisma model:
  ```prisma
  model PushSubscription {
    id        String   @id @default(cuid())
    userId    String
    endpoint  String   @unique
    p256dh    String
    auth      String
    createdAt DateTime @default(now())
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  ```
- New API routes: `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`
- Notification content: "Задача «{title}» — завтра дедлайн"
- Notification includes "Открыть" action button that deep-links to the task

**Rate limiting (Upstash Redis — from day one):**
- `src/middleware.ts` using `@upstash/ratelimit` + `@upstash/redis`
- In-memory rate limiting does not work on Vercel (new process per cold start)
- Limits: 60 requests/min for general API, 10 requests/min for write operations
- Returns 429 with `Retry-After` header on breach
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` added to env vars

**Dark theme:**
- `globals.css` already has CSS variable structure — extend with full dark palette
- Use Tailwind `dark:` variant throughout (consistent with Tailwind v4 approach), not manual `var()` overrides
- Add theme toggle button in page header (sun/moon icon)
- Preference saved to `localStorage`, system preference (`prefers-color-scheme`) respected on first visit
- Script tag in `layout.tsx` sets `class="dark"` on `<html>` before first paint to prevent flash

**UX detail:**
- Theme transition: `transition: background-color 200ms, color 200ms` on `body`
- SW notification action button opens the app and scrolls to the specific task

### Files affected
- `prisma/schema.prisma` (PushSubscription model)
- `src/app/api/push/subscribe/route.ts` (new)
- `src/app/api/push/unsubscribe/route.ts` (new)
- `src/app/api/cron/notifications/route.ts` (new — Vercel Cron handler)
- `vercel.json` (cron schedule)
- `next.config.ts` (next-pwa custom SW worker code injection)
- `src/app/globals.css` (dark theme variables)
- `src/app/layout.tsx` (theme init script, no-flash)
- `src/components/ThemeToggle.tsx` (new)
- `src/middleware.ts` (new — Upstash rate limiting)

---

## Stage 5: Statistics + Query Optimization

### Goal
See patterns in your productivity. Ensure the app stays fast as data grows.

### Implementation

**Statistics page (`/stats`):**
- Cards row: tasks completed this week, completion rate by project (%), current streak (consecutive days with ≥1 completed task), overdue count
- Line chart: completed tasks per day over last 30 days (plain SVG, no chart library)
- Project breakdown table: project name | total tasks | done | % complete
- All data computed server-side, single API call `GET /api/stats`

**Server aggregations (correct Prisma patterns):**
```ts
// Separate counts — groupBy cannot count boolean field values directly
const [total, done, overdue, byProject, daily] = await Promise.all([
  prisma.task.count({ where: { userId } }),
  prisma.task.count({ where: { userId, done: true } }),
  prisma.task.count({ where: { userId, done: false, dueDate: { lt: new Date() } } }),
  prisma.task.groupBy({
    by: ["projectId"],
    where: { userId },
    _count: { _all: true },
  }),
  prisma.task.findMany({
    where: { userId, done: true, updatedAt: { gte: thirtyDaysAgo } },
    select: { updatedAt: true },
  }),
])
```

**Query optimization:**
- Add database indexes to `schema.prisma`:
  ```prisma
  // On Task model:
  @@index([userId, dueDate])
  @@index([userId, order])
  @@index([userId, done])
  @@index([userId, createdAt])
  ```
- Add `select` to all Prisma queries that currently use default select (avoid fetching unused fields)
- Audit all API routes for queries inside loops — none found currently, but validate after Stage 2b adds tag queries

**UX detail:**
- SVG line chart: 30 data points, tooltip on hover shows exact count
- Stats page linked from main nav (bar chart icon)
- Page is a Next.js Server Component — loads with data, no client spinner

### Files affected
- `src/app/api/stats/route.ts` (new)
- `src/app/stats/page.tsx` (new — Server Component)
- `prisma/schema.prisma` (indexes)
- All API routes (select optimization audit)

---

## Stage 6: Product Foundation

### Goal
Prepare the app for other users: protect it from abuse, verify it works, make it accessible to new users.

### Implementation

**E2E tests (Playwright):**
- Critical paths:
  1. Register → login → create task → mark done → verify in archive
  2. Create project → add task to project → drag task to different project
  3. Add due date → verify overdue styling → verify archive behavior
  4. Labels: create tag → assign to task → filter by tag
  5. PWA: verify manifest endpoint and service worker registration
- Run in GitHub Actions CI on every push to `main`
- CI spins up local dev server + test PostgreSQL database (Docker)
- `playwright.config.ts` with baseURL from env var

**Password reset flow:**
- "Забыли пароль?" link on `/login`
- `/forgot-password` page: email input → sends reset link
- `/reset-password?token=<uuid>` page: new password input
- New Prisma model:
  ```prisma
  model PasswordResetToken {
    id        String   @id @default(cuid())
    userId    String
    token     String   @unique @default(cuid())
    expiresAt DateTime
    used      Boolean  @default(false)
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  ```
- Email sent via Resend (or Nodemailer + SMTP). Token expires in 1 hour
- New API routes: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

**Onboarding:**
- 3-step tooltip tour on first login (`localStorage: onboarding_done`)
  1. "Это ваши проекты — группируйте задачи" (highlights project tabs)
  2. "Перетащите задачу выше — повысьте приоритет" (highlights drag handle, explains position priority)
  3. "Фильтруйте по дате или метке" (highlights filter bar)
- Skippable at any step, replayable from Settings

**Demo mode:**
- "Попробовать без регистрации" button on `/login`
- Creates temporary session with seed tasks, one project, and sample labels
- Session expires after 24 hours; data deleted by Vercel Cron cleanup job
- Demo user cannot change email/password or enable push notifications

**Settings page (`/settings`):**
- Change email / change password forms
- Manage push notification subscriptions (list devices, revoke per device)
- Export all tasks as JSON download (`GET /api/settings/export`)
- Delete account with confirmation modal (cascades all data)

### Files affected
- `prisma/schema.prisma` (PasswordResetToken model)
- `tests/` (new — Playwright test directory)
- `playwright.config.ts` (new)
- `.github/workflows/e2e.yml` (new)
- `src/app/login/page.tsx` (forgot password link, demo button)
- `src/app/forgot-password/page.tsx` (new)
- `src/app/reset-password/page.tsx` (new)
- `src/app/api/auth/forgot-password/route.ts` (new)
- `src/app/api/auth/reset-password/route.ts` (new)
- `src/app/api/auth/demo/route.ts` (new)
- `src/app/api/cron/cleanup-demo/route.ts` (new)
- `src/app/settings/page.tsx` (new)
- `src/app/api/settings/route.ts` (new)
- `src/app/api/settings/export/route.ts` (new)
- `src/components/Onboarding.tsx` (new)

---

## Dependency Order

```
Stage 1 (PWA + Responsive)
    ↓
Stage 2a (Architecture refactor) — unblocks all future component and hook work
    ↓
Stage 2b (Labels + Description + Priority visual) — builds on clean component structure
    ↓
Stage 3 (Search + Pagination + Archive) — uses hooks from 2a, description from 2b in search
    ↓
Stage 4 (Notifications + Dark theme + Rate limiting) — extends SW from Stage 1
    ↓
Stage 5 (Stats) — independent after Stage 2b, can be moved earlier
    ↓
Stage 6 (Product foundation) — caps everything, tests all prior stages
```

---

## Environment Variables (cumulative)

| Variable | Added in | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | existing | PostgreSQL connection |
| `NEXTAUTH_SECRET` | existing | JWT signing |
| `NEXTAUTH_URL` | existing | Canonical URL |
| `UPSTASH_REDIS_REST_URL` | Stage 4 | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Stage 4 | Rate limiting |
| `VAPID_PUBLIC_KEY` | Stage 4 | Web push |
| `VAPID_PRIVATE_KEY` | Stage 4 | Web push |
| `RESEND_API_KEY` | Stage 6 | Password reset emails |

---

## What This Explicitly Does Not Include

- Real-time collaboration (websockets, shared tasks between users)
- Native mobile app (React Native / Expo)
- Third-party integrations (Google Calendar, Notion, Slack)
- AI features (task suggestions, auto-prioritization)

These are valid future directions but out of scope for this improvement plan.
