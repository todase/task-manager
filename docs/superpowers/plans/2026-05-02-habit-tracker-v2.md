# Habit Tracker v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the habit widget in TaskList, add a summary bar + redesigned accordions to `/habits`, and create a new `/habits/[id]` detail page with a monthly calendar and reflections history.

**Architecture:** All three features build on the existing `HabitLog` / `HabitSection` / `HabitCard` stack. No new API routes needed — data comes from `GET /api/tasks/[id]/habit-logs` (already returns last 90 days with nested reflections). A new `useAllHabitLogs` hook uses TanStack Query's `useQueries` to batch-fetch logs for the summary bar. The detail page is a new Next.js route `app/habits/[id]/page.tsx` with a new `HabitDetailCalendar` component.

**Tech Stack:** Next.js 16, TanStack Query (useQueries), Tailwind CSS, Vitest + Testing Library

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/components/habits/HabitSection.tsx` | Cell size, streak slot alignment, arrow links to `/habits/[id]` |
| Modify | `src/components/habits/HabitSection.test.tsx` | Update cell-size assertion, add arrow-link test |
| Modify | `src/components/habits/HabitCard.tsx` | 7-cell mini heatmap in header, stat pills when expanded, link to detail |
| Modify | `src/components/habits/HabitCard.test.tsx` | Update heatmap count assertion, add stat pills tests |
| Create | `src/hooks/useAllHabitLogs.ts` | `useQueries` wrapper that returns logs per habitId |
| Modify | `src/app/habits/page.tsx` | Add summary bar using `useAllHabitLogs` |
| Create | `src/components/habits/HabitDetailCalendar.tsx` | Monthly calendar with nav, done/reflection cell states, click-to-scroll |
| Create | `src/components/habits/HabitDetailCalendar.test.tsx` | Calendar rendering, month navigation, click behaviour |
| Create | `src/app/habits/[id]/page.tsx` | Detail page: stat pills + HabitDetailCalendar + reflections list |

---

## Task 1: HabitSection — visual polish & alignment fix

**Goal:** Fix streak-badge alignment so all 7-cell columns stay on the same axis, increase cell size to 16×16, update arrow to link to the habit's detail page.

**Files:**
- Modify: `src/components/habits/HabitSection.tsx`
- Modify: `src/components/habits/HabitSection.test.tsx`

**Acceptance Criteria:**
- [ ] Heatmap cells are `w-4 h-4` (16px) with `rounded`
- [ ] Streak badge is inside a `w-9 text-right` fixed-width slot placed left of the cells; when no streak, slot is empty but still occupies space
- [ ] Today's cell has `ring-2 ring-purple-200` highlight
- [ ] Arrow `›` links to `/habits/${habit.id}` (not `/habits`)
- [ ] Header label and badge use purple colour tokens
- [ ] All existing HabitSection tests pass; new test verifies arrow href

**Verify:** `npx vitest run src/components/habits/HabitSection.test.tsx` → all pass

**Steps:**

- [ ] **Step 1: Write failing test for arrow href**

In `src/components/habits/HabitSection.test.tsx`, add inside `describe("HabitSection")`:

```tsx
it("renders arrow link pointing to /habits/<id>", () => {
  render(<HabitSection habits={[habit]} isOpen={true} onToggle={vi.fn()} />)
  const link = screen.getByRole("link", { name: "→" })
  expect(link).toHaveAttribute("href", `/habits/${habit.id}`)
})
```

- [ ] **Step 2: Run test — expect FAIL**

```
npx vitest run src/components/habits/HabitSection.test.tsx
```

Expected: FAIL — link href is `/habits`, not `/habits/h1`

- [ ] **Step 3: Update `HabitSection.tsx`**

Replace the entire `HabitRow` function:

```tsx
function HabitRow({ habit }: { habit: Task }) {
  const days = utcDays(7)
  const today = days[days.length - 1]
  const [showReflection, setShowReflection] = useState(false)
  const { data: logs = [] } = useHabitLogs(habit.id)
  const { mutate: toggleLog } = useToggleHabitLog(habit.id)
  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = useMemo(
    () => computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt)),
    [logs, habit.recurrence, habit.createdAt]
  )

  function handleCellClick(date: string) {
    const isCurrentlyLogged = logDates.has(date)
    toggleLog({ date, isCurrentlyLogged })
    if (!isCurrentlyLogged && date === today) {
      setShowReflection(true)
    }
  }

  const streakLabel =
    habit.recurrence === "daily" && stats.streak > 0 ? `🔥${stats.streak}` : ""

  return (
    <>
      <div className="flex items-center gap-2 py-2.5">
        <span className="flex-1 text-sm truncate">{habit.title}</span>

        {/* Fixed-width streak slot — keeps cells aligned whether or not streak exists */}
        <span className="w-9 text-right text-xs font-bold text-orange-500 flex-shrink-0">
          {streakLabel}
        </span>

        <div className="flex gap-0.5 flex-shrink-0" aria-label="Последние 7 дней">
          {days.map((key) => (
            <button
              key={key}
              title={key}
              onClick={() => handleCellClick(key)}
              className={`w-4 h-4 rounded transition-colors cursor-pointer ${
                logDates.has(key)
                  ? key === today
                    ? "bg-purple-600 ring-2 ring-purple-200"
                    : "bg-purple-600 hover:bg-purple-500"
                  : "bg-purple-100 hover:bg-purple-200"
              }`}
              aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
            />
          ))}
        </div>

        <Link
          href={`/habits/${habit.id}`}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          →
        </Link>
      </div>

      {showReflection && (
        <ReflectionModal
          taskId={habit.id}
          isHabit
          onClose={() => setShowReflection(false)}
        />
      )}
    </>
  )
}
```

Also update the header to use `text-purple-600`:

```tsx
<span className="text-sm font-medium text-purple-600 flex-1">Привычки</span>
```

- [ ] **Step 4: Run tests — expect all pass**

```
npx vitest run src/components/habits/HabitSection.test.tsx
```

Expected: all pass (the existing "7 heatmap cells" test still passes because cell count didn't change)

- [ ] **Step 5: Commit**

```bash
git add src/components/habits/HabitSection.tsx src/components/habits/HabitSection.test.tsx
git commit -m "feat: habit widget — 16px cells, streak alignment fix, arrow to /habits/[id]"
```

---

## Task 2: HabitCard — accordion redesign

**Goal:** Collapsed header shows `[streak-slot 36px][7-cell mini heatmap][▼]`; expanded shows 30-day heatmap + three stat pills (completion %, streak, mood emoji); habit name links to the detail page.

**Files:**
- Modify: `src/components/habits/HabitCard.tsx`
- Modify: `src/components/habits/HabitCard.test.tsx`

**Acceptance Criteria:**
- [ ] Collapsed state: 7 cells in mini heatmap (was 14), streak in 36px fixed slot, `▼/▲` chevron
- [ ] Expanded state: 30-day heatmap + three stat pills (completion %, streak if daily, mood emoji if available)
- [ ] Habit name is a `<Link href="/habits/[id]">` — clicking name navigates to detail page
- [ ] Expand/collapse toggle on the chevron button only (not the name)
- [ ] All tests pass

**Verify:** `npx vitest run src/components/habits/HabitCard.test.tsx` → all pass

**Steps:**

- [ ] **Step 1: Update HabitCard tests for new structure**

Replace `src/components/habits/HabitCard.test.tsx` entirely:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { HabitCard } from "./HabitCard"

const mockUseHabitLogs = vi.fn()

vi.mock("@/hooks/useHabitLogs", () => ({
  useHabitLogs: (taskId: string) => mockUseHabitLogs(taskId),
  useToggleHabitLog: vi.fn().mockReturnValue({ mutate: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const TODAY = new Date()
const todayKey = new Date(
  Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate())
)
  .toISOString()
  .slice(0, 10)

const habit = {
  id: "h1",
  title: "Morning run",
  done: false,
  recurrence: "daily",
  isHabit: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  dueDate: null,
  description: null,
  order: 0,
  project: null,
  subtasks: [],
  tags: [],
  priorityScore: 1,
}

beforeEach(() => {
  mockUseHabitLogs.mockReturnValue({ data: [] })
})
afterEach(cleanup)

describe("HabitCard", () => {
  it("renders habit title and is collapsed by default", () => {
    render(<HabitCard habit={habit} />)
    expect(screen.getByText("Morning run")).toBeInTheDocument()
    expect(screen.queryByLabelText("30-дневный график")).not.toBeInTheDocument()
  })

  it("habit name is a link to /habits/<id>", () => {
    render(<HabitCard habit={habit} />)
    const link = screen.getByRole("link", { name: "Morning run" })
    expect(link).toHaveAttribute("href", "/habits/h1")
  })

  it("shows 7 mini heatmap cells when collapsed", () => {
    render(<HabitCard habit={habit} />)
    const cells = screen.getAllByRole("button", { name: /отметить/ })
    expect(cells).toHaveLength(7)
  })

  it("expands on chevron click and shows 30-day heatmap", () => {
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByLabelText("30-дневный график")).toBeInTheDocument()
  })

  it("collapses again on second chevron click", () => {
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByLabelText("30-дневный график")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /свернуть/i }))
    expect(screen.queryByLabelText("30-дневный график")).not.toBeInTheDocument()
  })

  it("shows completion rate pill when expanded", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: null }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByTestId("stat-completion")).toBeInTheDocument()
  })

  it("shows streak pill for daily habit when expanded with streak", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: null }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByTestId("stat-streak")).toBeInTheDocument()
  })

  it("does not show streak pill for non-daily recurrence", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: null }],
    })
    render(<HabitCard habit={{ ...habit, recurrence: "weekly" }} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.queryByTestId("stat-streak")).not.toBeInTheDocument()
  })

  it("shows mood pill when expanded with mood data", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: { mood: "energized", difficulty: null } }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByTestId("stat-mood")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run src/components/habits/HabitCard.test.tsx
```

