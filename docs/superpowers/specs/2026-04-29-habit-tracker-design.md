# Habit Tracker — Design Spec

**Date:** 2026-04-29  
**Status:** Approved (rev 3 — second code review pass)

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

  @@unique([taskId, date])  // one log per habit per UTC day; tap-twice is idempotent
  @@index([taskId, date])
}

model TaskReflection {
  // existing fields unchanged
  habitLog HabitLog?
}
```

**Constraint:** `isHabit = true` requires `recurrence IS NOT NULL`. Enforced server-side in `PATCH /api/tasks/[id]` and `POST /api/tasks` — return 400 if `isHabit: true` and `recurrence` is null.

**Note on `date`:** Always stored as UTC midnight (`new Date(Date.UTC(y, m, d))`). Streak and completion-rate logic must compare dates at UTC day granularity, not timestamp precision. Users in UTC+N timezones completing a habit late at night will see the log attributed to the UTC day — acceptable for v1.

**Note on `TaskReflection` dual-use:** Habit reflections set both `TaskReflection.taskId` (the habit task) and `HabitLog.reflectionId`. A query "all reflections for task X" therefore includes habit-completion reflections. This is intentional — the archive page can display them as before.

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
2. Upsert `HabitLog` (key `[taskId, date]` — idempotent on double-tap) and update the task's `dueDate` in a single Prisma transaction
3. Return the updated task as usual — no extra fields, no `requiresReflection` flag

The client opens `ReflectionModal` synchronously off the click whenever `isHabit: true && !task.done` (same fire-and-forget pattern as today's regular-task reflection in `TaskItem.tsx:157-160`). The client passes only `taskId` to the modal — no `habitLogId`. This preserves the snappy UX and avoids changing the `onToggle` contract.

**`POST /api/tasks/[id]/reflection`** — server-side resolves the linkage:
1. Create the `TaskReflection` as today
2. If the task has `isHabit: true`, find the most recent `HabitLog` for that task (`orderBy: { date: 'desc' }, take: 1`) and set its `reflectionId` to the new reflection. This works because the PATCH that opened the modal already created/upserted the log for today before the modal appeared.
3. **If `isHabit: true`, ignore `nextStepTitle`** — do not create a next-step task. (Server-enforced, not just client-hidden.)

All three operations run in one transaction.

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

**`AddTaskForm.tsx`** — adds an "Is a habit" toggle that appears only when a recurrence is selected. If the user clears the recurrence selection, `isHabit` is silently reset to `false` and the toggle is hidden. Sets `isHabit: true` on submit.

**`ReflectionModal.tsx`** — one change: add optional prop `isHabit?: boolean`. When `true`, hide the "next step" field. The modal does not need `habitLogId` — server resolves linkage from `taskId` + most-recent log.

### New page

**`src/app/habits/page.tsx`** — list of `HabitCard` components for all user habits. Accessible from `BurgerMenu`.

## Hooks

**`useHabits` (`hooks/useHabits.ts`)**  
Always runs `useQuery({ queryKey: ["tasks", { isHabit: true }], ... })` and lets TanStack Query dedupe. Don't try to filter from another cache entry — explicit query is simpler and avoids stale-cache edge cases.

**`useHabitLogs` (`hooks/useHabitLogs.ts`)**  
`useQuery` with key `["habitLogs", taskId]`. Fetches `/api/tasks/[id]/habit-logs`. Called lazily — only on the `/habits` page when a card is opened.

**`computeHabitStats` (`hooks/habitStats.ts`)**  
Pure function (no `use` prefix to avoid React lint warnings). Accepts `HabitLog[]` and `recurrence: string`, returns:
```ts
{ streak: number; completionRate: number; moodTrend: Mood[] }
```
- **Streak**: only for `recurrence === "daily"`. Walk dates backward from today (UTC midnight); stop at first day with no matching log. "Today" = current UTC date; if no log exists for today the streak still counts from yesterday.
- **Completion rate**: count logs divided by expected occurrences. Window: last 30 days (daily), 12 ISO weeks (weekly), or 12 calendar months (monthly). Denominator is capped by periods elapsed since `task.createdAt` — a 5-day-old daily habit divides by 5, not 30.
- **Mood trend**: last 10 `HabitLog` entries that have a non-null `reflection.mood`, in chronological order.

**`useTaskMutations.ts`** — no changes to mutation logic. `onToggle` contract stays `(task: Task) => void` (fire-and-forget). `TaskItem` and `HabitSection` open `ReflectionModal` synchronously off the click, passing `isHabit={task.isHabit}`.

## User flows

### Marking a habit done
1. User taps checkbox in `HabitSection`
2. Two things happen on the click, in parallel:
   - `onToggle(habit)` fires the PATCH (optimistic update flashes `done: true`; reverts to `false` after the recurring-reschedule response, same as any recurring task today)
   - `ReflectionModal` opens with `taskId={habit.id}` and `isHabit={true}`
3. Server-side, PATCH upserts `HabitLog` (key `[taskId, today_utc]`) + shifts `dueDate` in one transaction
4. User fills in mood/difficulty/notes (or skips)
5. `POST /api/tasks/[id]/reflection` runs — server creates reflection, finds the most recent `HabitLog` for the task, links them, ignores any `nextStepTitle`

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
