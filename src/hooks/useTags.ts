"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/apiFetch"
import type { Tag } from "@/types"

const TAG_COLORS = [
  "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#2dd4bf",
  "#4ade80", "#fb7185", "#22d3ee", "#c084fc", "#94a3b8",
]

function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

export function useTags() {
  const qc = useQueryClient()

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await apiFetch("/api/tags")
      if (!res.ok) throw new Error("Не удалось загрузить метки")
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { mutateAsync: createTag } = useMutation({
    networkMode: "online",
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await apiFetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) throw new Error("Не удалось создать метку")
      return res.json() as Promise<Tag>
    },
    onSuccess: (tag) => {
      qc.setQueryData<Tag[]>(["tags"], (old) =>
        [...(old ?? []), tag].sort((a, b) => a.name.localeCompare(b.name))
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  })

  const { mutateAsync: updateTag } = useMutation({
    networkMode: "online",
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; color?: string } }) => {
      const res = await apiFetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Не удалось обновить метку")
      return res.json() as Promise<Tag>
    },
    onSuccess: (tag) => {
      qc.setQueryData<Tag[]>(["tags"], (old) =>
        Array.isArray(old) ? old.map((t) => (t.id === tag.id ? tag : t)) : []
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  })

  const { mutateAsync: deleteTag } = useMutation({
    networkMode: "online",
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/tags/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить метку")
    },
    onSuccess: (_, id) => {
      qc.setQueryData<Tag[]>(["tags"], (old) => Array.isArray(old) ? old.filter((t) => t.id !== id) : [])
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  })

  return {
    tags,
    fetchTags: () => {},
    createTag: (name: string, color?: string) => createTag({ name, color: color ?? randomTagColor() }),
    updateTag: (id: string, updates: { name?: string; color?: string }) => updateTag({ id, updates }),
    deleteTag: (id: string) => deleteTag(id),
  }
}
