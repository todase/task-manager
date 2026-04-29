# Habit Tracker — Design Spec

**Date:** 2026-04-29  
**Status:** Approved (rev 2 — post code review)

## Overview

Add a habit tracker to the existing task manager. Habits are recurring tasks with `isHabit: true` — no separate data entity. Completion history is stored in a new `HabitLog` model. Statistics (streak, completion rate, mood trend) are computed client-side from logs.

## Data Model

### Schema changes

```prisma
model Task {
  // existing fields unchanged
  isHabit   Boolean    @default(false)
  habitLogs HabitLog[]
}

model HabitLog {
  id           String          @id @default(cuid())
  taskId       String
  task         Task            @relation(fields: [taskId], references: [id], onDelete: Cascade)
  date         DateTime        // UTC midnight of the completion day — set explicitly, not @default(now())
  reflectionId String?         @unique
  reflection   TaskReflection? @relation(fields: [reflectionId], references: [id])
  createdAt    DateTime        @default(now())
}

model TaskReflection {
  // existing fields unchanged
  habitLog HabitLog?
}
```

**Constraint:** `isHabit = true` requires `recurrence IS NOT NULL`. Enforced server-side in `PATCH /api/tasks/[id]` and `POST /api/tasks` — return 400 if `isHabit: true` and `recurrence` is null.

**Note on `date`:** Always stored as UTC midnight (`new Date(Date.UTC(y, m, d))`). Streak and completion-rate logic must compare dates at UTC day granularity, not timestamp precision.

### Types (`src/types/index.ts`)

- `Task` gains `isHabit: boolean`
- New type:
```ts
type HabitLog = {
  id: string
  taskId: string
  date: string // ISO date string, UTC midnight
  reflection?: Pick<TaskReflection, 'mood' | 'difficulty'>
}
```

## API

### Modified endpoints

**`PATCH /api/tasks/[id]`** — when the incoming body includes `done: true` on a task with `isHabit: true`, inside the existing recurring-task early-return branch:
1. Compute `date` as UTC midnight of today
2. Create `HabitLog` and update the task's `dueDate` in a single Prisma transaction so a partial failure cannot leave the task rescheduled without a log
3. Return the updated task as usual — no `requiresReflection` flag needed

The client opens `ReflectionModal` unconditionally whenever `isHabit: true && !task.done` (matching the existing pattern for regular task reflections). This is simpler than a server-driven flag.

**`POST /api/tasks/[id]/reflection`** — accepts optional `habitLogId: string` in the request body. When present, updates `HabitLog.reflectionId = newReflection.id` in the same transaction. Returns 400 if `habitLogId` does not belong to the authenticated user's task.

**`GET /api/tasks`** — includes `isHabit` in task response. Supports `?isHabit=true` query param. Requires updates to:
- `TaskFilters` type in `src/hooks/taskUtils.ts` — add `isHabit?: boolean`
- `buildTasksUrl` in `src/hooks/taskUtils.ts` — append `&isHabit=true` when set
- The API route handler — add `isHabit` to the Prisma `where` clause

### New endpoint

**`GET /api/tasks/[id]/habit-logs`** — returns the last 90 days of completion history. Auth: validates `task.userId === session.user.id`, returns 403 otherwise.

```json
{
  "logs": [
    { "id": "...", "date": "2026-04-29T00:00:00.000Z", "reflection": { "mood": "energized", "difficulty": 2 } }
  ]
}
```

## Components

### New components

**`components/habits/HabitSection.tsx`**  
Collapsible block rendered at the top of the tasks page (B2 layout). Props: `habits: Task[], onToggle: (task: Task) => void`. Shows today's habits with:
- Checkbox that calls `onToggle(habit)` — same mutation as TaskList uses
- 7-day mini heatmap (needs `useHabitLogs` or a pre-fetched summary — see Hooks)
- Streak badge (daily habits only)
- "Details" link to `/habits`

Collapsed state: single header row showing "Привычки" + count badge. `onToggle` is passed as a prop from `TaskList`.

**`components/habits/HabitCard.tsx`**  
Full card for the `/habits` page (A2 layout). Shows:
- 30-day calendar heatmap
- Streak or completion rate depending on recurrence type
- Mood trend as emoji sequence

Tap to expand details (loads logs lazily via `useHabitLogs`).

