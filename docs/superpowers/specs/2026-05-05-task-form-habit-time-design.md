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
- `src/app/api/tasks/route.ts` POST — read and persist both fields. Validate `weeklyTarget` is 1–7 when present; silently ignore (do not persist) `weeklyTarget` when `recurrence !== "weekly"`.
- `src/app/api/tasks/[id]/route.ts` PATCH — also read and persist `estimatedMinutes` and `weeklyTarget` (currently omits them). Apply the same `weeklyTarget` cross-field rule.
- GET response: no code change needed — `prisma.task.findMany` spreads all scalar columns, so new fields appear automatically once migrated.

---

## 2. AddTaskForm Redesign (`src/components/tasks/AddTaskForm.tsx`)

### Visual style

Replace bottom-sheet / centered hybrid with always-centered modal identical to `ReflectionModal`:

```
backdrop: fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center
card:     bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm mx-4 flex flex-col gap-4
```

Remove the mobile drag-handle and the `md:` responsive breakpoints. The current backdrop at `z-40` and panel at `z-50` collapse into one container identical to `ReflectionModal` (single `fixed inset-0` div with `backdrop-blur-sm`).

### State changes

Remove `activeField` state and the `toggleField` / `recurrence` pill entirely. The old `activeField === "recurrence"` branch (select dropdown) is replaced by the inline habit block. The `recurrence` state remains but is now driven by the habit block period picker, not a pill.

### Field layout (top to bottom)

1. **Header row** — «Новая задача» + ✕ button
2. **Title input** — as-is
3. **Estimated time** — `[ — ] мин · ожидаемое время`, number input (optional, min 1, max 1440); empty = not set
4. **Pill buttons row** — Дата / Метки / Проект (recurrence pill removed)
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

### Caller: TaskList.tsx

`TaskList` already looks up the task by `reflectionTaskId` to pass `isHabit`. Add `estimatedMinutes` the same way:

```tsx
<ReflectionModal
  taskId={reflectionTaskId}
  isHabit={tasks.find((t) => t.id === reflectionTaskId)?.isHabit ?? false}
  estimatedMinutes={tasks.find((t) => t.id === reflectionTaskId)?.estimatedMinutes ?? null}
  onClose={() => setReflectionTaskId(null)}
/>
```

`TaskList.tsx` must be updated — it is not in the original table.

### Caller: HabitSection.tsx

`HabitSection` also opens `ReflectionModal`. It has access to the habit `Task` object, so pass `estimatedMinutes={habit.estimatedMinutes ?? null}` there too.

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

## 4. habitStats.ts (`src/hooks/habitStats.ts`)

### Signature change

```ts
export function computeHabitStats(
  logs: HabitLog[],
  recurrence: string,
  createdAt: Date,
  weeklyTarget?: number   // new, defaults to 1
): HabitStats
```

### Weekly completion rate

Replace `logs.some(...)` with a count check:

```ts
// was:
if (logs.some((l) => { const d = new Date(l.date); return d >= wStart && d < wEnd })) {
// becomes:
const logsInWeek = logs.filter((l) => { const d = new Date(l.date); return d >= wStart && d < wEnd }).length
if (logsInWeek >= (weeklyTarget ?? 1)) {
```

### HabitStats type — new field for per-week breakdown

Calendar and card rendering need raw per-week counts (to show `2/3`, `✓3`, etc.). Add to `HabitStats`:

```ts
export type HabitStats = {
  streak: number
  completionRate: number
  moodTrend: Mood[]
  weeklyBreakdown?: WeeklyWeek[]  // only populated when recurrence === "weekly"
}

type WeeklyWeek = {
  weekStart: string   // ISO date of Monday
  logs: number        // how many logs fell in this week
  complete: boolean   // logs >= weeklyTarget
  current: boolean    // this is the current (possibly incomplete) week
}
```

Populate `weeklyBreakdown` inside the `recurrence === "weekly"` branch using the same 12-week loop already there.

### Call sites to update

