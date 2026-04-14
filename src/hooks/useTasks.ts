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
