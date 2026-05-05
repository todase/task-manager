# Task Form Redesign + Habit Frequency + Estimated Time

**Date:** 2026-05-05  
**Status:** Approved

## Overview

Four linked improvements:
1. Task creation form visual redesign to match ReflectionModal
2. Habit creation made explicit with always-visible toggle and inline period picker
3. Weekly habit frequency target ("N times per week")
4. Estimated time on tasks, shown in reflection as plan vs. fact

---

## 1. Data Model

Two new optional fields on `Task` in `prisma/schema.prisma`:

```prisma
estimatedMinutes Int?  // expected task duration; set at creation
weeklyTarget     Int?  // weekly completion target (1–7); only meaningful when recurrence="weekly"
```

One `prisma migrate dev` migration. Existing tasks unaffected (both fields nullable).

Propagate to:
- `src/types/index.ts` — add `estimatedMinutes: number | null` and `weeklyTarget: number | null` to `Task`
- `src/hooks/taskUtils.ts` — add `estimatedMinutes?: number` and `weeklyTarget?: number` to `CreateTaskInput`
- `src/app/api/tasks/route.ts` POST — read and persist both fields; validate `weeklyTarget` is 1–7 when present

---

## 2. AddTaskForm Redesign (`src/components/tasks/AddTaskForm.tsx`)

### Visual style

Replace bottom-sheet / centered hybrid with always-centered modal identical to `ReflectionModal`:

```
backdrop: fixed inset-0 bg-black/40 backdrop-blur-sm z-50
card:     bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm mx-4 flex flex-col gap-4
```

Remove the mobile drag-handle and the `md:` responsive breakpoints.

### Field layout (top to bottom)

1. **Header row** — «Новая задача» + ✕ button
2. **Title input** — as-is
3. **Estimated time** — `[ — ] мин · ожидаемое время`, number input (optional, min 1, max 1440); empty = not set
4. **Pill buttons row** — Дата / Метки / Проект (recurrence pill removed — now lives in habit block)
5. **Habit block** — always visible (see below)
6. **Create button** — «Создать задачу»

### Habit block

Always rendered below the pill row.

**Toggle OFF state:**
```
🔁  Привычка                    [ toggle off ]
    повторяющаяся задача
```
Purple border/bg hint, same card style as ReflectionModal difficulty buttons.

**Toggle ON — period picker expands:**
```
🔁  Привычка                    [ toggle on ]

    [ День ]  [ Неделя ]  [ Месяц ]
```
Auto-selects «День» on first enable. Selecting «Месяц» or «День» sets `recurrence` and clears `weeklyTarget`.

**Toggle ON + Неделя selected:**
```
🔁  Привычка                    [ toggle on ]

    [ День ]  [ Неделя* ]  [ Месяц ]
    [ − ]  3  [ + ]  раз в неделю
```
Counter defaults to 3, range 1–7. Stores as `weeklyTarget`.

On submit: `isHabit: true`, `recurrence: "weekly"`, `weeklyTarget: 3` (example).

---

## 3. ReflectionModal (`src/components/tasks/ReflectionModal.tsx`)

### New prop

```ts
estimatedMinutes?: number | null
```

Passed from the parent that opens the modal (already has the task object).

### Time block — when `estimatedMinutes` is set

Replace single time input with side-by-side plan/fact layout:

```
план           факт
[ 30 ]    →   [ ___ ]   мин    −5 мин ✓
 (readonly)    (input)
```

- Left cell: grey `readonly` input showing `estimatedMinutes`
- Right cell: existing `timeMinutes` input
- Difference label: computed `timeMinutes - estimatedMinutes`
  - Negative → green «−N мин»
  - Positive → orange «+N мин»
  - Only shown when `timeMinutes` has a value

### Time block — when `estimatedMinutes` is null/undefined

Render exactly as today (single input + «мин» label). No change.

---

## 4. HabitDetailCalendar (`src/components/habits/HabitDetailCalendar.tsx`)

### Applies only when `weeklyTarget > 1`

Add an 8th column to the calendar grid (width ~36px). For each complete week row render a counter cell:

- `✓ N` in green — logs in that week ≥ `weeklyTarget`
- `K/N` in amber — logs in that week > 0 but < target
- `0/N` in red — no logs (only for past weeks, not current)
- Current incomplete week: show running count without colour judgment, e.g. `2…`

Grid changes from `grid-cols-7` to `grid-cols-[repeat(7,1fr)_36px]`.

Legend gains a new entry explaining the counter column.

`Props` interface gains `weeklyTarget?: number`.

### Daily habits — no change

---

## 5. HabitCard (`src/components/habits/HabitCard.tsx`)

`HabitCard` receives `habit: Task` which now includes `weeklyTarget`.

### Header 7-cell mini heatmap — when `weeklyTarget > 1`

Keep the 7 day-cells unchanged. Append one counter element immediately after:

```
● ● ○ ● ○ ○ ●   2/3
```
- Current week's log count vs target
- Green `✓3` if met, amber `2/3` if partial, no colour for today's incomplete week
- `weeklyTarget === 1` or daily/monthly: counter not rendered (no change)

### Expanded 30-day grid — when `weeklyTarget > 1`

Replace the flat `flex-wrap` of 30 dots with 4 rows of 7 dots, each row followed by a week counter (same logic as HabitDetailCalendar). Uses the same `grid-cols-[repeat(7,14px)_auto]` grid.

For daily/monthly habits: keep the current flat `flex-wrap` unchanged.

---

## 6. habitStats.ts (`src/hooks/habitStats.ts`)

Update `computeHabitStats` signature:

```ts
export function computeHabitStats(
  logs: HabitLog[],
  recurrence: string,
  createdAt: Date,
  weeklyTarget?: number   // new, defaults to 1
): HabitStats
```

Update the `weekly` completion-rate branch: a week counts as «completed» only when `logsInWeek >= (weeklyTarget ?? 1)` (was: `logsInWeek >= 1`).

---

## Out of scope

- Heatmap for monthly habits — no change
- Streak for weekly habits — no change (streak is daily-only)
- Habit log API — no change (each log is still a single date entry)
- Offline queue — no change

---

## Files changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | +`estimatedMinutes`, +`weeklyTarget` on Task |
| `src/types/index.ts` | +2 fields on Task type |
| `src/hooks/taskUtils.ts` | +2 fields on CreateTaskInput |
| `src/app/api/tasks/route.ts` | read/persist new fields |
| `src/components/tasks/AddTaskForm.tsx` | full redesign |
| `src/components/tasks/ReflectionModal.tsx` | plan/fact time layout |
| `src/components/habits/HabitDetailCalendar.tsx` | 8th column for weekly target |
| `src/components/habits/HabitCard.tsx` | mini counter + grouped 30-day grid |
| `src/hooks/habitStats.ts` | weeklyTarget-aware completion rate |