Expected: multiple failures — new test ids and aria-labels don't exist yet.

- [ ] **Step 3: Rewrite `HabitCard.tsx`**

```tsx
"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useHabitLogs, useToggleHabitLog } from "@/hooks/useHabitLogs"
import { utcDays } from "@/hooks/habitUtils"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

const MOOD_EMOJI: Record<string, string> = {
  energized: "⚡",
  neutral: "😐",
  tired: "😴",
}

export function HabitCard({ habit }: { habit: Task }) {
  const [expanded, setExpanded] = useState(false)
  const { data: logs = [] } = useHabitLogs(habit.id)
  const { mutate: toggleLog } = useToggleHabitLog(habit.id)

  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = useMemo(
    () => computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt)),
    [logs, habit.recurrence, habit.createdAt]
  )

  const handleToggle = (date: string) =>
    toggleLog({ date, isCurrentlyLogged: logDates.has(date) })

  const miniDays = utcDays(7)
  const fullDays = utcDays(30)
  const today = miniDays[miniDays.length - 1]
  const streakLabel =
    habit.recurrence === "daily" && stats.streak > 0 ? `🔥${stats.streak}` : ""
  const moodEmoji =
    stats.moodTrend.length > 0
      ? MOOD_EMOJI[stats.moodTrend[stats.moodTrend.length - 1]] ?? null
      : null

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Link
          href={`/habits/${habit.id}`}
          className="flex-1 font-medium text-sm truncate hover:text-purple-600 transition-colors"
        >
          {habit.title}
        </Link>

        {/* Fixed-width streak slot */}
        <span className="w-9 text-right text-xs font-bold text-orange-500 flex-shrink-0">
          {streakLabel}
        </span>

        {/* 7-cell mini heatmap */}
        <div className="flex gap-0.5 flex-shrink-0" aria-label="Последние 7 дней">
          {miniDays.map((key) => (
            <button
              key={key}
              title={key}
              onClick={() => handleToggle(key)}
              className={`w-4 h-4 rounded transition-colors cursor-pointer ${
                logDates.has(key)
                  ? key === today
                    ? "bg-purple-600 ring-2 ring-purple-200"
                    : "bg-purple-600 hover:bg-purple-500"
                  : "bg-purple-100 hover:bg-purple-200"
              }`}
              aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
            />
          ))}
        </div>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          aria-expanded={expanded}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pt-3 pb-4 space-y-3">
          {/* 30-day full heatmap */}
          <div className="flex flex-wrap gap-0.5" aria-label="30-дневный график">
            {fullDays.map((key) => (
              <button
                key={key}
                title={key}
                onClick={() => handleToggle(key)}
                className={`w-4 h-4 rounded transition-colors cursor-pointer ${
                  logDates.has(key)
                    ? key === today
                      ? "bg-purple-600 ring-2 ring-purple-200"
                      : "bg-purple-600 hover:bg-purple-500"
                    : "bg-purple-100 hover:bg-purple-200"
                }`}
                aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
              />
            ))}
          </div>

          {/* Stat pills */}
          <div className="flex gap-2">
            <div
              data-testid="stat-completion"
              className="flex-1 bg-purple-50 border border-purple-100 rounded-lg py-1.5 text-center"
            >
              <div className="text-base font-bold text-purple-600">
                {Math.round(stats.completionRate * 100)}%
              </div>
              <div className="text-xs text-gray-400">за 30 дней</div>
            </div>

            {habit.recurrence === "daily" && stats.streak > 0 && (
              <div
                data-testid="stat-streak"
                className="flex-1 bg-purple-50 border border-purple-100 rounded-lg py-1.5 text-center"
              >
                <div className="text-base font-bold text-orange-500">🔥{stats.streak}</div>
                <div className="text-xs text-gray-400">стрик</div>
              </div>
            )}

            {moodEmoji && (
              <div
                data-testid="stat-mood"
                className="flex-1 bg-purple-50 border border-purple-100 rounded-lg py-1.5 text-center"
              >
                <div className="text-base font-bold">{moodEmoji}</div>
                <div className="text-xs text-gray-400">настроение</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — expect all pass**

```
npx vitest run src/components/habits/HabitCard.test.tsx
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/components/habits/HabitCard.tsx src/components/habits/HabitCard.test.tsx
git commit -m "feat: HabitCard — 7-cell mini heatmap, stat pills on expand, link to detail page"
```

---

## Task 3: `/habits` page — summary bar

**Goal:** Add a summary bar above the habit list showing total active habits, 7-day average completion rate across all habits, and the best current streak.

**Files:**
- Create: `src/hooks/useAllHabitLogs.ts`
- Modify: `src/app/habits/page.tsx`

**Acceptance Criteria:**
- [ ] `useAllHabitLogs(ids)` returns per-habit logs using `useQueries`
- [ ] Summary bar shows three pills: active count, 7-day completion %, best streak
- [ ] Summary bar renders only when `habits.length > 0`
- [ ] When logs are still loading, pills show `—` as placeholder
- [ ] Habits are ordered by completion rate descending

**Verify:** `npx vitest run src/app/habits` → (no test file for the page, visual verification)
Also run full suite: `npx vitest run` → all pass (no regressions)

**Steps:**

- [ ] **Step 1: Create `src/hooks/useAllHabitLogs.ts`**

```ts
import { useQueries } from "@tanstack/react-query"
import type { HabitLog } from "@/types"

