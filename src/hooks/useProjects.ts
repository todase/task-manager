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
