import { useState } from "react"
import type { Project } from "@/types"

interface UseProjectEditingOptions {
  onCreate: (title: string, icon: string) => Promise<Project>
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, updates: { title?: string; icon?: string }) => Promise<void>
}

export function useProjectEditing({
  onCreate,
  onDelete,
  onUpdate,
}: UseProjectEditingOptions) {
  // Existing project editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [editingIcon, setEditingIcon] = useState("folder")
  const [showEditIconPicker, setShowEditIconPicker] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // New project creation
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newIcon, setNewIcon] = useState("folder")
  const [showNewIconPicker, setShowNewIconPicker] = useState(false)

  // Shared error
  const [error, setError] = useState<string | null>(null)

  function startEditing(project: Project) {
    setEditingId(project.id)
    setEditingTitle(project.title)
    setEditingIcon(project.icon)
    setShowEditIconPicker(false)
    setDeletingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setShowEditIconPicker(false)
  }

  async function handleUpdate(id: string) {
    if (!editingTitle.trim()) {
      cancelEdit()
      return
    }
    setError(null)
    try {
      await onUpdate(id, { title: editingTitle.trim(), icon: editingIcon })
      cancelEdit()
    } catch {
      setError("Не удалось сохранить проект. Попробуйте ещё раз.")
    }
  }

  async function handleConfirmDelete(id: string) {
    await onDelete(id)
    setDeletingId(null)
    setEditingId(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setError(null)
    try {
      await onCreate(newTitle.trim(), newIcon)
      setNewTitle("")
      setNewIcon("folder")
      setShowNew(false)
      setShowNewIconPicker(false)
    } catch {
      setError("Не удалось создать проект. Попробуйте ещё раз.")
    }
  }

  return {
    // Edit state
    editingId,
    editingTitle,
    editingIcon,
    showEditIconPicker,
    deletingId,
    // New project state
    showNew,
    newTitle,
    newIcon,
    showNewIconPicker,
    // Shared
    error,
    // Actions
    startEditing,
    cancelEdit,
    handleUpdate,
    handleConfirmDelete,
    setDeletingId,
    setEditingTitle,
    setEditingIcon,
    toggleEditIconPicker: () => setShowEditIconPicker((o) => !o),
    setShowNew,
    setNewTitle,
    setNewIcon,
    toggleNewIconPicker: () => setShowNewIconPicker((o) => !o),
    handleCreate,
  }
}