Both callers must pass `weeklyTarget`:

- `src/components/habits/HabitCard.tsx` line 24: pass `habit.weeklyTarget ?? undefined`; add `habit.weeklyTarget` to the `useMemo` dep array
- `src/components/habits/HabitSection.tsx` line 25: same

---

## 5. HabitDetailCalendar (`src/components/habits/HabitDetailCalendar.tsx`)

### Applies only when `weeklyTarget > 1`

`Props` interface gains `weeklyTarget?: number`.

The component receives `weeklyBreakdown` indirectly — caller passes it from `computeHabitStats`. Add `weeklyBreakdown?: WeeklyWeek[]` to props.

Grid changes from `grid-cols-7` to `grid-cols-[repeat(7,1fr)_36px]` for **both** the day-of-week header row and the day-cells row. The header row gains an 8th empty `<div>` to stay aligned.

Counter cell per week row:
- `✓ N` in green — `week.complete`
- `K/N` in amber — partial (`week.logs > 0 && !week.complete`)
- `0/N` in red — `week.logs === 0` and `!week.current`
- `K…` no colour — `week.current`

Legend gains entry: counter column explained.

### Daily/monthly habits — no change

---

## 6. HabitCard (`src/components/habits/HabitCard.tsx`)

Receives `habit: Task` which now includes `weeklyTarget`. `computeHabitStats` call updated (see section 4).

### Header 7-cell mini heatmap — when `weeklyTarget > 1`

Keep 7 day-cells unchanged. Append one counter element after them using current week's data from `stats.weeklyBreakdown`:

```
● ● ○ ● ○ ○ ●   2/3
```
- Green `✓N` if met, amber `K/N` if partial, no colour for current week
- Not rendered when `weeklyTarget` is 1 or absent, or for daily/monthly habits

### Expanded 30-day grid — when `weeklyTarget > 1`

Replace flat `flex-wrap` of 30 dots with rows of 7 dots each followed by a counter. Source data: filter `stats.weeklyBreakdown` to weeks overlapping the 30-day window.

For daily/monthly habits: keep flat `flex-wrap` unchanged.

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
| `src/app/api/tasks/route.ts` | POST: read/persist new fields; ignore `weeklyTarget` when recurrence ≠ weekly |
| `src/app/api/tasks/[id]/route.ts` | PATCH: same as above |
| `src/components/tasks/AddTaskForm.tsx` | full redesign; remove recurrence pill + `activeField` branch |
| `src/components/tasks/TaskList.tsx` | pass `estimatedMinutes` to ReflectionModal |
| `src/components/tasks/ReflectionModal.tsx` | plan/fact time layout; new `estimatedMinutes` prop |
| `src/components/habits/HabitSection.tsx` | pass `estimatedMinutes` + `weeklyTarget` to their consumers |
| `src/hooks/habitStats.ts` | `weeklyTarget` param; `WeeklyWeek[]` breakdown; count-based weekly check |
| `src/components/habits/HabitDetailCalendar.tsx` | 8th column; header alignment; `weeklyBreakdown` prop |
| `src/components/habits/HabitCard.tsx` | mini counter; grouped 30-day grid; updated stats call |
| **Tests** | |
| `src/hooks/habitStats.test.ts` | update weekly tests; add `weeklyTarget > 1` cases |
| `src/app/api/tasks/route.test.ts` | fixture + POST test for new fields |
| `src/components/tasks/AddTaskForm.test.tsx` | remove recurrence pill tests; add habit block tests |
| `src/components/tasks/ReflectionModal.test.tsx` | add `estimatedMinutes` prop cases |
| `src/components/habits/HabitCard.test.tsx` | add `weeklyTarget` fixture; counter + grouped grid tests |
| `src/components/habits/HabitDetailCalendar.test.tsx` | add 8th column tests |
| `src/components/habits/HabitSection.test.tsx` | update fixture + mock chain |
| `src/components/tasks/TaskList.test.tsx` | update `makeTask` fixture |
