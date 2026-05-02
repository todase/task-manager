# Habit Tracker v2 — Design Spec

_Date: 2026-05-02_

## Overview

Three parallel improvements to the habit tracker:

1. **Design polish** — fix alignment bug in the habit widget inside TaskList
2. **`/habits` page** — add summary bar and expandable analytics per habit
3. **`/habits/[id]` page** — new detail page with monthly calendar and reflections history

---

## 1. TaskList widget — design polish

**What changes:** visual refinements + alignment fix.

- Section header: icon + label in purple (`#7c3aed`), badge with `bg:#ede9fe text:#7c3aed`
- Heatmap cells: `16×16 px`, `border-radius: 4px`, empty = `#e9d5ff`, filled = `#7c3aed`, today = `#7c3aed` + `box-shadow: 0 0 0 2px #ddd6fe`
- **Alignment fix:** streak badge lives in a fixed-width `36px` slot (`text-align: right`) placed _left_ of the cells. When no streak exists the slot is empty but still occupies `36px`, keeping all cell columns aligned regardless of streak presence.
- Row right side layout (left→right): `[streak-slot 36px] [7 cells] [arrow ›]`

**No other layout changes** — collapsible header, "Все привычки →" link, and arrow navigation stay as-is.

---

## 2. `/habits` page

### Summary bar

Three stat pills in a horizontal row below the page header:

| Pill | Value | Label |
|------|-------|-------|
| 1 | count of active habits | «активных» |
| 2 | completion rate last 7 days (across all habits) | «за 7 дней» |
| 3 | best current streak among all habits (with 🔥) | «лучший стрик» |

Pill style: `bg:#faf5ff border:#ede9fe border-radius:10px`, value in `#7c3aed` at 18px bold.

### Habit accordions

Each habit renders as an accordion card (`bg:#fff border:#e5e7eb border-radius:10px`).

**Collapsed state** (header only):
- Left: habit name (font-weight 500)
- Right: `[streak-slot 36px] [7-cell mini heatmap] [▼]`
- Same alignment fix as TaskList widget

**Expanded state** (click header to toggle):
- 30-day heatmap (cells wrap to rows, same cell style as mini heatmap)
- Stats row: three pills — `30-day completion %`, `current streak 🔥`, `latest mood emoji`
- Expand indicator changes to `▲`

Habits are ordered by completion rate descending (best habit first).

---

## 3. `/habits/[id]` page

Accessible via the `›` arrow in TaskList rows and from `/habits` accordions.

### Stat pills row

Four pills: `🔥N стрик` · `N% 30 дней` · `N% 90 дней` · `[emoji] настр.`

Same pill style as summary bar.

### Monthly calendar

Header: `‹  Май 2026  ›` — left/right buttons switch month. Right button disabled when viewing the current month.

Day-of-week row: Пн Вт Ср Чт Пт Сб Вс

Cell states:
- **done** — `bg:#7c3aed color:#fff` + clickable
- **done + reflection** — same purple + small yellow dot (`#fbbf24`) at bottom-center
- **missed** — `bg:#f3f4f6 color:#d1d5db`, not clickable
- **today** — purple + `box-shadow: 0 0 0 2px #ddd6fe`
- **empty** (offset days) — transparent

Legend below the grid: three items (выполнено / пропущено / + рефлексия).

**Click behaviour:** clicking a "done" cell scrolls the reflections list to that date's entry and highlights it with `bg:#faf5ff border-left:3px solid #7c3aed`. If the date has no reflection, nothing happens.

No tooltip/hint text shown above the calendar.

### Reflections list

Section title: «РЕФЛЕКСИИ» in small uppercase purple label.

Each entry:
- Date line: `«31 мая — сегодня»` in `#9ca3af` 11px
- Reflection text in `#374151` 12px
- Badges: mood + difficulty, styled `bg:#faf5ff border:#ede9fe border-radius:8px`

Entries shown in reverse-chronological order. Only entries with a reflection are shown (days without reflection are not listed).

When switching calendar months, the reflections list filters to show only that month's entries.

---

## Data & API notes

- All data already exists: `HabitLog`, `TaskReflection`, `computeHabitStats` hook, `GET /api/tasks/[id]/habit-logs`
- Summary bar stats computed client-side from existing `useHabits()` data + `computeHabitStats`
- Calendar loads logs via existing `GET /api/tasks/[id]/habit-logs` (returns last 90 days) — month switching within 90 days needs no extra fetch; switching to older months would require a new API param (out of scope for now — limit calendar to last 90 days)
- `/habits/[id]` page: new Next.js route `app/habits/[id]/page.tsx`

---

## Out of scope

- Push notifications / reminders
- Habit archiving
- Yearly heatmap (GitHub-style)
- Mood trend chart on detail page
- Calendar navigation beyond 90 days
