"use client"

import { useState } from "react"
import { FolderOpen, ChevronDown, ChevronUp } from "lucide-react"
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
  const [isOpen, setIsOpen] = useState(false)
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
      setIsOpen(false)
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

  function handleSelectProject(id: string | null) {
    onSelect(id)
    setIsOpen(false)
  }

  const activeLabel =
    activeProjectId === null
      ? "Все задачи"
      : (projects.find((p) => p.id === activeProjectId)?.title ?? "Проект")

  return (
    <div className="mb-3">
      {/* Accordion header */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
      >
        <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 flex-1">
          Проекты
          {activeProjectId !== null && (
            <span className="ml-1 text-blue-500">· {activeLabel}</span>
          )}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {projects.length}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-col gap-2">
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {/* All tasks */}
            <DroppableProject id="all">
              <button
                onClick={() => handleSelectProject(null)}
                className={`text-sm px-3 py-1 rounded-full border min-h-[36px] transition-colors ${
                  activeProjectId === null
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                Все задачи
              </button>
            </DroppableProject>

            {/* Project pills */}
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
                      className="border p-1 rounded text-sm w-32 outline-none focus:border-blue-400"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => handleSelectProject(project.id)}
                      onDoubleClick={() => {
                        setEditingId(project.id)
                        setEditingTitle(project.title)
                      }}
                      className={`text-sm px-3 py-1 rounded-full border min-h-[36px] transition-colors ${
                        activeProjectId === project.id
                          ? "bg-blue-500 text-white border-blue-500"
                          : "text-gray-500 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {project.title}
                    </button>
                  )}
                  {activeProjectId === project.id && editingId !== project.id && (
                    <button
                      onClick={() => onDelete(project.id)}
                      className="text-xs text-red-400 hover:text-red-600 ml-1"
                    >
                      ✕
                    </button>
                  )}
                </DroppableProject>
              </div>
            ))}
          </div>

          {/* New project form */}
          {showNew ? (
            <form onSubmit={handleCreate} className="flex gap-1">
              <input
                type="text"
                placeholder="Название проекта..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                autoFocus
                onBlur={() => {
                  if (!newTitle) setShowNew(false)
                }}
              />
              <button
                type="submit"
                className="text-sm bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
              >
                +
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="text-sm px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 self-start"
            >
              + проект
            </button>
          )}
        </div>
      )}
    </div>
  )
}