async function fetchHabitLogs(taskId: string): Promise<HabitLog[]> {
  const res = await fetch(`/api/tasks/${taskId}/habit-logs`)
  if (!res.ok) throw new Error("Failed to fetch habit logs")
  const data = await res.json()
  return data.logs as HabitLog[]
}

export function useAllHabitLogs(habitIds: string[]) {
  const results = useQueries({
    queries: habitIds.map((id) => ({
      queryKey: ["habitLogs", id],
      queryFn: () => fetchHabitLogs(id),
      enabled: Boolean(id),
    })),
  })

  const logsByHabitId: Record<string, HabitLog[]> = {}
  let isLoading = false

  for (let i = 0; i < habitIds.length; i++) {
    const r = results[i]
    logsByHabitId[habitIds[i]] = r.data ?? []
    if (r.isLoading) isLoading = true
  }

  return { logsByHabitId, isLoading }
}
```

- [ ] **Step 2: Update `src/app/habits/page.tsx`**

```tsx
"use client"
import { useMemo } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useHabits } from "@/hooks/useHabits"
import { useAllHabitLogs } from "@/hooks/useAllHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import { HabitCard } from "@/components/habits/HabitCard"
import type { Task, HabitLog } from "@/types"

type SummaryBarProps = {
  habits: Task[]
  logsByHabitId: Record<string, HabitLog[]>
  isLoading: boolean
}

