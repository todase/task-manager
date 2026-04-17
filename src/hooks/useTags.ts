"use client"

import { useState, useCallback } from "react"
import type { Tag } from "@/types"

const TAG_COLORS = [
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
  "#fb923c", // orange-400
  "#2dd4bf", // teal-400
  "#4ade80", // green-400
  "#fb7185", // rose-400
  "#22d3ee", // cyan-400
  "#c084fc", // purple-400
  "#94a3b8", // slate-400
]

function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags")
      if (!res.ok) throw new Error("Не удалось загрузить метки")
      const data = await res.json()
      setTags(Array.isArray(data) ? data : [])
    } catch {
      setTags([])
    }
  }, [])

  const createTag = useCallback(
    async (name: string, color?: string): Promise<Tag> => {
      const tagColor = color ?? randomTagColor()
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: tagColor }),
      })
      if (!res.ok) throw new Error("Не удалось создать метку")
      const tag = await res.json()
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      return tag
    },
    []
  )

  const updateTag = useCallback(async (id: string, updates: { name?: string; color?: string }): Promise<Tag> => {
    const res = await fetch(`/api/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error("Не удалось обновить метку")
    const tag = await res.json()
    setTags((prev) =>
      prev.map((t) => (t.id === id ? tag : t)).sort((a, b) => a.name.localeCompare(b.name))
    )
    return tag
  }, [])

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Не удалось удалить метку")
    setTags((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tags, fetchTags, createTag, updateTag, deleteTag }
}
