# Stage 2: Architecture Refactor + Labels & Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 621-line `tasks/page.tsx` into focused hooks and components (2a), then add position-based priority visual, task descriptions, and label tags (2b).

**Architecture:** Two sequential sub-stages. Stage 2a produces a thin coordinator (`~90 lines`) composing `useTasks` + `useProjects` hooks and six focused components. Stage 2b extends the schema with `Tag`/`TaskTag`/`description`, adds new API routes, and wires priority gradient + tag pills + description textarea into the refactored components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 5 / PostgreSQL, dnd-kit, Tailwind CSS v4, Vitest (added in this plan)

---

## File Map

### Stage 2a — new files
| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | Shared TypeScript types: `Task`, `Project`, `Subtask`, `DateFilter` |
| `src/hooks/useTasks.ts` | Fetch, optimistic create/update/delete/reorder, subtask ops |
| `src/hooks/useProjects.ts` | Fetch, create, rename, delete projects |
| `src/components/ErrorBoundary.tsx` | React class Error Boundary |
| `src/components/tasks/SubtaskPanel.tsx` | Subtask list + add form (self-contained) |
| `src/components/tasks/TaskItem.tsx` | Single task row with all inline interactions |
| `src/components/tasks/AddTaskForm.tsx` | New task creation form (sticky on mobile) |
| `src/components/tasks/TaskList.tsx` | `SortableContext` wrapper + empty states |
| `src/components/filters/DateFilters.tsx` | Date filter pill buttons |
| `src/components/projects/ProjectTabs.tsx` | Project tabs with drag targets, inline rename |

### Stage 2a — modified files
| File | Change |
|------|--------|
| `src/app/tasks/page.tsx` | Rewritten as thin coordinator (~90 lines) |

### Stage 2b — new files
| File | Responsibility |
|------|---------------|
| `src/hooks/useTags.ts` | Fetch + create tags |
| `src/components/filters/TagFilter.tsx` | Tag multi-select filter strip |
| `src/app/api/tags/route.ts` | `GET` list tags, `POST` create tag |

### Stage 2b — modified files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `description` to Task; add `Tag`, `TaskTag` models |
| `src/app/api/tasks/route.ts` | `GET`: include tags + transform; `POST`: order-0 insert + tags |
| `src/app/api/tasks/[id]/route.ts` | `PATCH`: handle `description` + `tagIds` relation |
| `src/types/index.ts` | Add `Tag` type, `description`/`tags`/`priorityScore` to `Task` |
| `src/hooks/useTasks.ts` | Add `priorityScore` derivation, `updateDescription`, `updateTags` |
| `src/components/tasks/TaskItem.tsx` | Add priority border, tag pills, description textarea |
| `src/components/tasks/AddTaskForm.tsx` | Add tag selector + expose `tagIds` in submit |
| `src/app/tasks/page.tsx` | Add `tagHook`, `selectedTagIds` state, `TagFilter` in JSX |

---

## Stage 2a: Architecture Refactor

---

### Task 1: Shared types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/index.ts

export type Subtask = {
  id: string
  title: string
  done: boolean
}

export type Task = {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  recurrence: string | null
  order: number
  project: { id: string; title: string } | null
  subtasks: Subtask[]
}

export type Project = {
  id: string
  title: string
}

export type DateFilter = "all" | "today" | "week" | "someday"
```

- [ ] **Step 2: Verify TypeScript accepts it**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `src/types/index.ts`

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 2: Vitest setup

**Files:**
- Modify: `package.json`, `vitest.config.ts` (new)

- [ ] **Step 1: Install Vitest**

```bash
cd C:/Claude/task-manager && npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, inside `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Verify Vitest runs**

```bash
cd C:/Claude/task-manager && npm test 2>&1 | head -10
```

Expected: "No test files found" or passes with zero tests (not an error exit).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add Vitest test runner"
```

---

### Task 3: `useTasks` hook

**Files:**
- Create: `src/hooks/useTasks.ts`
- Create: `src/hooks/useTasks.test.ts`

- [ ] **Step 1: Write the test for `filterTasks` pure function**

```ts
// src/hooks/useTasks.test.ts
import { describe, it, expect } from "vitest"
import { filterTasks } from "./useTasks"
import type { Task } from "@/types"

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1",
    title: "Test",
    done: false,
    dueDate: null,
    recurrence: null,
    order: 0,
    project: null,
    subtasks: [],
    ...overrides,
  }
}

describe("filterTasks", () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const in10Days = new Date(today)
  in10Days.setDate(today.getDate() + 10)

  it("returns all tasks when filter is 'all' and no project", () => {
    const tasks = [makeTask({ id: "1" }), makeTask({ id: "2" })]
    expect(filterTasks(tasks, "all", null)).toHaveLength(2)
  })

  it("filters by project", () => {
    const tasks = [
      makeTask({ id: "1", project: { id: "p1", title: "A" } }),
      makeTask({ id: "2", project: { id: "p2", title: "B" } }),
    ]
    expect(filterTasks(tasks, "all", "p1")).toHaveLength(1)
    expect(filterTasks(tasks, "all", "p1")[0].id).toBe("1")
  })

  it("filters 'today': includes tasks due today, excludes others", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: today.toISOString() }),
      makeTask({ id: "2", dueDate: tomorrow.toISOString() }),
      makeTask({ id: "3", dueDate: null }),
    ]
    const result = filterTasks(tasks, "today", null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("filters 'week': includes tasks from tomorrow through 7 days", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: today.toISOString() }),
      makeTask({ id: "2", dueDate: tomorrow.toISOString() }),
      makeTask({ id: "3", dueDate: in10Days.toISOString() }),
    ]
    const result = filterTasks(tasks, "week", null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("filters 'someday': includes tasks due 7+ days from today", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: tomorrow.toISOString() }),
      makeTask({ id: "2", dueDate: in10Days.toISOString() }),
    ]
    const result = filterTasks(tasks, "someday", null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd C:/Claude/task-manager && npm test 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module './useTasks'` or similar.

- [ ] **Step 3: Create the hook**

