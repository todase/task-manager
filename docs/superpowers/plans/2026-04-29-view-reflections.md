# View Task Reflections in Archive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show saved reflections in the archive — with an icon indicator on the task row and an expandable reflection section, while replacing text buttons with icon buttons.

**Architecture:** Three changes in sequence: (1) add `reflections` to the `Task` type and include it in the API response when `done=true`; (2) create an `ArchiveTaskItem` component that replaces the inline `<li>` in the archive page; (3) wire the new component into the archive page.

**Tech Stack:** Next.js 16, Prisma, React, TanStack Query, Tailwind CSS, lucide-react, Vitest + Testing Library

---

## File Map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `reflections?: TaskReflection[]` to `Task` |
| `src/app/api/tasks/route.ts` | Include reflections in Prisma query when `doneFilter === true` |
| `src/components/tasks/ArchiveTaskItem.tsx` | New component |
| `src/components/tasks/ArchiveTaskItem.test.tsx` | New test file |
| `src/app/archive/page.tsx` | Replace `<li>` with `<ArchiveTaskItem />` |

---

### Task 1: Data layer — type and API

**Goal:** `Task` carries an optional `reflections` field; the archive API endpoint populates it.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/app/api/tasks/route.ts`

**Acceptance Criteria:**
- [ ] `Task` type has `reflections?: TaskReflection[]`
- [ ] `GET /api/tasks?done=true` response includes a `reflections` array on each task (latest first, max 1 entry)
- [ ] `GET /api/tasks` (without `done=true`) does NOT include reflections
- [ ] TypeScript build passes: `npx tsc --noEmit`

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Add `reflections` to the `Task` type**

Open `src/types/index.ts`. The current `Task` type ends at `priorityScore`. Add the optional field:

```ts
export type Task = {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  recurrence: string | null
  description: string | null
  order: number
  project: { id: string; title: string; icon: string } | null
  subtasks: Subtask[]
  tags: Tag[]
  priorityScore: number
  reflections?: TaskReflection[]
}
```

`TaskReflection` is already defined in the same file — no import needed.

- [ ] **Step 2: Include reflections in the API when `done=true`**

Open `src/app/api/tasks/route.ts`. The `prisma.task.findMany` call at line 43 has a fixed `include`. Change it to conditionally add `reflections`:

```ts
const tasks = await prisma.task.findMany({
  where,
  orderBy,
  ...(q ? {} : { take }),
  include: {
    subtasks: true,
    project: { select: { id: true, title: true, icon: true } },
    tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    ...(doneFilter === true && {
      reflections: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    }),
  },
})
```

The `return NextResponse.json(tasks.map((t) => ({ ...t, tags: t.tags.map((tt) => tt.tag) })))` line already spreads `t`, so `reflections` will be included automatically in the response.

- [ ] **Step 3: Verify TypeScript is happy**

```bash
npx tsc --noEmit
```

Expected: no errors. If Prisma complains about the spread in `include`, wrap with `...(doneFilter === true ? { reflections: { orderBy: { createdAt: "desc" as const }, take: 1 } } : {})` instead of the `&&` form.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/app/api/tasks/route.ts
git commit -m "feat: include latest reflection in done tasks API response"
```

---

### Task 2: ArchiveTaskItem component

**Goal:** A self-contained component that renders an archived task row with expand-to-see-reflection behaviour, a reflection icon indicator, and icon-only restore/delete buttons.

**Files:**
- Create: `src/components/tasks/ArchiveTaskItem.tsx`
- Create: `src/components/tasks/ArchiveTaskItem.test.tsx`

**Acceptance Criteria:**
- [ ] `BookOpen` icon visible only when `task.reflections` has at least one entry
- [ ] Clicking the row toggles open/closed
- [ ] Expanded view shows only non-null/non-undefined reflection fields
- [ ] No reflection section rendered when `reflections` is empty or undefined
- [ ] Restore button calls `onRestore(task.id)`; delete button calls `onDelete(task.id)`; neither button toggles expand
- [ ] All 8 test cases pass: `npx vitest run src/components/tasks/ArchiveTaskItem.test.tsx`

**Verify:** `npx vitest run src/components/tasks/ArchiveTaskItem.test.tsx` → 8 passed

**Steps:**

- [ ] **Step 1: Write the tests first**