function SummaryBar({ habits, logsByHabitId, isLoading }: SummaryBarProps) {
  const { avgRate7d, bestStreak } = useMemo(() => {
    if (isLoading || habits.length === 0) return { avgRate7d: null, bestStreak: null }

    const now = new Date()
    const sevenDaysAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
    )
    const todayStr = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
      .toISOString()
      .slice(0, 10)

    let totalRate = 0
    let best = 0

    for (const habit of habits) {
      const logs = logsByHabitId[habit.id] ?? []
      const stats = computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
      if (stats.streak > best) best = stats.streak

      const logsIn7d = logs.filter((l) => new Date(l.date) >= sevenDaysAgo)
      const denom = logsIn7d.some((l) => l.date.slice(0, 10) === todayStr) ? 7 : 6
      totalRate += Math.min(logsIn7d.length / denom, 1)
    }

    return {
      avgRate7d: Math.round((totalRate / habits.length) * 100),
      bestStreak: best,
    }
  }, [habits, logsByHabitId, isLoading])

  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
        <div className="text-lg font-bold text-purple-600">{habits.length}</div>
        <div className="text-xs text-gray-400">активных</div>
      </div>
      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
        <div className="text-lg font-bold text-purple-600">
          {isLoading || avgRate7d === null ? "—" : `${avgRate7d}%`}
        </div>
        <div className="text-xs text-gray-400">за 7 дней</div>
      </div>
      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
        <div className="text-lg font-bold text-purple-600">
          {isLoading || bestStreak === null ? "—" : bestStreak > 0 ? `🔥${bestStreak}` : "0"}
        </div>
        <div className="text-xs text-gray-400">лучший стрик</div>
      </div>
    </div>
  )
}

