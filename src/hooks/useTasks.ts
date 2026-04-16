"use client"

import { useState, useCallback } from "react"
import type { Task, Subtask, DateFilter, Project } from "@/types"

export type CreateTaskInput = {
  title: string
  dueDate?: string
  recurrence?: string
  projectId?: string
  tagIds?: string[]
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

  const createTask = useCallback(
    async (input: CreateTaskInput, projects: Project[]) => {
      try {
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
        setTasks((prev) => {
          const shifted = prev.map((t) => ({ ...t, order: t.order + 1 }))
          return withPriorityScores([{ ...task, subtasks: [], project, tags: task.tags ?? [] }, ...shifted])
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка создания задачи")
        throw e
      }
    },
    []
  )

  const toggleTask = useCallback(async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      })
      if (!res.ok) throw new Error("Не удалось изменить статус задачи")
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, subtasks: t.subtasks, project: t.project }
            : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка изменения статуса")
    }
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить задачу")
      setTasks((prev) => withPriorityScores(prev.filter((t) => t.id !== id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления задачи")
    }
  }, [])

  const renameTask = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Не удалось переименовать задачу")
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, subtasks: t.subtasks, project: t.project }
            : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка переименования задачи")
    }
  }, [])

  const updateDueDate = useCallback(async (taskId: string, value: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: value ? new Date(value).toISOString() : null }),
      })
      if (!res.ok) throw new Error("Не удалось обновить дату задачи")
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, subtasks: t.subtasks, project: t.project }
            : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка обновления даты")
    }
  }, [])

  const reorderTasks = useCallback(async (newTasks: Task[]) => {
    const previous = tasks
    setTasks(withPriorityScores(newTasks.map((t, i) => ({ ...t, order: i }))))
    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTasks.map((t, i) => ({ id: t.id, order: i }))),
      })
      if (!res.ok) throw new Error("Не удалось изменить порядок задач")
    } catch (e) {
      setTasks(previous)
      setError(e instanceof Error ? e.message : "Ошибка изменения порядка")
    }
  }, [tasks])

  const assignProject = useCallback(
    async (
      taskId: string,
      projectId: string | null,
      newProject: { id: string; title: string } | null
    ) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        })
        if (!res.ok) throw new Error("Не удалось назначить проект")
        const updated = await res.json()
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, ...updated, subtasks: t.subtasks, project: newProject }
              : t
          )
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка назначения проекта")
      }
    },
    []
  )

  const removeProjectTasks = useCallback((projectId: string) => {
    setTasks((prev) => prev.filter((t) => t.project?.id !== projectId))
  }, [])

  const syncProjectRename = useCallback(
    (updated: Project) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.project?.id === updated.id ? { ...t, project: updated } : t
        )
      )
    },
    []
  )

  const addSubtask = useCallback(async (taskId: string, title: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Не удалось добавить подзадачу")
      const subtask = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка добавления подзадачи")
    }
  }, [])

  const toggleSubtask = useCallback(async (taskId: string, subtask: Subtask) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !subtask.done }),
      })
      if (!res.ok) throw new Error("Не удалось изменить статус подзадачи")
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === updated.id ? updated : s)) }
            : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка изменения статуса подзадачи")
    }
  }, [])

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить подзадачу")
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
            : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления подзадачи")
    }
  }, [])

  const updateDescription = useCallback(async (id: string, description: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      if (!res.ok) throw new Error("Не удалось обновить описание")
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, subtasks: t.subtasks, project: t.project, priorityScore: t.priorityScore }
            : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка обновления описания")
    }
  }, [])

  const updateTags = useCallback(async (id: string, tagIds: string[]) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      })
      if (!res.ok) throw new Error("Не удалось обновить метки")
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((t) =>
          t.id === updated.id
            ? { ...updated, subtasks: t.subtasks, project: t.project, priorityScore: t.priorityScore }
            : t
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка обновления меток")
    }
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
    updateDescription,
    updateTags,
  }
}
