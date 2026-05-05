import type { Task, DateFilter } from "@/types"

export type TaskFilters = {
  done?: boolean
  q?: string
  sort?: "order" | "createdAt_desc"
  isHabit?: boolean
}

export type CreateTaskInput = {
  title: string
  dueDate?: string
  recurrence?: string
  projectId?: string
  tagIds?: string[]
  isHabit?: boolean
  estimatedMinutes?: number
  weeklyTarget?: number
}

export function buildTasksUrl(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.done !== undefined) params.set("done", String(filters.done))
  if (filters.q) params.set("q", filters.q)
  if (filters.sort) params.set("sort", filters.sort)
  if (filters.isHabit) params.set("isHabit", "true")
  const str = params.toString()
  return str ? `/api/tasks?${str}` : "/api/tasks"
}

export function withPriorityScores(tasks: Omit<Task, "priorityScore">[]): Task[] {
  const n = tasks.length
  return tasks.map((t) => ({
    ...t,
    priorityScore: n <= 1 ? 1 : 1 - t.order / (n - 1),
  }))
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
      if (!t.dueDate) return true
      return new Date(t.dueDate) >= weekEnd
    }
    return true
  })
}