export default function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits()
  // Fetch all logs at page level — cached by TanStack Query, shared with HabitCard children
  const { logsByHabitId, isLoading: logsLoading } = useAllHabitLogs(habits.map((h) => h.id))

  // Sort by 30-day completion rate descending once logs are available
  const sortedHabits = useMemo(() => {
    if (logsLoading) return habits
    return [...habits].sort((a, b) => {
      const statsA = computeHabitStats(
        logsByHabitId[a.id] ?? [],
        a.recurrence ?? "",
        new Date(a.createdAt)
      )
      const statsB = computeHabitStats(
        logsByHabitId[b.id] ?? [],
        b.recurrence ?? "",
        new Date(b.createdAt)
      )
      return statsB.completionRate - statsA.completionRate
    })
  }, [habits, logsByHabitId, logsLoading])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 text-gray-400">
        Загрузка...
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Задачи
        </Link>
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <p>Нет привычек.</p>
          <p className="text-sm">Создайте задачу с повторением и включите «Привычка».</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/tasks"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="Назад к задачам"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">Привычки</h1>
      </div>

      <SummaryBar habits={sortedHabits} logsByHabitId={logsByHabitId} isLoading={logsLoading} />

      <div className="space-y-3">
        {sortedHabits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Run full test suite**

```
npx vitest run
```

Expected: all existing tests pass (no regressions from new hook or page change)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAllHabitLogs.ts src/app/habits/page.tsx
git commit -m "feat: /habits summary bar — active count, 7-day rate, best streak"
```

---

## Task 4: `/habits/[id]` — detail page with calendar & reflections

**Goal:** Create a detail page accessible via `›` from the TaskList widget. Shows stat pills, a monthly calendar with navigation, and a reflections list; clicking a calendar date scrolls to that day's reflection.

**Files:**
- Create: `src/components/habits/HabitDetailCalendar.tsx`
- Create: `src/components/habits/HabitDetailCalendar.test.tsx`
- Create: `src/app/habits/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Calendar shows days of the selected month in a Mon–Sun grid
- [ ] Done days: `bg-purple-600 text-white`, missed days: `bg-gray-100 text-gray-300`
- [ ] Days with a reflection have a yellow dot (`bg-amber-400`) at bottom-center
- [ ] Today gets `ring-2 ring-purple-200`
- [ ] `‹` button disabled when already at the oldest month within 90-day window; `›` disabled at current month
- [ ] Clicking a done+reflection day scrolls the reflections list to that entry and applies `border-l-4 border-purple-500 bg-purple-50` highlight
- [ ] Reflections list shows only entries for the visible month, reverse-chronological
- [ ] When a different month is selected via navigation, reflections list updates to that month
- [ ] Stat pills show streak, 30-day %, 90-day %, latest mood emoji
- [ ] If habit not found (invalid id), page shows "Привычка не найдена" with a back link
- [ ] Calendar and reflection tests pass

**Verify:** `npx vitest run src/components/habits/HabitDetailCalendar.test.tsx` → all pass

**Steps:**

- [ ] **Step 1: Write `HabitDetailCalendar.test.tsx`**

Create `src/components/habits/HabitDetailCalendar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { HabitDetailCalendar } from "./HabitDetailCalendar"
import type { HabitLog } from "@/types"

// Pin date to 2026-05-02 (Saturday, week starts Monday)
const FIXED_NOW = new Date("2026-05-02T12:00:00.000Z")
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const mockScrollIntoView = vi.fn()
window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView

function makeLog(date: string, withReflection = false): HabitLog {
  return {
    id: `log-${date}`,
    taskId: "h1",
    date: `${date}T00:00:00.000Z`,
    reflection: withReflection
      ? { mood: "energized", difficulty: 1 }
      : null,
  }
}

describe("HabitDetailCalendar", () => {
  it("renders current month name", () => {
    render(<HabitDetailCalendar logs={[]} />)
    expect(screen.getByText(/май 2026/i)).toBeInTheDocument()
  })

  it("renders 7 day-of-week headers starting with Пн", () => {
    render(<HabitDetailCalendar logs={[]} />)
    const headers = screen.getAllByRole("columnheader")
    expect(headers[0]).toHaveTextContent("Пн")
    expect(headers[6]).toHaveTextContent("Вс")
  })

  it("marks a logged day as done", () => {
    render(<HabitDetailCalendar logs={[makeLog("2026-05-01")]} />)
    const cell = screen.getByRole("button", { name: /1 мая/i })
    expect(cell).toHaveClass("bg-purple-600")
  })

  it("marks today with ring", () => {
    render(<HabitDetailCalendar logs={[]} />)
    const cell = screen.getByRole("button", { name: /2 мая/i })
    expect(cell).toHaveClass("ring-2")
  })

  it("shows yellow dot on days with reflection", () => {
    render(<HabitDetailCalendar logs={[makeLog("2026-05-01", true)]} />)
    const dot = screen.getByTestId("reflection-dot-2026-05-01")
    expect(dot).toBeInTheDocument()
  })

  it("prev button navigates to April", () => {
    render(<HabitDetailCalendar logs={[]} />)
    fireEvent.click(screen.getByRole("button", { name: /предыдущий месяц/i }))
    expect(screen.getByText(/апрель 2026/i)).toBeInTheDocument()
  })

  it("next button is disabled in current month", () => {
    render(<HabitDetailCalendar logs={[]} />)
    expect(screen.getByRole("button", { name: /следующий месяц/i })).toBeDisabled()
  })

  it("prev button is disabled at 90-day boundary (Feb 2026)", () => {
    render(<HabitDetailCalendar logs={[]} />)
    // Navigate back: May → Apr → Mar → Feb (3 clicks)
    const prev = screen.getByRole("button", { name: /предыдущий месяц/i })
    fireEvent.click(prev)
    fireEvent.click(prev)
    fireEvent.click(prev)
    expect(screen.getByText(/февраль 2026/i)).toBeInTheDocument()
    expect(prev).toBeDisabled()
  })

  it("calls onDateClick with date string when clicking a done cell", () => {
    const onDateClick = vi.fn()
    render(
      <HabitDetailCalendar
        logs={[makeLog("2026-05-01", true)]}
        onDateClick={onDateClick}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /1 мая/i }))
    expect(onDateClick).toHaveBeenCalledWith("2026-05-01")
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```
npx vitest run src/components/habits/HabitDetailCalendar.test.tsx
```

Expected: FAIL — component does not exist yet

- [ ] **Step 3: Create `src/components/habits/HabitDetailCalendar.tsx`**

```tsx
"use client"
import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { HabitLog } from "@/types"

const MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
]
const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

