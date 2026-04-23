"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/apiFetch"
import type { Project } from "@/types"

export function useProjects() {
  const qc = useQueryClient()

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await apiFetch("/api/projects")
      if (!res.ok) throw new Error("Не удалось загрузить проекты")
      return res.json()
    },
  })

  const { mutateAsync: createProject } = useMutation({
    networkMode: "online",
    mutationFn: async ({ title, icon }: { title: string; icon: string }) => {
      const res = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, icon }),
      })
      if (!res.ok) throw new Error("Не удалось создать проект")
      return res.json() as Promise<Project>
    },
    onSuccess: (project) => {
      qc.setQueryData<Project[]>(["projects"], (old) => [...(Array.isArray(old) ? old : []), project])
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  })

  const { mutateAsync: deleteProject } = useMutation({
    networkMode: "online",
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить проект")
    },
    onSuccess: (_, id) => {
      qc.setQueryData<Project[]>(["projects"], (old) => Array.isArray(old) ? old.filter((p) => p.id !== id) : [])
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  })

  const { mutateAsync: updateProject } = useMutation({
    networkMode: "online",
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; icon?: string } }) => {
      const res = await apiFetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Не удалось сохранить проект")
      return res.json() as Promise<Project>
    },
    onSuccess: (updated) => {
      qc.setQueryData<Project[]>(["projects"], (old) =>
        Array.isArray(old) ? old.map((p) => (p.id === updated.id ? updated : p)) : []
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  })

  return {
    projects,
    fetchProjects: () => {},
    createProject: (title: string, icon = "folder") => createProject({ title, icon }),
    deleteProject: (id: string) => deleteProject(id),
    updateProject: (id: string, updates: { title?: string; icon?: string }) =>
      updateProject({ id, updates }),
  }
}
