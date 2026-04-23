"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { withPriorityScores, type CreateTaskInput, type TaskFilters } from "./taskUtils"
import { remapMutationQueue } from "@/lib/mutationQueue"
import type { Task, Subtask, Project } from "@/types"

import type { QueryKey, QueryClient } from "@tanstack/react-query"
type Snapshot = [QueryKey, Task[] | undefined][]

function snapshot(qc: QueryClient): Snapshot {
  return qc.getQueriesData<Task[]>({ queryKey: ["tasks"] })
}

function restore(qc: QueryClient, snap: Snapshot) {
  snap.forEach(([key, data]) => qc.setQueryData(key, data))
}

export function useTaskMutations(_filters: TaskFilters = {}) {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] })

  // ─── createTask ───────────────────────────────────────────────
  const { mutateAsync: createTask } = useMutation({
    mutationKey: ["createTask"],
    mutationFn: async ({ input }: { input: CreateTaskInput; projects: Project[] }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Не удалось создать задачу")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ input, projects }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      const tempId = `tmp_${crypto.randomUUID()}`
      const project = input.projectId
        ? (projects.find((p) => p.id === input.projectId) ?? null)
        : null
      const tempTask: Task = {
        id: tempId, title: input.title, done: false,
        dueDate: input.dueDate ?? null, recurrence: input.recurrence ?? null,
        description: null, order: 0, project, subtasks: [], tags: [], priorityScore: 1,
      }
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => {
        if (!old) return [tempTask]
        return withPriorityScores([tempTask, ...old.map((t) => ({ ...t, order: t.order + 1 }))])
      })
      return { snap, tempId }
    },
    onSuccess: async (serverTask, _, ctx) => {
      if (!ctx) return
      await remapMutationQueue(ctx.tempId, serverTask.id)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === ctx.tempId
            ? { ...serverTask, subtasks: [], tags: serverTask.tags ?? [], priorityScore: t.priorityScore }
            : t
        )
      )
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── toggleTask ───────────────────────────────────────────────
  const { mutateAsync: toggleTask } = useMutation({
    mutationKey: ["toggleTask"],
    mutationFn: async (task: Task) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      })
      if (!res.ok) throw new Error("Не удалось изменить статус задачи")
      return res.json() as Promise<Task>
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── deleteTask ───────────────────────────────────────────────
  const { mutateAsync: deleteTask } = useMutation({
    mutationKey: ["deleteTask"],
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить задачу")
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        withPriorityScores(old?.filter((t) => t.id !== id) ?? [])
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── renameTask ───────────────────────────────────────────────
  const { mutateAsync: renameTask } = useMutation({
    mutationKey: ["renameTask"],
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Не удалось переименовать задачу")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, title } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── updateDueDate ────────────────────────────────────────────
  const { mutateAsync: updateDueDate } = useMutation({
    mutationKey: ["updateDueDate"],
    mutationFn: async ({ taskId, value }: { taskId: string; value: string }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: value ? new Date(value).toISOString() : null }),
      })
      if (!res.ok) throw new Error("Не удалось обновить дату задачи")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ taskId, value }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId ? { ...t, dueDate: value ? new Date(value).toISOString() : null } : t
        )
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── reorderTasks ─────────────────────────────────────────────
  const { mutateAsync: reorderTasks } = useMutation({
    mutationKey: ["reorderTasks"],
    mutationFn: async (newTasks: Task[]) => {
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTasks.map((t, i) => ({ id: t.id, order: i }))),
      })
      if (!res.ok) throw new Error("Не удалось изменить порядок задач")
    },
    onMutate: async (newTasks) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, () =>
        withPriorityScores(newTasks.map((t, i) => ({ ...t, order: i })))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── assignProject ────────────────────────────────────────────
  const { mutateAsync: assignProject } = useMutation({
    mutationKey: ["assignProject"],
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string | null; newProject: { id: string; title: string; icon: string } | null }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      if (!res.ok) throw new Error("Не удалось назначить проект")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ taskId, newProject }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, project: newProject } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── updateDescription ────────────────────────────────────────
  const { mutateAsync: updateDescription } = useMutation({
    mutationKey: ["updateDescription"],
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      if (!res.ok) throw new Error("Не удалось обновить описание")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ id, description }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, description } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── updateTags ───────────────────────────────────────────────
  const { mutateAsync: updateTagsMutation } = useMutation({
    mutationKey: ["updateTags"],
    mutationFn: async ({ id, tagIds }: { id: string; tagIds: string[] }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      })
      if (!res.ok) throw new Error("Не удалось обновить метки")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      return { snap, id }
    },
    onSuccess: (updated, { id }) => {
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, tags: updated.tags } : t))
      )
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── restoreTask ──────────────────────────────────────────────
  const { mutateAsync: restoreTask } = useMutation({
    mutationKey: ["restoreTask"],
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: false }),
      })
      if (!res.ok) throw new Error("Не удалось восстановить задачу")
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.filter((t) => t.id !== id)
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── clearArchive ─────────────────────────────────────────────
  const { mutateAsync: clearArchive } = useMutation({
    mutationKey: ["clearArchive"],
    mutationFn: async () => {
      const res = await fetch("/api/tasks?done=true", { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось очистить архив")
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, () => [])
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── addSubtask ───────────────────────────────────────────────
  const { mutateAsync: addSubtask } = useMutation({
    mutationKey: ["addSubtask"],
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Не удалось добавить подзадачу")
      return res.json() as Promise<Subtask>
    },
    onSuccess: (subtask, { taskId }) => {
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t
        )
      )
    },
    onSettled: invalidate,
  })

  // ─── toggleSubtask ────────────────────────────────────────────
  const { mutateAsync: toggleSubtask } = useMutation({
    mutationKey: ["toggleSubtask"],
    mutationFn: async ({ taskId, subtask }: { taskId: string; subtask: Subtask }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !subtask.done }),
      })
      if (!res.ok) throw new Error("Не удалось изменить статус подзадачи")
      return res.json() as Promise<Subtask>
    },
    onMutate: async ({ taskId, subtask }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtask.id ? { ...s, done: !s.done } : s)) }
            : t
        )
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── deleteSubtask ────────────────────────────────────────────
  const { mutateAsync: deleteSubtask } = useMutation({
    mutationKey: ["deleteSubtask"],
    mutationFn: async ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить подзадачу")
    },
    onMutate: async ({ taskId, subtaskId }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
        )
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── helpers (cache-only, no network) ────────────────────────
  const removeProjectTasks = (projectId: string) => {
    qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
      old?.filter((t) => t.project?.id !== projectId)
    )
  }

  const syncProjectRename = (updated: { id: string; title: string; icon: string }) => {
    qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
      old?.map((t) => (t.project?.id === updated.id ? { ...t, project: updated } : t))
    )
  }

  return {
    createTask: (input: CreateTaskInput, projects: Project[]) =>
      createTask({ input, projects }),
    toggleTask: (task: Task) => toggleTask(task),
    deleteTask: (id: string) => deleteTask(id),
    renameTask: (id: string, title: string) => renameTask({ id, title }),
    updateDueDate: (taskId: string, value: string) => updateDueDate({ taskId, value }),
    reorderTasks: (newTasks: Task[]) => reorderTasks(newTasks),
    assignProject: (
      taskId: string,
      projectId: string | null,
      newProject: { id: string; title: string; icon: string } | null
    ) => assignProject({ taskId, projectId, newProject }),
    updateDescription: (id: string, description: string) => updateDescription({ id, description }),
    updateTags: (id: string, tagIds: string[]) => updateTagsMutation({ id, tagIds }),
    restoreTask: (id: string) => restoreTask(id),
    clearArchive: () => clearArchive(),
    addSubtask: (taskId: string, title: string) => addSubtask({ taskId, title }),
    toggleSubtask: (taskId: string, subtask: Subtask) => toggleSubtask({ taskId, subtask }),
    deleteSubtask: (taskId: string, subtaskId: string) => deleteSubtask({ taskId, subtaskId }),
    removeProjectTasks,
    syncProjectRename,
  }
}