```ts
// src/hooks/useTasks.ts
"use client"

import { useState, useCallback } from "react"
import type { Task, Subtask, DateFilter, Project } from "@/types"

export type CreateTaskInput = {
  title: string
  dueDate?: string
  recurrence?: string
  projectId?: string
}

export function filterTasks(
  tasks: Task[],
  dateFilter: DateFilter,
  activeProjectId: string | null
): Task[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  return tasks.filter((t) => {
    if (activeProjectId && t.project?.id !== activeProjectId) return false
    if (dateFilter === "today") {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    }
    if (dateFilter === "week") {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      d.setHours(0, 0, 0, 0)
      return d.getTime() > today.getTime() && d < weekEnd
    }
    if (dateFilter === "someday") {
      if (!t.dueDate) return false
      return new Date(t.dueDate) >= weekEnd
    }
    return true
  })
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/tasks")
      const data = await res.json()
      setTasks(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createTask = useCallback(
    async (input: CreateTaskInput, projects: Project[]) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Не удалось создать задачу")
      const task = await res.json()
      const project = input.projectId
        ? (projects.find((p) => p.id === input.projectId) ?? null)
        : null
      setTasks((prev) => [{ ...task, subtasks: [], project }, ...prev])
    },
    []
  )

  const toggleTask = useCallback(async (task: Task) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    })
    const updated = await res.json()
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updated.id
          ? { ...updated, subtasks: t.subtasks, project: t.project }
          : t
      )
    )
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const renameTask = useCallback(async (id: string, title: string) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    const updated = await res.json()
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updated.id
          ? { ...updated, subtasks: t.subtasks, project: t.project }
          : t
      )
    )
  }, [])

  const updateDueDate = useCallback(async (taskId: string, value: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: value ? new Date(value).toISOString() : null }),
    })
    const updated = await res.json()
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updated.id
          ? { ...updated, subtasks: t.subtasks, project: t.project }
          : t
      )
    )
  }, [])

  const reorderTasks = useCallback(async (newTasks: Task[]) => {
    setTasks(newTasks)
    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTasks.map((t, i) => ({ id: t.id, order: i }))),
    })
  }, [])

  const assignProject = useCallback(
    async (
      taskId: string,
      projectId: string | null,
      newProject: { id: string; title: string } | null
    ) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, ...updated, subtasks: t.subtasks, project: newProject }
            : t
        )
      )
    },
    []
  )

  const removeProjectTasks = useCallback((projectId: string) => {
    setTasks((prev) => prev.filter((t) => t.project?.id !== projectId))
  }, [])

  const syncProjectRename = useCallback(
    (updated: { id: string; title: string }) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.project?.id === updated.id ? { ...t, project: updated } : t
        )
      )
    },
    []
  )

  const addSubtask = useCallback(async (taskId: string, title: string) => {
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    const subtask = await res.json()
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t
      )
    )
  }, [])

  const toggleSubtask = useCallback(async (taskId: string, subtask: Subtask) => {
    const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !subtask.done }),
    })
    const updated = await res.json()
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === updated.id ? updated : s)) }
          : t
      )
    )
  }, [])

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" })
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
          : t
      )
    )
  }, [])

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
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd C:/Claude/task-manager && npm test 2>&1 | tail -20
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTasks.ts src/hooks/useTasks.test.ts
git commit -m "feat: add useTasks hook with filterTasks utility and tests"
```

---

### Task 4: `useProjects` hook

**Files:**
- Create: `src/hooks/useProjects.ts`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useProjects.ts
"use client"

import { useState, useCallback } from "react"
import type { Project } from "@/types"

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects")
    const data = await res.json()
    setProjects(data)
  }, [])

  const createProject = useCallback(async (title: string): Promise<Project> => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error("Не удалось создать проект")
    const project = await res.json()
    setProjects((prev) => [...prev, project])
    return project
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const renameProject = useCallback(
    async (id: string, title: string): Promise<Project> => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      const updated = await res.json()
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      return updated
    },
    []
  )

  return { projects, fetchProjects, createProject, deleteProject, renameProject }
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProjects.ts
git commit -m "feat: add useProjects hook"
```

---

### Task 5: `ErrorBoundary` component

**Files:**
- Create: `src/components/ErrorBoundary.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ErrorBoundary.tsx
"use client"

import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 rounded bg-red-50 text-sm text-red-600">
          <p className="mb-2">Что-то пошло не так</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="underline"
          >
            Перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ErrorBoundary.tsx
git commit -m "feat: add ErrorBoundary component"
```

---

### Task 6: `SubtaskPanel` component

**Files:**
- Create: `src/components/tasks/SubtaskPanel.tsx`

- [ ] **Step 1: Create the directory and component**

```tsx
// src/components/tasks/SubtaskPanel.tsx
"use client"

import { useState } from "react"
import type { Subtask } from "@/types"

interface SubtaskPanelProps {
  taskId: string
  subtasks: Subtask[]
  onAdd: (taskId: string, title: string) => Promise<void>
  onToggle: (taskId: string, subtask: Subtask) => Promise<void>
  onDelete: (taskId: string, subtaskId: string) => Promise<void>
}