type Props = {
  logs: HabitLog[]
  onDateClick?: (date: string) => void
  /** Called whenever the user switches month. Parent uses this to sync the reflections list. */
  onMonthChange?: (year: number, month: number) => void
}

function toUtcMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`
}

export function HabitDetailCalendar({ logs, onDateClick, onMonthChange }: Props) {
  const now = new Date()
  const todayStr = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10)

  // Current month boundaries
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()

  // Oldest allowed month: 90 days back
  const earliest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89))
  const minYear = earliest.getUTCFullYear()
  const minMonth = earliest.getUTCMonth()

  const [viewYear, setViewYear] = useState(currentYear)
  const [viewMonth, setViewMonth] = useState(currentMonth)

  const atMax = viewYear === currentYear && viewMonth === currentMonth
  const atMin = viewYear === minYear && viewMonth === minMonth

  function prevMonth() {
    if (atMin) return
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1
    setViewYear(newYear)
    setViewMonth(newMonth)
    onMonthChange?.(newYear, newMonth)
  }

  function nextMonth() {
    if (atMax) return
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1
    setViewYear(newYear)
    setViewMonth(newMonth)
    onMonthChange?.(newYear, newMonth)
  }

  // Build sets from logs
  const logDates = useMemo(() => new Set(logs.map((l) => l.date.slice(0, 10))), [logs])
  const reflDates = useMemo(
    () => new Set(logs.filter((l) => l.reflection != null).map((l) => l.date.slice(0, 10))),
    [logs]
  )

  // Build calendar grid
  const cells = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1))
    // getUTCDay: 0=Sun,1=Mon...6=Sat → convert to Mon-based: (day+6)%7
    const startOffset = (firstDay.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate()

    const result: Array<{ date: string | null; day: number | null }> = []
    for (let i = 0; i < startOffset; i++) result.push({ date: null, day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(viewYear, viewMonth, d)).toISOString().slice(0, 10)
      result.push({ date, day: d })
    }
    return result
  }, [viewYear, viewMonth])

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Nav row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <button
          onClick={prevMonth}
          disabled={atMin}
          aria-label="Предыдущий месяц"
          className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-700 capitalize">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={atMax}
          aria-label="Следующий месяц"
          className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 px-3 pt-2 pb-1 gap-1" role="row">
        {DOW.map((d) => (
          <div key={d} role="columnheader" className="text-center text-xs text-gray-400 font-semibold">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 px-3 pb-3">
        {cells.map((cell, i) => {
          if (!cell.date) {
            return <div key={`empty-${i}`} />
          }
          const done = logDates.has(cell.date)
          const hasRefl = reflDates.has(cell.date)
          const isToday = cell.date === todayStr

          const monthName = MONTH_NAMES[viewMonth]
          const ariaLabel = `${cell.day} ${monthName}`

          return (
            <button
              key={cell.date}
              onClick={() => done && onDateClick?.(cell.date!)}
              disabled={!done}
              aria-label={ariaLabel}
              className={[
                "relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
                done
                  ? "bg-purple-600 text-white cursor-pointer hover:bg-purple-500"
                  : "bg-gray-100 text-gray-300 cursor-default",
                isToday ? "ring-2 ring-purple-200" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cell.day}
              {hasRefl && (
                <span
                  data-testid={`reflection-dot-${cell.date}`}
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 pb-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-600 inline-block" /> выполнено
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100 inline-block" /> пропущено
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative inline-block w-3 h-3 rounded bg-purple-600">
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
          </span>
          рефлексия
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run calendar tests — expect all pass**

```
npx vitest run src/components/habits/HabitDetailCalendar.test.tsx
```

Expected: all pass

- [ ] **Step 5: Create `src/app/habits/[id]/page.tsx`**

```tsx
"use client"
import { useRef, useMemo, useCallback, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useHabits } from "@/hooks/useHabits"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import { HabitDetailCalendar } from "@/components/habits/HabitDetailCalendar"
import type { HabitLog } from "@/types"