### Modified components

**`TaskList.tsx`** — renders `<HabitSection habits={habits} onToggle={onToggle} />` before the sortable task list. `habits` = tasks filtered by `isHabit: true` from the existing cached list. `onToggle` = the same `toggleTask` mutation already used by `TaskItem`.

**`AddTaskForm.tsx`** — adds an "Is a habit" toggle that appears only when a recurrence is selected. Sets `isHabit: true` on submit.

**`ReflectionModal.tsx`** — two changes:
1. Add optional prop `habitLogId?: string`. When present, passes it to the reflection POST endpoint.
2. Hide the "next step" field when `habitLogId` is present — creating a new task on every habit completion is not useful.

### New page

**`src/app/habits/page.tsx`** — list of `HabitCard` components for all user habits. Accessible from `BurgerMenu`.

## Hooks

**`useHabits` (`hooks/useHabits.ts`)**  
Filters `isHabit: true` tasks from the unfiltered `["tasks", {}]` cache entry (the one fetched with no date/project filters). Falls back to a dedicated `GET /api/tasks?isHabit=true` query if that entry is not populated (e.g. user opens `/habits` directly).

**`useHabitLogs` (`hooks/useHabitLogs.ts`)**  
`useQuery` with key `["habitLogs", taskId]`. Fetches `/api/tasks/[id]/habit-logs`. Called lazily — only on the `/habits` page when a card is opened.

**`computeHabitStats` (`hooks/habitStats.ts`)**  
Pure function (no `use` prefix to avoid React lint warnings). Accepts `HabitLog[]` and `recurrence: string`, returns:
```ts
{ streak: number; completionRate: number; moodTrend: Mood[] }
```
- **Streak**: only for `recurrence === "daily"`. Walk dates backward from today (UTC midnight); stop at first day with no matching log. "Today" = current UTC date; if no log exists for today the streak still counts from yesterday.
- **Completion rate**: count logs in the last 30 calendar days (daily), 12 ISO weeks (weekly), or 12 calendar months (monthly) divided by expected occurrences.
- **Mood trend**: last 10 `HabitLog` entries that have a non-null `reflection.mood`, in chronological order.

**`useTaskMutations.ts`** (modified)  
No change to mutation logic. `TaskList` and `HabitSection` open `ReflectionModal` unconditionally in their `onToggle` handlers when `isHabit: true && !task.done`, exactly as today's code opens it for regular tasks. The `habitLogId` for the `ReflectionModal` prop is obtained from the mutation's settled response (the updated task includes the new `HabitLog` id — add it to the PATCH response).

## User flows

### Marking a habit done
1. User taps checkbox in `HabitSection`
2. `onToggle(habit)` called — optimistic update marks it done briefly (will revert to `done: false` after server response since it's recurring)
3. `PATCH /api/tasks/[id]` creates `HabitLog` + reschedules task in one transaction; returns updated task including `latestHabitLogId`
4. `TaskList`/`HabitSection` opens `ReflectionModal` with `habitLogId={latestHabitLogId}`
5. User fills in mood/difficulty/notes (or skips)
6. `POST /api/tasks/[id]/reflection` saves reflection, links it to the `HabitLog`, does NOT create a next-step task

### Creating a habit
1. User opens `AddTaskForm`, sets a recurrence (daily/weekly/monthly)
2. "Is a habit" toggle appears — user enables it
3. Task created with `isHabit: true`; appears in `HabitSection` on next render

### Viewing statistics
1. User taps "Details" in `HabitSection` or navigates via `BurgerMenu` → Привычки
2. `src/app/habits/page.tsx` loads all habit tasks via `useHabits`
3. Tapping a `HabitCard` triggers `useHabitLogs` fetch for that task
4. `computeHabitStats` computes streak/rate/trend from logs
5. Full heatmap and mood trend rendered

## Streak rules

- **Daily habits**: streak = consecutive UTC days with a `HabitLog` ending today or yesterday. Missing one full UTC day resets to 0.
- **Weekly habits**: no streak. Show completion rate for last 12 ISO weeks.
- **Monthly habits**: no streak. Show completion rate for last 12 calendar months.

## Out of scope

- Habit grouping / categories
- Reminders / push notifications
- Habit templates
- Social / sharing features
- Grace period for streak (missing one day resets streak)
