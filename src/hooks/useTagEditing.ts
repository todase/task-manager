import { useState } from "react"
import type { Tag } from "@/types"

interface UseTagEditingOptions {
  onUpdate: (id: string, updates: { name?: string }) => Promise<Tag>
  onDelete: (id: string) => Promise<void>
}

export function useTagEditing({ onUpdate, onDelete }: UseTagEditingOptions) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function startEditing(tag: Tag) {
    setEditingId(tag.id)
    setEditingName(tag.name)
    setDeletingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) {
      cancelEdit()
      return
    }
    setError(null)
    try {
      await onUpdate(id, { name: editingName.trim() })
      cancelEdit()
    } catch {
      setError("Не удалось сохранить метку.")
    }
  }

  async function handleConfirmDelete(id: string) {
    setError(null)
    try {
      await onDelete(id)
      setDeletingId(null)
      setEditingId(null)
    } catch {
      setError("Не удалось удалить метку.")
    }
  }

  return {
    editingId,
    editingName,
    deletingId,
    error,
    startEditing,
    cancelEdit,
    handleUpdate,
    handleConfirmDelete,
    setEditingName,
    setDeletingId,
  }
}
