"use client"

import { useState, useCallback } from "react"
import type { Tag } from "@/types"

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
