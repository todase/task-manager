# Stage 3: Search + Pagination + Archive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app usable when task count grows — 200-task limit, archive for completed tasks, full-text search by title and description.

**Architecture:** Three independent groups shipped in order: (A) Pagination — API params + useTasks filters + skeletons; (B) Archive — bulk DELETE + `/archive` page + BottomNav; (C) Search — `q` param in API + `SearchInput` component + page state. Each group is independently shippable.

**Tech Stack:** Next.js App Router, Prisma, React hooks, Tailwind CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-04-15-stage-3-search-pagination-archive-design.md`

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/app/api/tasks/route.ts` | Add `done`, `limit`, `sort`, `q` GET params; add `DELETE` handler |
| Modify | `src/hooks/useTasks.ts` | Add `TaskFilters` type, `buildTasksUrl`, `baseFilters` param, `restoreTask`, `clearArchive` |
| Modify | `src/hooks/useTasks.test.ts` | Add tests for `buildTasksUrl` |
| Create | `src/components/tasks/TaskSkeleton.tsx` | 5-item loading skeleton |
| Modify | `src/components/tasks/TaskList.tsx` | Add `isLoading` prop → show `TaskSkeleton` |
| Modify | `src/app/tasks/page.tsx` | Pass `isLoading` to TaskList, remove full-page loader, add search state |
| Create | `src/app/archive/page.tsx` | Archive page — completed tasks with restore/delete |
| Modify | `src/components/BottomNav.tsx` | Add Archive link, make `onAddClick` optional |
| Create | `src/components/search/SearchInput.tsx` | Debounced search input |

---

## Group A — Pagination

---

### Task 1: Extend `GET /api/tasks` with `done`, `limit`, `sort` params

**Files:**
- Modify: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/tasks/route.test.ts`:

```typescript
// This is an integration test stub — full API tests require a DB.
// We verify the URL param parsing logic instead via useTasks (Task 2).
// No test file needed for this task — covered by manual curl verification.
```

Skip automated tests for API route (requires DB setup). Verify manually in Step 4.

- [ ] **Step 2: Replace the `GET` handler in `src/app/api/tasks/route.ts`**

Replace only the `GET` function (keep `POST` unchanged):

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const doneParam = searchParams.get("done")
  const limitParam = searchParams.get("limit")
  const sortParam = searchParams.get("sort")

  const doneFilter = doneParam === "true" ? true : false
  const take = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 200
  const orderBy =
    sortParam === "updatedAt_desc"
      ? { updatedAt: "desc" as const }
      : { order: "asc" as const }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id, done: doneFilter },
    orderBy,
    take,
    include: {
      subtasks: true,
      project: { select: { id: true, title: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  })

  return NextResponse.json(
    tasks.map((t) => ({ ...t, tags: t.tags.map((tt) => tt.tag) }))
  )
}
```

- [ ] **Step 3: Verify the dev server starts without TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start dev server (`npm run dev`), open browser, go to `/tasks`. Tasks should load normally (the default `done=false` filter matches what was there before).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat: add done/limit/sort params to GET /api/tasks"
```

---

### Task 2: Update `useTasks` — add `TaskFilters`, `buildTasksUrl`, `baseFilters`, `restoreTask`, `clearArchive`

**Files:**
- Modify: `src/hooks/useTasks.ts`
- Modify: `src/hooks/useTasks.test.ts`

- [ ] **Step 1: Write failing tests for `buildTasksUrl`**

Add to `src/hooks/useTasks.test.ts` (after the existing `filterTasks` describe block):

```typescript
import { describe, it, expect } from "vitest"
import { filterTasks, buildTasksUrl } from "./useTasks"
// ... existing makeTask and filterTasks tests remain unchanged ...

