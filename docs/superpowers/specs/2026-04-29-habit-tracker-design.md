# Habit Tracker — Design Spec

**Date:** 2026-04-29  
**Status:** Approved

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
  date         DateTime        @default(now())
  reflectionId String?         @unique
  reflection   TaskReflection? @relation(fields: [reflectionId], references: [id])
  createdAt    DateTime        @default(now())
}

model TaskReflection {
  // existing fields unchanged
  habitLog HabitLog?
}
```

### Types (`src/types/index.ts`)

- `Task` gains `isHabit: boolean`
- New type `HabitLog`: `{ id, taskId, date, reflection?: Pick<TaskReflection, 'mood' | 'difficulty'> }`

## API

### Modified endpoints

**`PATCH /api/tasks/[id]`** — when `done: true` on a task with `isHabit: true`:
1. Creates a `HabitLog` record with the current date
2. Does NOT set `completedAt` (existing behavior for recurring tasks)
3. Returns `requiresReflection: true` in the response body so the client opens `ReflectionModal`

**`POST /api/tasks/[id]/reflection`** — accepts optional `habitLogId` in the request body. When present, sets `HabitLog.reflectionId` to link the reflection.

**`GET /api/tasks`** — includes `isHabit` in task response. Supports `?isHabit=true` filter for the `/habits` page.

### New endpoint

**`GET /api/tasks/[id]/habit-logs`** — returns the last 90 days of completion history:
```json
{
  "logs": [
    { "id": "...", "date": "2026-04-29T...", "reflection": { "mood": "energized", "difficulty": 2 } }
  ]
}
```

## Components

### New components

**`components/habits/HabitSection.tsx`**  
Collapsible block rendered at the top of the tasks page (B2 layout). Shows today's habits with:
- Checkbox to mark done
- 7-day mini heatmap
- Streak badge (daily habits only)
- "Details" link to `/habits`

Collapsed state: single header row showing "Habits" + count badge.

**`components/habits/HabitCard.tsx`**  
Full card for the `/habits` page (A2 layout). Shows:
- 30-day calendar heatmap
- Streak or completion rate depending on recurrence type
- Mood trend as emoji sequence

Tap to expand details.

### Modified components

**`TaskList.tsx`** — renders `<HabitSection habits={habits} />` before the sortable task list. Habits are filtered from the already-cached tasks array — no extra fetch.

**`AddTaskForm.tsx`** — adds an "Is a habit" toggle that appears only when a recurrence is selected. Sets `isHabit: true` on submit.

**`ReflectionModal.tsx`** — no changes. `TaskList` calls it for habits the same way as regular tasks. After save, passes `habitLogId` to the reflection POST endpoint to link the records.

### New page

**`app/pages/habits/page.tsx`** — list of `HabitCard` components for all user habits. Accessible from `BurgerMenu`.

## Hooks

**`useHabits` (`hooks/useHabits.ts`)**  
Filters `isHabit: true` tasks from the existing `["tasks"]` cache. No separate query.

**`useHabitLogs` (`hooks/useHabitLogs.ts`)**  
`useQuery` with key `["habitLogs", taskId]`. Fetches `/api/tasks/[id]/habit-logs`. Called lazily — only on the `/habits` page when a card is opened.

**`useHabitStats` (`hooks/useHabitStats.ts`)**  
Pure function (not a hook). Accepts `HabitLog[]` and returns:
```ts
{ streak: number; completionRate: number; moodTrend: Mood[] }
```
- **Streak**: only for `recurrence === "daily"`. Walk dates backward from today; stop at first missing day.
- **Completion rate**: for all recurrence types. Count logs in the last 30 days (daily), 12 weeks (weekly), or 12 months (monthly) divided by expected occurrences.
- **Mood trend**: last 10 reflections with a mood value, in chronological order.

**`useTaskMutations.ts`** (modified)  
`toggleTask` mutation: after the server responds with `requiresReflection: true`, sets local state to open `ReflectionModal`. Optimistic update unchanged.

## User flows

### Marking a habit done
1. User taps checkbox in `HabitSection`
2. Optimistic update marks it done in the UI
3. `PATCH /api/tasks/[id]` creates `HabitLog`, reschedules task (existing behavior), returns `requiresReflection: true`
4. `ReflectionModal` opens
5. User fills in mood/difficulty/notes (or skips)
6. `POST /api/tasks/[id]/reflection` saves reflection and links it to the `HabitLog`

### Creating a habit
1. User opens `AddTaskForm`, sets a recurrence (daily/weekly/monthly)
2. "Is a habit" toggle appears — user enables it
3. Task created with `isHabit: true`; appears in `HabitSection` on next render

### Viewing statistics
1. User taps "Details" in `HabitSection` or navigates via `BurgerMenu` → Habits
2. `/habits` page loads all habit tasks
3. Tapping a `HabitCard` triggers `useHabitLogs` fetch for that task
4. `useHabitStats` computes streak/rate/trend from logs
5. Full heatmap and mood trend rendered

## Streak rules

- **Daily habits**: streak = consecutive days with a `HabitLog` ending today (or yesterday if today not yet done). Missing one day resets to 0.
- **Weekly habits**: no streak. Show completion rate for last 12 weeks.
- **Monthly habits**: no streak. Show completion rate for last 12 months.

## Out of scope

- Habit grouping / categories
- Reminders / push notifications
- Habit templates
- Social / sharing features
- Grace period for streak (missing one day does not protect streak)
