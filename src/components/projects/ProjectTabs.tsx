"use client"

import { useState } from "react"
import { DroppableProject } from "@/components/DroppableProject"
import type { Project } from "@/types"

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  onSelect: (id: string | null) => void
  onCreate: (title: string) => Promise<Project>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
}

export function ProjectTabs({
  projects,
  activeProjectId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: ProjectTabsProps) {
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setError(null)
    try {
      const project = await onCreate(newTitle.trim())
      setNewTitle("")
      setShowNew(false)
      onSelect(project.id)
    } catch {
      setError("Не удалось создать проект. Попробуйте ещё раз.")
    }
  }

  async function handleRename(id: string) {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    await onRename(id, editingTitle.trim())
    setEditingId(null)
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {error && <p className="text-sm text-red-500 w-full">{error}</p>}

      <DroppableProject id="all">
        <button
          onClick={() => onSelect(null)}
          className={`text-sm px-3 py-1 rounded-full border min-h-[44px] ${
            activeProjectId === null
              ? "bg-blue-500 text-white border-blue-500"
              : "text-gray-500 hover:border-gray-400"
          }`}
        >
          Все задачи
        </button>
      </DroppableProject>

      {projects.map((project) => (
        <div key={project.id} className="flex items-center gap-1">
          <DroppableProject id={project.id}>
            {editingId === project.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleRename(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(project.id)
                  if (e.key === "Escape") setEditingId(null)
                }}
                className="border p-1 rounded text-sm w-32"
                autoFocus
              />
            ) : (
              <button
                onClick={() => onSelect(project.id)}
                onDoubleClick={() => {
                  setEditingId(project.id)
                  setEditingTitle(project.title)
                }}
                className={`text-sm px-3 py-1 rounded-full border min-h-[44px] ${
                  activeProjectId === project.id
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-gray-500 hover:border-gray-400"
                }`}
              >
                {project.title}
              </button>
            )}
            {activeProjectId === project.id && editingId !== project.id && (
              <button
                onClick={() => onDelete(project.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            )}
          </DroppableProject>
        </div>
      ))}

      {showNew ? (
        <form onSubmit={handleCreate} className="flex gap-1">
          <input
            type="text"
            placeholder="Название проекта..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="border p-1 rounded text-sm"
            autoFocus
            onBlur={() => {
              if (!newTitle) setShowNew(false)
            }}
          />
          <button
            type="submit"
            className="text-sm bg-blue-500 text-white px-2 rounded"
          >
            +
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="text-sm px-3 py-1 rounded-full border border-dashed text-gray-400 hover:text-gray-600"
        >
          + проект
        </button>
      )}
    </div>
  )
}