describe("buildTasksUrl", () => {
  it("returns /api/tasks with no filters", () => {
    expect(buildTasksUrl({})).toBe("/api/tasks")
  })

  it("includes done=true", () => {
    expect(buildTasksUrl({ done: true })).toBe("/api/tasks?done=true")
  })

  it("includes done=false", () => {
    expect(buildTasksUrl({ done: false })).toBe("/api/tasks?done=false")
  })

  it("includes q param", () => {
    expect(buildTasksUrl({ q: "hello" })).toBe("/api/tasks?q=hello")
  })

  it("includes sort param", () => {
    expect(buildTasksUrl({ sort: "updatedAt_desc" })).toBe(
      "/api/tasks?sort=updatedAt_desc"
    )
  })

  it("combines done and sort", () => {
    expect(buildTasksUrl({ done: true, sort: "updatedAt_desc" })).toBe(
      "/api/tasks?done=true&sort=updatedAt_desc"
    )
  })

  it("omits q when empty string", () => {
    expect(buildTasksUrl({ q: "" })).toBe("/api/tasks")
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npx vitest run
```

Expected: `buildTasksUrl` tests fail with "is not a function".

- [ ] **Step 3: Add `TaskFilters` type and `buildTasksUrl` to `src/hooks/useTasks.ts`**

Add after the existing imports, before `withPriorityScores`:

```typescript
export type TaskFilters = {
  done?: boolean
  q?: string
  sort?: "order" | "updatedAt_desc"
}

export function buildTasksUrl(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.done !== undefined) params.set("done", String(filters.done))
  if (filters.q) params.set("q", filters.q)
  if (filters.sort) params.set("sort", filters.sort)
  const str = params.toString()
  return str ? `/api/tasks?${str}` : "/api/tasks"
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Update `useTasks` signature and `fetchTasks`**

Change `useTasks()` function signature and `fetchTasks` in `src/hooks/useTasks.ts`:

Replace:
```typescript
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/tasks")
      if (!res.ok) throw new Error("Не удалось загрузить задачи")
      const data = await res.json()
      setTasks(withPriorityScores(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки задач")
    } finally {
      setIsLoading(false)
    }
  }, [])
```

With:
```typescript
export function useTasks(baseFilters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const baseFiltersRef = useRef(baseFilters)

  const fetchTasks = useCallback(async (overrideFilters: TaskFilters = {}) => {
    setIsLoading(true)
    setError(null)
    try {
      const filters = { ...baseFiltersRef.current, ...overrideFilters }
      const res = await fetch(buildTasksUrl(filters))
      if (!res.ok) throw new Error("Не удалось загрузить задачи")
      const data = await res.json()
      setTasks(withPriorityScores(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки задач")
    } finally {
      setIsLoading(false)
    }
  }, [])
```

Also add `useRef` to the import at the top of the file:
```typescript
import { useState, useCallback, useRef } from "react"
```

- [ ] **Step 6: Add `restoreTask` and `clearArchive` methods**

Add these two methods before the `return` statement in `useTasks`:

```typescript
  const restoreTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: false }),
      })
      if (!res.ok) throw new Error("Не удалось восстановить задачу")
    } catch (e) {
      fetchTasks()
      setError(e instanceof Error ? e.message : "Ошибка восстановления задачи")
    }
  }, [fetchTasks])

  const clearArchive = useCallback(async () => {
    let previous: Task[] = []
    setTasks((prev) => {
      previous = prev
      return []
    })
    try {
      const res = await fetch("/api/tasks?done=true", { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось очистить архив")
    } catch (e) {
      setTasks(previous)
      setError(e instanceof Error ? e.message : "Ошибка очистки архива")
    }
  }, [])
```

Add `restoreTask` and `clearArchive` to the return object:
```typescript
  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    toggleTask,
    deleteTask,
    renameTask,
    updateDueDate,
    reorderTasks,
    assignProject,
    removeProjectTasks,
    syncProjectRename,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateDescription,
    updateTags,
    restoreTask,
    clearArchive,
  }
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useTasks.ts src/hooks/useTasks.test.ts
git commit -m "feat: add TaskFilters, buildTasksUrl, restoreTask, clearArchive to useTasks"
```

---

### Task 3: `TaskSkeleton` component + `TaskList` loading state

**Files:**
- Create: `src/components/tasks/TaskSkeleton.tsx`
- Modify: `src/components/tasks/TaskList.tsx`

- [ ] **Step 1: Create `src/components/tasks/TaskSkeleton.tsx`**

```typescript
export function TaskSkeleton() {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Add `isLoading` prop to `TaskList`**

In `src/components/tasks/TaskList.tsx`, add `isLoading` to the props interface and import `TaskSkeleton`:

```typescript
import { TaskSkeleton } from "@/components/tasks/TaskSkeleton"

interface TaskListProps {
  tasks: Task[]
  filteredTasks: Task[]
  activeProjectId: string | null
  dateFilter: DateFilter
  isLoading?: boolean
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onUpdateDescription: (id: string, description: string) => Promise<void>
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
}
```

Add `isLoading` to destructuring and add early return at the top of `TaskList` function body:

```typescript
export function TaskList({
  tasks,
  filteredTasks,
  activeProjectId,
  dateFilter,
  isLoading,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskListProps) {
  if (isLoading) return <TaskSkeleton />

  return (
    // ... rest of the existing JSX unchanged ...
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test**

In `src/app/tasks/page.tsx`, temporarily change:
```typescript
const taskHook = useTasks()
```
to:
```typescript
const taskHook = { ...useTasks(), isLoading: true }
```
Reload `/tasks` — 5 gray animated rectangles should appear instead of the task list. Revert the change.

- [ ] **Step 5: Pass `isLoading` to `TaskList` in `page.tsx` and remove full-page loading spinner**

In `src/app/tasks/page.tsx`:

1. Remove `taskHook.isLoading` from the early return condition:

Replace:
```typescript
  if (status === "loading" || taskHook.isLoading) {
    return <p className="p-8">Загрузка...</p>
  }
```
With:
```typescript
  if (status === "loading") {
    return <p className="p-8">Загрузка...</p>
  }
```

2. Pass `isLoading` to `TaskList`:

Replace:
```typescript
        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
```
With:
```typescript
        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
          isLoading={taskHook.isLoading}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskSkeleton.tsx src/components/tasks/TaskList.tsx src/app/tasks/page.tsx
git commit -m "feat: add TaskSkeleton and isLoading to TaskList"
```

---

## Group B — Archive

---

### Task 4: Add `DELETE /api/tasks?done=true` to API

**Files:**
- Modify: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Add `DELETE` handler at the end of `src/app/api/tasks/route.ts`**

```typescript
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get("done") !== "true") {
    return NextResponse.json({ error: "Missing done=true param" }, { status: 400 })
  }

  await prisma.task.deleteMany({
    where: { userId: session.user.id, done: true },
  })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test**

With dev server running, open browser DevTools → Network tab. Go to `/tasks`, mark one task as done. Then in the console run:
```javascript
fetch('/api/tasks?done=true', { method: 'DELETE' }).then(r => console.log(r.status))
```
Expected: `204`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat: add DELETE /api/tasks?done=true bulk delete endpoint"
```

---

### Task 5: Build `/archive/page.tsx`

**Files:**
- Create: `src/app/archive/page.tsx`

- [ ] **Step 1: Create `src/app/archive/page.tsx`**

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useTasks } from "@/hooks/useTasks"
import { TaskSkeleton } from "@/components/tasks/TaskSkeleton"

export default function ArchivePage() {
  const { status } = useSession()
  const router = useRouter()
  const { tasks, isLoading, error, fetchTasks, deleteTask, restoreTask, clearArchive } =
    useTasks({ done: true, sort: "updatedAt_desc" })
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") fetchTasks()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-24 md:pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Архив</h1>
        <Link href="/tasks" className="text-sm text-gray-500 hover:text-gray-700">
          ← Задачи
        </Link>
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {tasks.length > 0 && (
        <div className="mb-4">
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Очистить архив
            </button>
          ) : (
            <span className="text-sm">
              Удалить все выполненные задачи?{" "}
              <button
                onClick={async () => {
                  await clearArchive()
                  setConfirmClear(false)
                }}
                className="text-red-600 font-medium hover:underline"
              >
                Да, удалить
              </button>
              {" · "}
              <button
                onClick={() => setConfirmClear(false)}
                className="text-gray-500 hover:underline"
              >
                Отмена
              </button>
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <TaskSkeleton />
      ) : tasks.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">
          Выполненных задач нет
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200"
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
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => restoreTask(task.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded border border-blue-200 hover:border-blue-400"
                >
                  Восстановить
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-red-200 hover:border-red-400"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test**

1. Go to `/tasks`, mark 2–3 tasks as done. Verify they disappear from the active list.
2. Navigate to `/archive`. Verify the completed tasks appear.
3. Click "Восстановить" on one task. Verify it disappears from archive.
4. Go to `/tasks`. Verify the restored task appears.
5. Go back to `/archive`. Click "Очистить архив" → confirm. Verify all archived tasks are deleted.

- [ ] **Step 4: Commit**

```bash
git add src/app/archive/page.tsx
git commit -m "feat: add /archive page with restore and bulk delete"
```

---

### Task 6: Update `BottomNav` — add Archive link

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/app/tasks/page.tsx` (add desktop header link)

- [ ] **Step 1: Replace `src/components/BottomNav.tsx`**

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type Props = {
  onAddClick?: () => void
}

export function BottomNav({ onAddClick }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200">
      <div className="flex items-stretch h-16">
        {/* Tasks */}
        <Link
          href="/tasks"
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs min-h-[44px] ${
            pathname === "/tasks" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Задачи
        </Link>

        {/* Add */}
        <button
          onClick={onAddClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 min-h-[44px]"
        >
          <span className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-light leading-none">
            +
          </span>
        </button>

        {/* Archive */}
        <Link
          href="/archive"
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs min-h-[44px] ${
            pathname === "/archive" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          Архив
        </Link>
      </div>
      {/* Safe area inset for iOS home indicator */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  )
}
```

Note: removed the "Проекты" scroll button (it was scroll-only, not navigation). The project tabs remain at the top of the tasks page. BottomNav is now also usable from the archive page since `onAddClick` is optional.

- [ ] **Step 2: Update `page.tsx` — `onAddClick` is still passed (no change needed)**

`page.tsx` already passes `onAddClick` to `BottomNav`. The prop is now optional but the call site still works with it. No change needed.

- [ ] **Step 3: Add `BottomNav` to archive page**

In `src/app/archive/page.tsx`, add `BottomNav` import and render:

```typescript
import { BottomNav } from "@/components/BottomNav"
```

Add inside `<main>`, after the closing `</ul>` (or `</p>` empty state):

```typescript
      <BottomNav />
```

- [ ] **Step 4: Add desktop Archive link to `src/app/tasks/page.tsx` header**

In `src/app/tasks/page.tsx`, add a `Link` to `/archive` next to the logout button. Update the header row:

```typescript
import Link from "next/link"
// (add to existing imports)
```

Replace the header div:
```typescript
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Мои задачи</h1>
          <div className="flex items-center gap-4">
            <Link href="/archive" className="hidden md:block text-sm text-gray-500 hover:text-gray-700">
              Архив
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Выйти
            </button>
          </div>
        </div>
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual test**

On mobile viewport (or DevTools mobile emulation):
1. Open `/tasks` — BottomNav shows "Задачи" (active/blue) and "Архив"
2. Tap "Архив" — navigates to `/archive`, "Архив" item turns blue
3. Tap "Задачи" — navigates back to `/tasks`
4. The `+` button on tasks page still focuses the input

On desktop:
5. Open `/tasks` — "Архив" link visible in header next to "Выйти"
6. Click "Архив" — navigates to `/archive`

- [ ] **Step 7: Commit**

```bash
git add src/components/BottomNav.tsx src/app/archive/page.tsx src/app/tasks/page.tsx
git commit -m "feat: add Archive link to BottomNav and desktop header"
```

---

## Group C — Search

---

### Task 7: Add `q` param to `GET /api/tasks` + create `SearchInput` component

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Create: `src/components/search/SearchInput.tsx`

- [ ] **Step 1: Add `q` param handling to `GET` in `src/app/api/tasks/route.ts`**

In the `GET` handler, after existing param parsing, add:

```typescript
  const q = searchParams.get("q") ?? undefined
```

Update the `where` clause:

```typescript
  const where: Parameters<typeof prisma.task.findMany>[0]["where"] = {
    userId: session.user.id,
    done: doneFilter,
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  }
```

Update the `findMany` call to use `where` and skip `take` when searching:

```typescript
  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    ...(q ? {} : { take }),
    include: {
      subtasks: true,
      project: { select: { id: true, title: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  })
```

The full updated `GET` handler:

```typescript
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const doneParam = searchParams.get("done")
  const limitParam = searchParams.get("limit")
  const sortParam = searchParams.get("sort")
  const q = searchParams.get("q") ?? undefined

  const doneFilter = doneParam === "true" ? true : false
  const take = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 200
  const orderBy =
    sortParam === "updatedAt_desc"
      ? { updatedAt: "desc" as const }
      : { order: "asc" as const }

  const where: Parameters<typeof prisma.task.findMany>[0]["where"] = {
    userId: session.user.id,
    done: doneFilter,
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    ...(q ? {} : { take }),
    include: {
      subtasks: true,
      project: { select: { id: true, title: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  })

  return NextResponse.json(
    tasks.map((t) => ({ ...t, tags: t.tags.map((tt) => tt.tag) }))
  )
}
```

- [ ] **Step 2: Create `src/components/search/SearchInput.tsx`**

```typescript
"use client"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative flex items-center">
      <svg
        className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Поиск задач..."
        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Очистить поиск"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/route.ts src/components/search/SearchInput.tsx
git commit -m "feat: add q search param to GET /api/tasks and SearchInput component"
```

---

### Task 8: Wire search in `page.tsx`

**Files:**
- Modify: `src/app/tasks/page.tsx`

- [ ] **Step 1: Add `searchQuery` state and imports**

In `src/app/tasks/page.tsx`, add to the existing imports:

```typescript
import { useEffect, useRef, useState } from "react"
// useEffect is already imported — this line shows the full import
import { SearchInput } from "@/components/search/SearchInput"
```

Add `searchQuery` state after the existing state declarations:

```typescript
  const [searchQuery, setSearchQuery] = useState("")
```

- [ ] **Step 2: Add debounced search effect**

Add this `useEffect` after the existing effects (after the `fetchProjects`/`fetchTags` effect):

```typescript
  useEffect(() => {
    if (status !== "authenticated") return
    const timer = setTimeout(() => {
      if (searchQuery) {
        setActiveProjectId(null)
        setDateFilter("all")
        setSelectedTagIds([])
        taskHook.fetchTasks({ q: searchQuery })
      } else {
        taskHook.fetchTasks()
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, status]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Add `SearchInput` to the JSX and search results label**

In `src/app/tasks/page.tsx`, in the header section, add `SearchInput` below the `<h1>` / logout row. The header already has the Archive link from Task 6. Replace the header section with:

```typescript
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Мои задачи</h1>
          <div className="flex items-center gap-4">
            <Link href="/archive" className="hidden md:block text-sm text-gray-500 hover:text-gray-700">
              Архив
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Выйти
            </button>
          </div>
        </div>

        <div className="mb-6">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>

        {searchQuery && (
          <p className="text-sm text-gray-500 mb-3">
            Результаты поиска для «{searchQuery}»
          </p>
        )}
```

- [ ] **Step 4: Hide project/date/tag filters during search**

Wrap the filters in a conditional so they are hidden while search is active:

```typescript
        {!searchQuery && (
          <>
            <ProjectTabs
              projects={projectHook.projects}
              activeProjectId={activeProjectId}
              onSelect={setActiveProjectId}
              onCreate={projectHook.createProject}
              onDelete={async (id) => {
                await projectHook.deleteProject(id)
                taskHook.removeProjectTasks(id)
                if (activeProjectId === id) setActiveProjectId(null)
              }}
              onRename={async (id, title) => {
                const updated = await projectHook.renameProject(id, title)
                taskHook.syncProjectRename(updated)
              }}
            />

            <DateFilters value={dateFilter} onChange={setDateFilter} />

            <TagFilter
              tags={tagHook.tags}
              selectedIds={selectedTagIds}
              onChange={setSelectedTagIds}
            />
          </>
        )}
```

- [ ] **Step 5: Update `filtered` to use all tasks when search is active**

The `filtered` variable currently passes through `filterTasks`. During search, `fetchTasks({ q })` already returns filtered results from the server, so client-side filtering should be skipped:

Replace:
```typescript
  const filtered = filterTasks(taskHook.tasks, dateFilter, activeProjectId).filter(
    (t) =>
      selectedTagIds.length === 0 ||
      selectedTagIds.some((id) => t.tags.some((tag) => tag.id === id))
  )
```
With:
```typescript
  const filtered = searchQuery
    ? taskHook.tasks
    : filterTasks(taskHook.tasks, dateFilter, activeProjectId).filter(
        (t) =>
          selectedTagIds.length === 0 ||
          selectedTagIds.some((id) => t.tags.some((tag) => tag.id === id))
      )
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 8: Manual test**

1. Open `/tasks` with several tasks
2. Type in the search box — after 300ms the task list updates to show matches only, filters disappear
3. Clear the search with × — filters reappear, full task list returns
4. Search for something that matches a task description (not title) — task appears in results
5. Search for something that matches nothing — empty state shown

- [ ] **Step 9: Commit**

```bash
git add src/app/tasks/page.tsx
git commit -m "feat: wire search in tasks page with debounce and filter reset"
```

---

## Done

All three groups shipped. Stage 3 complete.

Update `docs/superpowers/plans/../../../memory/project_roadmap.md` — mark Stage 3 as ✅ DONE with today's date and commit hashes.