const MOOD_EMOJI: Record<string, string> = {
  energized: "⚡",
  neutral: "😐",
  tired: "😴",
}

const MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
]

type ReflectionEntryProps = {
  log: HabitLog
  highlighted: boolean
  refCallback: (el: HTMLDivElement | null) => void
}

function ReflectionEntry({ log, highlighted, refCallback }: ReflectionEntryProps) {
  const date = new Date(log.date)
  const now = new Date()
  const isToday =
    date.getUTCDate() === now.getUTCDate() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCFullYear() === now.getUTCFullYear()
  const dateLabel = isToday
    ? `сегодня`
    : `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`

  return (
    <div
      ref={refCallback}
      className={[
        "px-4 py-3 border-b border-gray-50 last:border-b-0 transition-colors",
        highlighted ? "bg-purple-50 border-l-4 border-l-purple-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="text-xs text-gray-400 mb-1 font-medium">{dateLabel}</div>
      {log.reflection ? (
        <>
          <div className="flex gap-2 mt-1">
            {log.reflection.mood && (
              <span className="text-xs bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 text-purple-600">
                {MOOD_EMOJI[log.reflection.mood] ?? log.reflection.mood}
              </span>
            )}
            {log.reflection.difficulty && (
              <span className="text-xs bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 text-purple-600">
                {log.reflection.difficulty === 1
                  ? "легко"
                  : log.reflection.difficulty === 2
                  ? "средне"
                  : "сложно"}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-300 italic">нет рефлексии</p>
      )}
    </div>
  )
}

export default function HabitDetailPage({ params }: { params: { id: string } }) {
  const { data: habits = [], isLoading: habitsLoading } = useHabits()
  const habit = habits.find((h) => h.id === params.id)
  const { data: logs = [], isLoading: logsLoading } = useHabitLogs(params.id)

  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)

  // Month state lifted up from calendar so reflections list can sync
  const nowInit = new Date()
  const [calYear, setCalYear] = useState(nowInit.getUTCFullYear())
  const [calMonth, setCalMonth] = useState(nowInit.getUTCMonth())

  // Refs for scrolling to reflection entries
  const reflRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const stats = useMemo(() => {
    if (!habit) return null
    return computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
  }, [logs, habit])

  const stats90 = useMemo(() => {
    if (!habit || logs.length === 0) return 0
    const now = new Date()
    const ninetyDaysAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89)
    )
    const logsIn90d = logs.filter((l) => new Date(l.date) >= ninetyDaysAgo)
    return logsIn90d.length > 0
      ? Math.round((logsIn90d.length / 90) * 100)
      : 0
  }, [logs])

  // Reflections filtered by the calendar's currently visible month, reverse chron
  const monthReflections = useMemo(() => {
    return logs
      .filter((l) => {
        const d = new Date(l.date)
        return d.getUTCMonth() === calMonth && d.getUTCFullYear() === calYear
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [logs, calMonth, calYear])

  const handleDateClick = useCallback(
    (date: string) => {
      setHighlightedDate(date)
      const el = reflRefs.current[date]
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    },
    []
  )

  if (habitsLoading) {
    return (
      <div className="flex justify-center items-center h-32 text-gray-400">
        Загрузка...
      </div>
    )
  }

  if (!habit) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <Link
          href="/habits"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Привычки
        </Link>
        <p className="text-gray-400">Привычка не найдена.</p>
      </main>
    )
  }

  const latestMood =
    stats && stats.moodTrend.length > 0
      ? MOOD_EMOJI[stats.moodTrend[stats.moodTrend.length - 1]] ?? null
      : null

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/habits"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="Назад к привычкам"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">{habit.title}</h1>
      </div>

      {/* Stat pills */}
      {!logsLoading && stats && (
        <div className="flex gap-2">
          {habit.recurrence === "daily" && (
            <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
              <div className="text-lg font-bold text-orange-500">🔥{stats.streak}</div>
              <div className="text-xs text-gray-400">стрик</div>
            </div>
          )}
          <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
            <div className="text-lg font-bold text-purple-600">
              {Math.round(stats.completionRate * 100)}%
            </div>
            <div className="text-xs text-gray-400">30 дней</div>
          </div>
          <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
            <div className="text-lg font-bold text-purple-600">{stats90}%</div>
            <div className="text-xs text-gray-400">90 дней</div>
          </div>
          {latestMood && (
            <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
              <div className="text-lg">{latestMood}</div>
              <div className="text-xs text-gray-400">настр.</div>
            </div>
          )}
        </div>
      )}

      {/* Calendar — month state is lifted up so reflections list stays in sync */}
      <HabitDetailCalendar
        logs={logs}
        onDateClick={handleDateClick}
        onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m) }}
      />

      {/* Reflections list */}
      {monthReflections.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-50">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              Рефлексии
            </span>
          </div>
          {monthReflections.map((log) => (
            <ReflectionEntry
              key={log.id}
              log={log}
              highlighted={highlightedDate === log.date.slice(0, 10)}
              refCallback={(el) => {
                reflRefs.current[log.date.slice(0, 10)] = el
              }}
            />
          ))}
        </div>
      )}

      {monthReflections.length === 0 && !logsLoading && (
        <p className="text-center text-sm text-gray-400 py-4">
          Нет рефлексий за этот месяц.
        </p>
      )}
    </main>
  )
}
```

- [ ] **Step 6: Run full test suite**

```
npx vitest run
```

Expected: all pass (calendar tests + no regressions)

- [ ] **Step 7: Commit**

```bash
git add src/components/habits/HabitDetailCalendar.tsx \
        src/components/habits/HabitDetailCalendar.test.tsx \
        src/app/habits/[id]/page.tsx
git commit -m "feat: /habits/[id] detail page — monthly calendar, reflections history, click-to-scroll"
```