Create `src/components/tasks/ArchiveTaskItem.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ArchiveTaskItem } from "./ArchiveTaskItem"
import type { Task, TaskReflection } from "@/types"

afterEach(cleanup)

const makeReflection = (overrides: Partial<TaskReflection> = {}): TaskReflection => ({
  id: "r1",
  taskId: "task-1",
  notes: null,
  timeMinutes: null,
  difficulty: null,
  mood: null,
  createdAt: "2026-04-28T10:00:00.000Z",
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Done task",
  done: true,
  dueDate: null,
  recurrence: null,
  description: null,
  order: 0,
  project: null,
  subtasks: [],
  tags: [],
  priorityScore: 0,
  reflections: [],
  ...overrides,
})

describe("ArchiveTaskItem", () => {
  it("shows reflection icon when task has a reflection", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [makeReflection()] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByLabelText("Есть рефлексия")).toBeTruthy()
  })

  it("hides reflection icon when reflections array is empty", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.queryByLabelText("Есть рефлексия")).toBeNull()
  })

  it("hides reflection icon when reflections is undefined", () => {
    const task = makeTask()
    delete task.reflections
    render(
      <ArchiveTaskItem task={task} onRestore={vi.fn()} onDelete={vi.fn()} />
    )
    expect(screen.queryByLabelText("Есть рефлексия")).toBeNull()
  })

  it("expands on row click to show reflection section", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [makeReflection({ notes: "Всё прошло хорошо" })] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.queryByText("Рефлексия")).toBeNull()
    fireEvent.click(screen.getByText("Done task"))
    expect(screen.getByText("Рефлексия")).toBeTruthy()
    expect(screen.getByText("Всё прошло хорошо")).toBeTruthy()
  })

  it("renders only non-empty reflection fields", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({
          reflections: [makeReflection({ notes: "Заметки", timeMinutes: 30 })],
        })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText("Done task"))
    expect(screen.getByText("Заметки")).toBeTruthy()
    expect(screen.getByText("⏱ 30 мин")).toBeTruthy()
    expect(screen.queryByText("😊")).toBeNull()
    expect(screen.queryByText("зарядился")).toBeNull()
  })

  it("does not render reflection section when reflections is empty", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText("Done task"))
    expect(screen.queryByText("Рефлексия")).toBeNull()
  })

  it("calls onRestore with task id and does not toggle expand", () => {
    const onRestore = vi.fn()
    render(
      <ArchiveTaskItem task={makeTask()} onRestore={onRestore} onDelete={vi.fn()} />
    )
    fireEvent.click(screen.getByLabelText("Восстановить"))
    expect(onRestore).toHaveBeenCalledWith("task-1")
    expect(screen.queryByText("Рефлексия")).toBeNull()
  })

  it("calls onDelete with task id and does not toggle expand", () => {
    const onDelete = vi.fn()
    render(
      <ArchiveTaskItem task={makeTask()} onRestore={vi.fn()} onDelete={onDelete} />
    )
    fireEvent.click(screen.getByLabelText("Удалить"))
    expect(onDelete).toHaveBeenCalledWith("task-1")
    expect(screen.queryByText("Рефлексия")).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — expect 7 failures (component doesn't exist yet)**

```bash
npx vitest run src/components/tasks/ArchiveTaskItem.test.tsx
```

Expected: all 7 fail with "Cannot find module './ArchiveTaskItem'" or similar.

- [ ] **Step 3: Create the component**

Create `src/components/tasks/ArchiveTaskItem.tsx`:

```tsx
"use client"

import { useState } from "react"
import { BookOpen, RotateCcw, Trash2 } from "lucide-react"
import type { Task } from "@/types"

const DIFFICULTY_LABEL: Record<number, [string, string]> = {
  1: ["😊", "Легко"],
  2: ["😐", "Нормально"],
  3: ["😤", "Сложно"],
}

const MOOD_LABEL: Record<string, string> = {
  energized: "зарядился",
  neutral: "нейтрально",
  tired: "устал",
}

interface ArchiveTaskItemProps {
  task: Task
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export function ArchiveTaskItem({ task, onRestore, onDelete }: ArchiveTaskItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const reflection = task.reflections?.[0]

  return (
    <li className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setIsOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 line-through truncate">
            {task.title}
          </p>
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(task.reflections?.length ?? 0) > 0 && (
            <BookOpen
              className="w-4 h-4 text-gray-400"
              aria-label="Есть рефлексия"
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRestore(task.id)
            }}
            className="p-1.5 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
            aria-label="Восстановить"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(task.id)
            }}
            className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
            aria-label="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen && reflection && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Рефлексия
          </p>
          {reflection.notes && (
            <p className="text-sm text-gray-600">{reflection.notes}</p>
          )}
          {reflection.timeMinutes != null && (
            <p className="text-sm text-gray-500">⏱ {reflection.timeMinutes} мин</p>
          )}
          {reflection.difficulty != null && (() => {
            const [emoji, label] = DIFFICULTY_LABEL[reflection.difficulty] ?? []
            return emoji ? (
              <p className="text-sm text-gray-500">{emoji} {label}</p>
            ) : null
          })()}
          {reflection.mood && (
            <span className="self-start text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {MOOD_LABEL[reflection.mood] ?? reflection.mood}
            </span>
          )}
          <p className="text-xs text-gray-400">
            {new Date(reflection.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      )}
    </li>
  )
}
```

- [ ] **Step 4: Run tests — expect all 7 to pass**

```bash
npx vitest run src/components/tasks/ArchiveTaskItem.test.tsx
```

Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/ArchiveTaskItem.tsx src/components/tasks/ArchiveTaskItem.test.tsx
git commit -m "feat: add ArchiveTaskItem component with reflection display"
```

---

### Task 3: Wire ArchiveTaskItem into archive page

**Goal:** The archive page uses `ArchiveTaskItem` instead of the inline `<li>`, completing the feature end-to-end.

**Files:**
- Modify: `src/app/archive/page.tsx`

**Acceptance Criteria:**
- [ ] Archive page renders `<ArchiveTaskItem>` for each task
- [ ] No inline task `<li>` remains in `archive/page.tsx`
- [ ] Full test suite passes: `npx vitest run`
- [ ] TypeScript build passes: `npx tsc --noEmit`

**Verify:** `npx vitest run` → all tests pass, `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Replace the inline `<li>` with `<ArchiveTaskItem />`**

Open `src/app/archive/page.tsx`. Add the import at the top (after the existing imports):

```ts
import { ArchiveTaskItem } from "@/components/tasks/ArchiveTaskItem"
```

Replace the entire `tasks.map(...)` block (currently lines 86–120 — the `<ul>` and its children):

```tsx
<ul className="flex flex-col gap-3">
  {tasks.map((task) => (
    <ArchiveTaskItem
      key={task.id}
      task={task}
      onRestore={restoreTask}
      onDelete={deleteTask}
    />
  ))}
</ul>
```

Note: `restoreTask` and `deleteTask` from `useTasks` have signature `(id: string) => Promise<void>`, which is compatible with `(id: string) => void` — TypeScript accepts this because the return value is not used.

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions).

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/archive/page.tsx
git commit -m "feat: show reflections in archive — icon indicator and expand-to-view"
```