export function SubtaskPanel({
  taskId,
  subtasks,
  onAdd,
  onToggle,
  onDelete,
}: SubtaskPanelProps) {
  const [input, setInput] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    await onAdd(taskId, input.trim())
    setInput("")
  }

  return (
    <div className="mt-3 pl-6">
      <ul className="flex flex-col gap-2 mb-2">
        {subtasks.map((subtask) => (
          <li key={subtask.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subtask.done}
                onChange={() => onToggle(taskId, subtask)}
              />
              <span
                className={
                  subtask.done ? "line-through text-gray-400 text-sm" : "text-sm"
                }
              >
                {subtask.title}
              </span>
            </div>
            <button
              onClick={() => onDelete(taskId, subtask.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Новая подзадача..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border p-1 rounded text-sm flex-1"
        />
        <button
          type="submit"
          className="bg-blue-400 text-white px-3 rounded text-sm"
        >
          +
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/SubtaskPanel.tsx
git commit -m "feat: add SubtaskPanel component"
```

---

### Task 7: `TaskItem` component

**Files:**
- Create: `src/components/tasks/TaskItem.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/tasks/TaskItem.tsx
"use client"

import { useState } from "react"
import { SwipeableRow } from "@/components/SwipeableRow"
import { SubtaskPanel } from "@/components/tasks/SubtaskPanel"
import type { Task, Subtask } from "@/types"

interface TaskItemProps {
  task: Task
  showProject: boolean
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
}

export function TaskItem({
  task,
  showProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")

  function startEdit() {
    setEditing(true)
    setEditTitle(task.title)
  }

  async function commitRename() {
    if (!editTitle.trim() || editTitle === task.title) {
      setEditing(false)
      return
    }
    await onRename(task.id, editTitle.trim())
    setEditing(false)
  }

  return (
    <SwipeableRow
      onSubtasks={() => setIsOpen((o) => !o)}
      onDelete={() => onDelete(task.id)}
      subtasksLabel={isOpen ? "Свернуть" : "Подзадачи"}
    >
      <div className="border rounded p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => onToggle(task)}
            />
            {showProject && task.project && (
              <span className="text-xs text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
                {task.project.title}
              </span>
            )}
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename()
                  if (e.key === "Escape") setEditing(false)
                }}
                className="border p-1 rounded text-sm"
                autoFocus
              />
            ) : (
              <span
                className={task.done ? "line-through text-gray-400" : ""}
                onDoubleClick={startEdit}
              >
                {task.title}
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              id={`date-${task.id}`}
              defaultValue={
                task.dueDate
                  ? new Date(task.dueDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
              className="sr-only"
            />
            {task.recurrence && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-400">
                {
                  { daily: "↻ день", weekly: "↻ неделя", monthly: "↻ месяц" }[
                    task.recurrence
                  ]
                }
              </span>
            )}
            {task.dueDate ? (
              <span
                onClick={() =>
                  (
                    document.getElementById(`date-${task.id}`) as HTMLInputElement
                  )?.showPicker()
                }
                className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                  new Date(task.dueDate) < new Date() && !task.done
                    ? "text-red-500 bg-red-50"
                    : "text-gray-400 bg-gray-100"
                }`}
              >
                {new Date(task.dueDate).toLocaleDateString("ru-RU")}
              </span>
            ) : (
              <button
                onClick={() =>
                  (
                    document.getElementById(`date-${task.id}`) as HTMLInputElement
                  )?.showPicker()
                }
                className="text-xs text-gray-300 hover:text-gray-500"
              >
                + дата
              </button>
            )}
            <button
              onClick={() => setIsOpen((o) => !o)}
              className="hidden md:block text-sm text-blue-400 hover:text-blue-600 min-h-[44px] px-2"
            >
              {isOpen ? "Свернуть" : "Подзадачи"}
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="hidden md:block text-sm text-red-400 hover:text-red-600 min-h-[44px] px-2"
            >
              Удалить
            </button>
          </div>
        </div>

        {isOpen && (
          <SubtaskPanel
            taskId={task.id}
            subtasks={task.subtasks}
            onAdd={onAddSubtask}
            onToggle={onToggleSubtask}
            onDelete={onDeleteSubtask}
          />
        )}
      </div>
    </SwipeableRow>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskItem.tsx
git commit -m "feat: add TaskItem component"
```

---

### Task 8: `AddTaskForm` component

**Files:**
- Create: `src/components/tasks/AddTaskForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/tasks/AddTaskForm.tsx
"use client"

import { useState } from "react"
import type { CreateTaskInput } from "@/hooks/useTasks"
import type { Project } from "@/types"

interface AddTaskFormProps {
  activeProjectId: string | null
  projects: Project[]
  inputRef: React.RefObject<HTMLInputElement>
  onSubmit: (input: CreateTaskInput) => Promise<void>
}

export function AddTaskForm({
  activeProjectId,
  projects,
  inputRef,
  onSubmit,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [recurrence, setRecurrence] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        ...(dueDate && { dueDate }),
        ...(recurrence && { recurrence }),
        ...(activeProjectId && { projectId: activeProjectId }),
      })
      setTitle("")
      setDueDate("")
      setRecurrence("")
    } catch {
      setError("Не удалось создать задачу. Попробуйте ещё раз.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const placeholder = activeProjectId
    ? `Задача в «${projects.find((p) => p.id === activeProjectId)?.title}»...`
    : "Новая задача..."

  return (
    <div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 mb-6 md:static md:shadow-none md:bg-transparent sticky bottom-[80px] z-30 bg-white rounded-lg focus-within:shadow-lg focus-within:px-3 focus-within:py-2 transition-all"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-500 text-white px-4 rounded disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Добавить"}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500 flex-1"
          />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500"
          >
            <option value="">Не повторять</option>
            <option value="daily">Каждый день</option>
            <option value="weekly">Каждую неделю</option>
            <option value="monthly">Каждый месяц</option>
          </select>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/AddTaskForm.tsx
git commit -m "feat: add AddTaskForm component"
```

---

### Task 9: `DateFilters` component

**Files:**
- Create: `src/components/filters/DateFilters.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/filters/DateFilters.tsx
"use client"

import type { DateFilter } from "@/types"

interface DateFiltersProps {
  value: DateFilter
  onChange: (filter: DateFilter) => void
}

const LABELS: Record<DateFilter, string> = {
  all: "Все",
  today: "Сегодня",
  week: "Неделя",
  someday: "Когда-нибудь",
}

export function DateFilters({ value, onChange }: DateFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {(["all", "today", "week", "someday"] as const).map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`text-sm px-3 py-1 rounded-full border ${
            value === filter
              ? "bg-gray-700 text-white border-gray-700"
              : "text-gray-500 hover:border-gray-400"
          }`}
        >
          {LABELS[filter]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/filters/DateFilters.tsx
git commit -m "feat: add DateFilters component"
```

---

### Task 10: `ProjectTabs` component

**Files:**
- Create: `src/components/projects/ProjectTabs.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/projects/ProjectTabs.tsx
"use client"

import { useState } from "react"
import { DroppableProject } from "@/components/DroppableProject"
import type { Project } from "@/types"

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  onSelect: (id: string | null) => void
  onCreate: (title: string) => Promise<Project>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
}

export function ProjectTabs({
  projects,
  activeProjectId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: ProjectTabsProps) {
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setError(null)
    try {
      const project = await onCreate(newTitle.trim())
      setNewTitle("")
      setShowNew(false)
      onSelect(project.id)
    } catch {
      setError("Не удалось создать проект. Попробуйте ещё раз.")
    }
  }

  async function handleRename(id: string) {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    await onRename(id, editingTitle.trim())
    setEditingId(null)
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {error && <p className="text-sm text-red-500 w-full">{error}</p>}

      <DroppableProject id="all">
        <button
          onClick={() => onSelect(null)}
          className={`text-sm px-3 py-1 rounded-full border min-h-[44px] ${
            activeProjectId === null
              ? "bg-blue-500 text-white border-blue-500"
              : "text-gray-500 hover:border-gray-400"
          }`}
        >
          Все задачи
        </button>
      </DroppableProject>

      {projects.map((project) => (
        <div key={project.id} className="flex items-center gap-1">
          <DroppableProject id={project.id}>
            {editingId === project.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleRename(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(project.id)
                  if (e.key === "Escape") setEditingId(null)
                }}
                className="border p-1 rounded text-sm w-32"
                autoFocus
              />
            ) : (
              <button
                onClick={() => onSelect(project.id)}
                onDoubleClick={() => {
                  setEditingId(project.id)
                  setEditingTitle(project.title)
                }}
                className={`text-sm px-3 py-1 rounded-full border min-h-[44px] ${
                  activeProjectId === project.id
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-gray-500 hover:border-gray-400"
                }`}
              >
                {project.title}
              </button>
            )}
            {activeProjectId === project.id && editingId !== project.id && (
              <button
                onClick={() => onDelete(project.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            )}
          </DroppableProject>
        </div>
      ))}

      {showNew ? (
        <form onSubmit={handleCreate} className="flex gap-1">
          <input
            type="text"
            placeholder="Название проекта..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="border p-1 rounded text-sm"
            autoFocus
            onBlur={() => {
              if (!newTitle) setShowNew(false)
            }}
          />
          <button
            type="submit"
            className="text-sm bg-blue-500 text-white px-2 rounded"
          >
            +
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="text-sm px-3 py-1 rounded-full border border-dashed text-gray-400 hover:text-gray-600"
        >
          + проект
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/projects/ProjectTabs.tsx
git commit -m "feat: add ProjectTabs component"
```

---

### Task 11: `TaskList` component with empty states

**Files:**
- Create: `src/components/tasks/TaskList.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/tasks/TaskList.tsx
"use client"

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { SortableTask } from "@/components/SortableTask"
import { TaskItem } from "@/components/tasks/TaskItem"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import type { Task, Subtask, DateFilter } from "@/types"

interface TaskListProps {
  tasks: Task[]
  filteredTasks: Task[]
  activeProjectId: string | null
  dateFilter: DateFilter
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
}

function emptyMessage(
  dateFilter: DateFilter,
  activeProjectId: string | null,
  allEmpty: boolean
): string {
  if (allEmpty) return "Добавьте первую задачу"
  if (activeProjectId) return "Перетащите задачи в этот проект"
  return "Нет задач с таким фильтром"
}

export function TaskList({
  tasks,
  filteredTasks,
  activeProjectId,
  dateFilter,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskListProps) {
  return (
    <ErrorBoundary>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul id="task-list" className="flex flex-col gap-3">
          {filteredTasks.length === 0 ? (
            <li className="text-center text-gray-400 py-8 text-sm">
              {emptyMessage(dateFilter, activeProjectId, tasks.length === 0)}
            </li>
          ) : (
            filteredTasks.map((task) => (
              <SortableTask key={task.id} id={task.id}>
                <TaskItem
                  task={task}
                  showProject={!activeProjectId}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onRename={onRename}
                  onUpdateDueDate={onUpdateDueDate}
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                />
              </SortableTask>
            ))
          )}
        </ul>
      </SortableContext>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskList.tsx
git commit -m "feat: add TaskList component with empty states"
```

---

### Task 12: Refactor `page.tsx` to thin coordinator

**Files:**
- Modify: `src/app/tasks/page.tsx`

> This is the most critical step. It replaces the entire file.

- [ ] **Step 1: Replace `src/app/tasks/page.tsx` entirely**

```tsx
// src/app/tasks/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useTasks, filterTasks } from "@/hooks/useTasks"
import { useProjects } from "@/hooks/useProjects"
import { TaskList } from "@/components/tasks/TaskList"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { ProjectTabs } from "@/components/projects/ProjectTabs"
import { DateFilters } from "@/components/filters/DateFilters"
import { BottomNav } from "@/components/BottomNav"
import type { DateFilter } from "@/types"

export default function TasksPage() {
  const { status } = useSession()
  const router = useRouter()
  const titleInputRef = useRef<HTMLInputElement>(null!)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")

  const taskHook = useTasks()
  const projectHook = useProjects()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      taskHook.fetchTasks()
      projectHook.fetchProjects()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragStart(_event: DragStartEvent) {}

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const projectTabIds = ["all", ...projectHook.projects.map((p) => p.id)]

    if (projectTabIds.includes(over.id as string)) {
      const projectId = over.id === "all" ? null : (over.id as string)
      const task = taskHook.tasks.find((t) => t.id === taskId)
      if (!task || task.project?.id === projectId) return
      const newProject = projectId
        ? (projectHook.projects.find((p) => p.id === projectId) ?? null)
        : null
      await taskHook.assignProject(taskId, projectId, newProject)
      return
    }

    if (active.id !== over.id) {
      const oldIndex = taskHook.tasks.findIndex((t) => t.id === active.id)
      const newIndex = taskHook.tasks.findIndex((t) => t.id === over.id)
      const newTasks = arrayMove(taskHook.tasks, oldIndex, newIndex)
      await taskHook.reorderTasks(newTasks)
    }
  }

  const filtered = filterTasks(taskHook.tasks, dateFilter, activeProjectId)

  if (status === "loading" || taskHook.isLoading) {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Мои задачи</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Выйти
          </button>
        </div>

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

        <AddTaskForm
          activeProjectId={activeProjectId}
          projects={projectHook.projects}
          inputRef={titleInputRef}
          onSubmit={(input) => taskHook.createTask(input, projectHook.projects)}
        />

        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
          activeProjectId={activeProjectId}
          dateFilter={dateFilter}
          onToggle={taskHook.toggleTask}
          onDelete={taskHook.deleteTask}
          onRename={taskHook.renameTask}
          onUpdateDueDate={taskHook.updateDueDate}
          onAddSubtask={taskHook.addSubtask}
          onToggleSubtask={taskHook.toggleSubtask}
          onDeleteSubtask={taskHook.deleteSubtask}
        />

        <BottomNav
          onAddClick={() => {
            titleInputRef.current?.focus()
            titleInputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }}
        />
      </main>
    </DndContext>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Fix any type mismatches before proceeding.

- [ ] **Step 3: Start dev server and manually verify**

```bash
cd C:/Claude/task-manager && npm run dev
```

Open `http://localhost:3000/tasks` and verify:
- [ ] Tasks list loads
- [ ] Adding a new task works
- [ ] Checkbox toggle works
- [ ] Double-click to rename task works
- [ ] Date picker opens on click
- [ ] Delete task (desktop buttons + mobile swipe) works
- [ ] Subtask panel opens, add/toggle/delete subtasks works
- [ ] Project tabs filter tasks
- [ ] Drag task to project tab changes project
- [ ] Drag to reorder within list works
- [ ] Date filters (Today / Week / Someday) work
- [ ] Empty state shows "Добавьте первую задачу" when no tasks
- [ ] Empty state shows "Нет задач с таким фильтром" when filter matches nothing

- [ ] **Step 4: Run tests to confirm filter logic unchanged**

```bash
cd C:/Claude/task-manager && npm test 2>&1 | tail -10
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/tasks/page.tsx
git commit -m "refactor: split tasks/page.tsx into focused hooks and components"
```

---

## Stage 2b: Labels + Description + Priority Visual

---

### Task 13: Prisma schema — add `description`, `Tag`, `TaskTag`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_stage2b/` (auto-generated)

- [ ] **Step 1: Update `prisma/schema.prisma`**

Add `description` to the `Task` model and add two new models. Also add the `tags` backrelation to `User`. The full modified schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  tasks     Task[]
  projects  Project[]
  tags      Tag[]
  createdAt DateTime  @default(now())
}

model Task {
  id          String    @id @default(cuid())
  title       String
  done        Boolean   @default(false)
  dueDate     DateTime?
  recurrence  String?
  description String?
  order       Int       @default(0)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id])
  subtasks    Subtask[]
  tags        TaskTag[]
  createdAt   DateTime  @default(now())
}

model Subtask {
  id        String   @id @default(cuid())
  title     String
  done      Boolean  @default(false)
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Project {
  id        String   @id @default(cuid())
  title     String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  tasks     Task[]
  createdAt DateTime @default(now())
}

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

- [ ] **Step 2: Run migration**

```bash
cd C:/Claude/task-manager && npx prisma migrate dev --name stage2b_tags_description
```

Expected output: `The following migration(s) have been applied: ... stage2b_tags_description`

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd C:/Claude/task-manager && npx prisma generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Tag, TaskTag models and Task.description field"
```

---

### Task 14: `GET/POST /api/tags` route

**Files:**
- Create: `src/app/api/tags/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/tags/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(tags)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, color } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const tag = await prisma.tag.create({
    data: {
      name: name.trim(),
      color: color ?? "#6b7280",
      userId: session.user.id,
    },
  })
  return NextResponse.json(tag)
}
```

- [ ] **Step 2: Verify with curl (dev server must be running)**

```bash
# Replace <token> with a session cookie or use browser DevTools
curl -s http://localhost:3000/api/tags -H "Cookie: <your-session-cookie>"
```

Expected: `[]` (empty array for new user)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tags/route.ts
git commit -m "feat: add GET/POST /api/tags route"
```

---

### Task 15: Update `GET /api/tasks` — include tags

**Files:**
- Modify: `src/app/api/tasks/route.ts` (GET handler only)

- [ ] **Step 1: Update the GET handler in `src/app/api/tasks/route.ts`**

Replace the existing GET function with:

```ts
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
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

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat: include tags in GET /api/tasks response"
```

---

### Task 16: Update `POST /api/tasks` — order-0 insert + tags

**Files:**
- Modify: `src/app/api/tasks/route.ts` (POST handler)

- [ ] **Step 1: Replace the POST handler in `src/app/api/tasks/route.ts`**

```ts
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, projectId, dueDate, recurrence, tagIds } = await req.json()

  const task = await prisma.$transaction(async (tx) => {
    // Shift all existing tasks down to make room at order 0
    await tx.task.updateMany({
      where: { userId: session.user.id },
      data: { order: { increment: 1 } },
    })

    return tx.task.create({
      data: {
        title,
        userId: session.user.id,
        order: 0,
        ...(projectId && { projectId }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(recurrence && { recurrence }),
        ...(Array.isArray(tagIds) && tagIds.length > 0 && {
          tags: { create: tagIds.map((tagId: string) => ({ tagId })) },
        }),
      },
      include: {
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    })
  })

  return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat: POST /api/tasks inserts at order 0 and supports tagIds"
```

---

### Task 17: Update `PATCH /api/tasks/[id]` — description + tagIds

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Replace the PATCH handler**

```ts
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { tagIds, done, title, dueDate, recurrence, projectId, description } =
    await req.json()

  if (recurrence !== undefined && recurrence !== null) {
    const valid = ["daily", "weekly", "monthly"]
    if (!valid.includes(recurrence)) {
      return NextResponse.json(
        { error: "Invalid recurrence value" },
        { status: 400 }
      )
    }
  }

  // Recurrence tasks: advance due date instead of marking done
  if (done === true) {
    const existing = await prisma.task.findUnique({ where: { id } })
    if (existing?.recurrence && existing.dueDate) {
      const next = new Date(existing.dueDate)
      if (existing.recurrence === "daily") next.setDate(next.getDate() + 1)
      if (existing.recurrence === "weekly") next.setDate(next.getDate() + 7)
      if (existing.recurrence === "monthly") next.setMonth(next.getMonth() + 1)

      const task = await prisma.task.update({
        where: { id, userId: session.user.id },
        data: { dueDate: next, done: false },
        include: {
          project: { select: { id: true, title: true } },
          subtasks: true,
          tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        },
      })
      return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
    }
  }

  // Build update data from explicit fields only
  const data: Record<string, unknown> = {}
  if (done !== undefined) data.done = done
  if (title !== undefined) data.title = title
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
  if (recurrence !== undefined) data.recurrence = recurrence
  if (projectId !== undefined) data.projectId = projectId
  if (description !== undefined) data.description = description
  if (Array.isArray(tagIds)) {
    data.tags = {
      deleteMany: {},
      create: tagIds.map((tagId: string) => ({ tagId })),
    }
  }

  const task = await prisma.task.update({
    where: { id, userId: session.user.id },
    data,
    include: {
      project: { select: { id: true, title: true } },
      subtasks: true,
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  })

  return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
}
```

The DELETE handler remains unchanged.

- [ ] **Step 2: Verify TypeScript**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat: PATCH /api/tasks/[id] supports description and tagIds"
```

---

### Task 18: Update types + create `useTags` hook

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/hooks/useTags.ts`

- [ ] **Step 1: Update `src/types/index.ts`**

Replace the entire file:

```ts
// src/types/index.ts

export type Subtask = {
  id: string
  title: string
  done: boolean
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type Task = {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  recurrence: string | null
  description: string | null
  order: number
  project: { id: string; title: string } | null
  subtasks: Subtask[]
  tags: Tag[]
  priorityScore: number
}

export type Project = {
  id: string
  title: string
}

export type DateFilter = "all" | "today" | "week" | "someday"
```

- [ ] **Step 2: Create `src/hooks/useTags.ts`**

```ts
// src/hooks/useTags.ts
"use client"

import { useState, useCallback } from "react"
import type { Tag } from "@/types"

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags")
    const data = await res.json()
    setTags(data)
  }, [])

  const createTag = useCallback(
    async (name: string, color?: string): Promise<Tag> => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) throw new Error("Не удалось создать метку")
      const tag = await res.json()
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      return tag
    },
    []
  )

  return { tags, fetchTags, createTag }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/hooks/useTags.ts
git commit -m "feat: add Tag type, priorityScore to Task type, useTags hook"
```

---

### Task 19: Update `useTasks` — `priorityScore`, `updateDescription`, `updateTags`

**Files:**
- Modify: `src/hooks/useTasks.ts`

- [ ] **Step 1: Update `CreateTaskInput` to include `tagIds`**

Find and replace the `CreateTaskInput` type:

```ts
export type CreateTaskInput = {
  title: string
  dueDate?: string
  recurrence?: string
  projectId?: string
  tagIds?: string[]
}
```

- [ ] **Step 2: Add `withPriorityScores` helper after the imports**

Insert after the imports, before `filterTasks`:

```ts
function withPriorityScores(tasks: Omit<Task, "priorityScore">[]): Task[] {
  const n = tasks.length
  return tasks.map((t) => ({
    ...t,
    priorityScore: n <= 1 ? 1 : 1 - t.order / (n - 1),
  }))
}
```

- [ ] **Step 3: Wrap `setTasks` calls with `withPriorityScores`**

In `fetchTasks`, change:
```ts
setTasks(data)
```
to:
```ts
setTasks(withPriorityScores(data))
```

In `createTask`, change:
```ts
setTasks((prev) => [{ ...task, subtasks: [], project }, ...prev])
```
to:
```ts
setTasks((prev) => {
  const shifted = prev.map((t) => ({ ...t, order: t.order + 1 }))
  return withPriorityScores([{ ...task, subtasks: [], project, tags: task.tags ?? [] }, ...shifted])
})
```

In `deleteTask`, change:
```ts
setTasks((prev) => prev.filter((t) => t.id !== id))
```
to:
```ts
setTasks((prev) => withPriorityScores(prev.filter((t) => t.id !== id)))
```

In `reorderTasks`, change:
```ts
setTasks(newTasks)
```
to:
```ts
setTasks(withPriorityScores(newTasks.map((t, i) => ({ ...t, order: i }))))
```

- [ ] **Step 4: Add `updateDescription` and `updateTags` methods**

Add these two methods inside `useTasks`, after `deleteSubtask`:

```ts
const updateDescription = useCallback(async (id: string, description: string) => {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  })
  const updated = await res.json()
  setTasks((prev) =>
    prev.map((t) =>
      t.id === updated.id
        ? { ...updated, subtasks: t.subtasks, project: t.project, priorityScore: t.priorityScore }
        : t
    )
  )
}, [])

const updateTags = useCallback(async (id: string, tagIds: string[]) => {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagIds }),
  })
  const updated = await res.json()
  setTasks((prev) =>
    prev.map((t) =>
      t.id === updated.id
        ? { ...updated, subtasks: t.subtasks, project: t.project, priorityScore: t.priorityScore }
        : t
    )
  )
}, [])
```

- [ ] **Step 5: Add `updateDescription` and `updateTags` to the return object**

```ts
return {
  // ... existing fields ...
  updateDescription,
  updateTags,
}
```

- [ ] **Step 6: Update the test file to match new Task type**

In `src/hooks/useTasks.test.ts`, update `makeTask` to include the new fields:

```ts
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1",
    title: "Test",
    done: false,
    dueDate: null,
    recurrence: null,
    description: null,
    order: 0,
    project: null,
    subtasks: [],
    tags: [],
    priorityScore: 1,
    ...overrides,
  }
}
```

- [ ] **Step 7: Run tests**

```bash
cd C:/Claude/task-manager && npm test 2>&1 | tail -10
```

Expected: 5 tests pass.

- [ ] **Step 8: TypeScript check**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If there are errors about `tags` being required on optimistic updates in other setTasks calls, add `tags: t.tags` to those merges.

- [ ] **Step 9: Commit**

```bash
git add src/hooks/useTasks.ts src/hooks/useTasks.test.ts
git commit -m "feat: add priorityScore, updateDescription, updateTags to useTasks"
```

---

### Task 20: `TagFilter` component

**Files:**
- Create: `src/components/filters/TagFilter.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/filters/TagFilter.tsx
"use client"

import type { Tag } from "@/types"

interface TagFilterProps {
  tags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function TagFilter({ tags, selectedIds, onChange }: TagFilterProps) {
  if (tags.length === 0) return null

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    )
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggle(tag.id)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            selectedIds.includes(tag.id)
              ? "text-white border-transparent"
              : "bg-white border-gray-200 text-gray-600"
          }`}
          style={
            selectedIds.includes(tag.id)
              ? { backgroundColor: tag.color, borderColor: tag.color }
              : {}
          }
        >
          {tag.name}
        </button>
      ))}
      {selectedIds.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/filters/TagFilter.tsx
git commit -m "feat: add TagFilter component"
```

---

### Task 21: Update `TaskItem` — priority border + tag pills + description

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`

- [ ] **Step 1: Add the `priorityColor` helper at the top of the file**

After the imports, add:

```ts
function priorityColor(score: number): string {
  // Interpolate from blue (#3b82f6) at score=1 to gray (#e5e7eb) at score=0
  const r = Math.round(59 + (229 - 59) * (1 - score))
  const g = Math.round(130 + (231 - 130) * (1 - score))
  const b = Math.round(246 + (235 - 246) * (1 - score))
  return `rgb(${r}, ${g}, ${b})`
}
```

- [ ] **Step 2: Update `TaskItemProps` to include new callbacks**

Replace the interface:

```ts
interface TaskItemProps {
  task: Task
  showProject: boolean
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

- [ ] **Step 3: Update the component body**

Replace the entire `TaskItem` function with:

```tsx
export function TaskItem({
  task,
  showProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(task.description ?? "")

  function startEdit() {
    setEditing(true)
    setEditTitle(task.title)
  }

  async function commitRename() {
    if (!editTitle.trim() || editTitle === task.title) {
      setEditing(false)
      return
    }
    await onRename(task.id, editTitle.trim())
    setEditing(false)
  }

  async function saveDescription() {
    const current = task.description ?? ""
    if (descValue === current) {
      setEditingDesc(false)
      return
    }
    await onUpdateDescription(task.id, descValue)
    setEditingDesc(false)
  }

  return (
    <SwipeableRow
      onSubtasks={() => setIsOpen((o) => !o)}
      onDelete={() => onDelete(task.id)}
      subtasksLabel={isOpen ? "Свернуть" : "Подзадачи"}
    >
      <div
        className="border rounded p-3"
        style={{ borderLeftWidth: "3px", borderLeftColor: priorityColor(task.priorityScore) }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => onToggle(task)}
            />
            {showProject && task.project && (
              <span className="text-xs text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
                {task.project.title}
              </span>
            )}
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename()
                  if (e.key === "Escape") setEditing(false)
                }}
                className="border p-1 rounded text-sm"
                autoFocus
              />
            ) : (
              <span
                className={task.done ? "line-through text-gray-400" : ""}
                onDoubleClick={startEdit}
              >
                {task.title}
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              id={`date-${task.id}`}
              defaultValue={
                task.dueDate
                  ? new Date(task.dueDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
              className="sr-only"
            />
            {task.recurrence && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-400">
                {
                  { daily: "↻ день", weekly: "↻ неделя", monthly: "↻ месяц" }[
                    task.recurrence
                  ]
                }
              </span>
            )}
            {task.dueDate ? (
              <span
                onClick={() =>
                  (
                    document.getElementById(`date-${task.id}`) as HTMLInputElement
                  )?.showPicker()
                }
                className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                  new Date(task.dueDate) < new Date() && !task.done
                    ? "text-red-500 bg-red-50"
                    : "text-gray-400 bg-gray-100"
                }`}
              >
                {new Date(task.dueDate).toLocaleDateString("ru-RU")}
              </span>
            ) : (
              <button
                onClick={() =>
                  (
                    document.getElementById(`date-${task.id}`) as HTMLInputElement
                  )?.showPicker()
                }
                className="text-xs text-gray-300 hover:text-gray-500"
              >
                + дата
              </button>
            )}
            <button
              onClick={() => setIsOpen((o) => !o)}
              className="hidden md:block text-sm text-blue-400 hover:text-blue-600 min-h-[44px] px-2"
            >
              {isOpen ? "Свернуть" : "Подзадачи"}
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="hidden md:block text-sm text-red-400 hover:text-red-600 min-h-[44px] px-2"
            >
              Удалить
            </button>
          </div>
        </div>

        {/* Tag pills */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {editingDesc ? (
          <textarea
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) saveDescription()
              if (e.key === "Escape") {
                setDescValue(task.description ?? "")
                setEditingDesc(false)
              }
            }}
            className="mt-2 w-full border rounded p-2 text-sm text-gray-600 resize-none"
            rows={3}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingDesc(true)}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 text-left"
          >
            ✏{" "}
            {task.description
              ? task.description.slice(0, 60) +
                (task.description.length > 60 ? "…" : "")
              : "Добавить описание"}
          </button>
        )}

        {isOpen && (
          <SubtaskPanel
            taskId={task.id}
            subtasks={task.subtasks}
            onAdd={onAddSubtask}
            onToggle={onToggleSubtask}
            onDelete={onDeleteSubtask}
          />
        )}
      </div>
    </SwipeableRow>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about missing `onUpdateDescription` and `onUpdateTags` props in `TaskList.tsx` and `page.tsx`. Fix those in the next tasks.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskItem.tsx
git commit -m "feat: add priority border, tag pills, and description to TaskItem"
```

---

### Task 22: Update `AddTaskForm` — tag selector

**Files:**
- Modify: `src/components/tasks/AddTaskForm.tsx`

- [ ] **Step 1: Update `AddTaskFormProps` to include tag props**

Replace the interface:

```ts
interface AddTaskFormProps {
  activeProjectId: string | null
  projects: Project[]
  tags: Tag[]
  inputRef: React.RefObject<HTMLInputElement>
  onSubmit: (input: CreateTaskInput) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
}
```

Add `Tag` to the imports:

```ts
import type { CreateTaskInput } from "@/hooks/useTasks"
import type { Project, Tag } from "@/types"
```

- [ ] **Step 2: Add tag state and selector UI**

Replace the component function with:

```tsx
export function AddTaskForm({
  activeProjectId,
  projects,
  tags,
  inputRef,
  onSubmit,
  onCreateTag,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [recurrence, setRecurrence] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        ...(dueDate && { dueDate }),
        ...(recurrence && { recurrence }),
        ...(activeProjectId && { projectId: activeProjectId }),
        ...(selectedTagIds.length > 0 && { tagIds: selectedTagIds }),
      })
      setTitle("")
      setDueDate("")
      setRecurrence("")
      setSelectedTagIds([])
    } catch {
      setError("Не удалось создать задачу. Попробуйте ещё раз.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const placeholder = activeProjectId
    ? `Задача в «${projects.find((p) => p.id === activeProjectId)?.title}»...`
    : "Новая задача..."

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTagIds.includes(t.id)
  )

  async function handleSelectTag(id: string) {
    setSelectedTagIds((prev) => [...prev, id])
    setTagInput("")
    setShowTagMenu(false)
  }

  async function handleCreateTag() {
    if (!tagInput.trim()) return
    const tag = await onCreateTag(tagInput.trim())
    setSelectedTagIds((prev) => [...prev, tag.id])
    setTagInput("")
    setShowTagMenu(false)
  }

  return (
    <div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 mb-6 md:static md:shadow-none md:bg-transparent sticky bottom-[80px] z-30 bg-white rounded-lg focus-within:shadow-lg focus-within:px-3 focus-within:py-2 transition-all"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-500 text-white px-4 rounded disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Добавить"}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500 flex-1"
          />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500"
          >
            <option value="">Не повторять</option>
            <option value="daily">Каждый день</option>
            <option value="weekly">Каждую неделю</option>
            <option value="monthly">Каждый месяц</option>
          </select>
        </div>

        {/* Tag selector */}
        <div className="relative">
          <input
            type="text"
            placeholder="Добавить метку..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setShowTagMenu(true)}
            onBlur={() => setTimeout(() => setShowTagMenu(false), 150)}
            className="border p-2 rounded text-sm w-full"
          />
          {showTagMenu && (filteredTags.length > 0 || tagInput.trim()) && (
            <div className="absolute top-full left-0 bg-white border rounded shadow-md z-10 w-full max-h-40 overflow-y-auto">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={() => handleSelectTag(tag.id)}
                  className="w-full text-left px-3 py-1 hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
              {tagInput.trim() &&
                !tags.some(
                  (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
                ) && (
                  <button
                    type="button"
                    onMouseDown={handleCreateTag}
                    className="w-full text-left px-3 py-1 hover:bg-gray-50 text-sm text-blue-600"
                  >
                    + Создать «{tagInput.trim()}»
                  </button>
                )}
            </div>
          )}
          {selectedTagIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedTagIds.map((id) => {
                const tag = tags.find((t) => t.id === id)
                if (!tag) return null
                return (
                  <span
                    key={id}
                    className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTagIds((prev) => prev.filter((s) => s !== id))
                      }
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/AddTaskForm.tsx
git commit -m "feat: add tag selector to AddTaskForm"
```

---

### Task 23: Update `TaskList` and `page.tsx` — wire new props

**Files:**
- Modify: `src/components/tasks/TaskList.tsx`
- Modify: `src/app/tasks/page.tsx`

- [ ] **Step 1: Update `TaskList` to pass new callbacks to `TaskItem`**

In `src/components/tasks/TaskList.tsx`, update `TaskListProps`:

```ts
interface TaskListProps {
  tasks: Task[]
  filteredTasks: Task[]
  activeProjectId: string | null
  dateFilter: DateFilter
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

Update the function signature destructuring to include `onUpdateDescription` and `onUpdateTags`.

Update the `TaskItem` call inside the `filteredTasks.map` to pass the new props:

```tsx
<TaskItem
  task={task}
  showProject={!activeProjectId}
  onToggle={onToggle}
  onDelete={onDelete}
  onRename={onRename}
  onUpdateDueDate={onUpdateDueDate}
  onUpdateDescription={onUpdateDescription}
  onUpdateTags={onUpdateTags}
  onAddSubtask={onAddSubtask}
  onToggleSubtask={onToggleSubtask}
  onDeleteSubtask={onDeleteSubtask}
/>
```

- [ ] **Step 2: Update `src/app/tasks/page.tsx`**

Add `useTags` import and `TagFilter` import. Add `selectedTagIds` state. Add `tagHook`. Update `useEffect`. Update `filterTasks` call. Add `TagFilter` to JSX. Pass new props to `AddTaskForm` and `TaskList`.

Replace the file with:

```tsx
// src/app/tasks/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useTasks, filterTasks } from "@/hooks/useTasks"
import { useProjects } from "@/hooks/useProjects"
import { useTags } from "@/hooks/useTags"
import { TaskList } from "@/components/tasks/TaskList"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { ProjectTabs } from "@/components/projects/ProjectTabs"
import { DateFilters } from "@/components/filters/DateFilters"
import { TagFilter } from "@/components/filters/TagFilter"
import { BottomNav } from "@/components/BottomNav"
import type { DateFilter } from "@/types"

export default function TasksPage() {
  const { status } = useSession()
  const router = useRouter()
  const titleInputRef = useRef<HTMLInputElement>(null!)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const taskHook = useTasks()
  const projectHook = useProjects()
  const tagHook = useTags()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      taskHook.fetchTasks()
      projectHook.fetchProjects()
      tagHook.fetchTags()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragStart(_event: DragStartEvent) {}

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const projectTabIds = ["all", ...projectHook.projects.map((p) => p.id)]

    if (projectTabIds.includes(over.id as string)) {
      const projectId = over.id === "all" ? null : (over.id as string)
      const task = taskHook.tasks.find((t) => t.id === taskId)
      if (!task || task.project?.id === projectId) return
      const newProject = projectId
        ? (projectHook.projects.find((p) => p.id === projectId) ?? null)
        : null
      await taskHook.assignProject(taskId, projectId, newProject)
      return
    }

    if (active.id !== over.id) {
      const oldIndex = taskHook.tasks.findIndex((t) => t.id === active.id)
      const newIndex = taskHook.tasks.findIndex((t) => t.id === over.id)
      const newTasks = arrayMove(taskHook.tasks, oldIndex, newIndex)
      await taskHook.reorderTasks(newTasks)
    }
  }

  const filtered = filterTasks(taskHook.tasks, dateFilter, activeProjectId).filter(
    (t) =>
      selectedTagIds.length === 0 ||
      selectedTagIds.some((id) => t.tags.some((tag) => tag.id === id))
  )

  if (status === "loading" || taskHook.isLoading) {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Мои задачи</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Выйти
          </button>
        </div>

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

        <AddTaskForm
          activeProjectId={activeProjectId}
          projects={projectHook.projects}
          tags={tagHook.tags}
          inputRef={titleInputRef}
          onSubmit={(input) => taskHook.createTask(input, projectHook.projects)}
          onCreateTag={tagHook.createTag}
        />

        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
          activeProjectId={activeProjectId}
          dateFilter={dateFilter}
          onToggle={taskHook.toggleTask}
          onDelete={taskHook.deleteTask}
          onRename={taskHook.renameTask}
          onUpdateDueDate={taskHook.updateDueDate}
          onUpdateDescription={taskHook.updateDescription}
          onUpdateTags={taskHook.updateTags}
          onAddSubtask={taskHook.addSubtask}
          onToggleSubtask={taskHook.toggleSubtask}
          onDeleteSubtask={taskHook.deleteSubtask}
        />

        <BottomNav
          onAddClick={() => {
            titleInputRef.current?.focus()
            titleInputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }}
        />
      </main>
    </DndContext>
  )
}
```

- [ ] **Step 3: TypeScript check — must be clean**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit 2>&1
```

Expected: zero errors. Fix any remaining type errors before continuing.

- [ ] **Step 4: Run tests**

```bash
cd C:/Claude/task-manager && npm test 2>&1 | tail -10
```

Expected: 5 tests pass.

- [ ] **Step 5: Manual full verification (dev server must be running)**

Open `http://localhost:3000/tasks` and verify:

**Priority gradient:**
- [ ] Tasks have a colored left border — blue for top tasks, fading to gray for bottom tasks
- [ ] Drag a task from bottom to top — its border becomes bluer

**Tags:**
- [ ] Click "Добавить метку..." in the add form, type a new name, click "+ Создать «...»" — tag is created and selected
- [ ] Create a task with the tag — tag pill appears on the task row
- [ ] TagFilter strip appears above the form with the tag pill — click it to filter tasks
- [ ] "Сбросить" button clears tag filter

**Description:**
- [ ] Click "✏ Добавить описание" on a task — textarea opens
- [ ] Type text, click outside — text is saved and shown as preview
- [ ] Ctrl+Enter also saves

**All Stage 2a features still work:**
- [ ] Adding tasks, toggling, renaming, deleting
- [ ] Subtasks
- [ ] Projects and project drag
- [ ] Date filters
- [ ] Empty states

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/TaskList.tsx src/app/tasks/page.tsx
git commit -m "feat: wire Stage 2b features into TaskList and page coordinator"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Task |
|-----------------|------|
| Split `tasks/page.tsx` into focused components | Tasks 5–12 |
| `useTasks` hook with `{ data, isLoading, error }` | Task 3 |
| `useProjects` hook | Task 4 |
| Error Boundaries around TaskList and ProjectTabs | Tasks 5, 11 |
| Empty states (no tasks / no filter match / empty project) | Task 11 |
| Position-based priority, no separate field | Task 19 |
| Priority score formula `1 - (order / max(n-1, 1))` | Task 19 |
| Priority gradient border (Option A) | Task 21 |
| New task inserts at order 0, existing tasks shift +1 | Task 16 |
| Tag model with `name`, `color`, userId uniqueness | Task 13 |
| Tag assignment via `PATCH /api/tasks/[id] { tagIds }` | Task 17 |
| Tag filter (multi-select) above date filters | Tasks 20, 23 |
| `GET /api/tags`, `POST /api/tags` | Task 14 |
| Tag input with create-or-select in AddTaskForm | Task 22 |
| `description String?` field on Task | Task 13 |
| Description as expandable textarea on task | Task 21 |
| Save description on blur or Ctrl+Enter | Task 21 |
| Plain text, no Markdown | Task 21 |

All spec requirements covered. ✓

### Placeholder scan

No TBD, TODO, "similar to task N", or missing code blocks found. ✓

### Type consistency check

- `Task.tags: Tag[]` — defined in Task 18, used consistently in Tasks 19–23 ✓
- `Task.description: string | null` — defined in Task 18, used in Task 21 ✓  
- `Task.priorityScore: number` — defined in Task 18, computed in Task 19 ✓
- `CreateTaskInput.tagIds?: string[]` — added in Task 19, consumed in Tasks 22–23 ✓
- `useTasks.updateDescription` / `useTasks.updateTags` — defined in Task 19, wired in Tasks 23 ✓
- `ProjectTabs.onRename: (id, title) => Promise<void>` — Task 10, called in Task 12 ✓
- `useTasks.syncProjectRename` — defined in Task 3, called in Tasks 12, 23 ✓
- `useTasks.removeProjectTasks` — defined in Task 3, called in Tasks 12, 23 ✓

All consistent. ✓
