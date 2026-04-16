"use client"

import { useState, useRef } from "react"
import { useClickOutside } from "@/hooks/useClickOutside"
import { FolderOpen, ChevronDown, ChevronUp, Pencil } from "lucide-react"
import { DroppableProject } from "@/components/DroppableProject"
import { ProjectIconPicker, ProjectIcon } from "@/components/projects/ProjectIconPicker"
import { ConfirmDeleteDialog } from "@/components/projects/ConfirmDeleteDialog"
import type { Project } from "@/types"

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  onSelect: (id: string | null) => void
  onCreate: (title: string, icon: string) => Promise<Project>
  onDelete: (id: string) => Promise<void>
  onUpdate: (id: string, updates: { title?: string; icon?: string }) => Promise<void>
}

export function ProjectTabs({
  projects,
  activeProjectId,
  onSelect,
  onCreate,
  onDelete,
  onUpdate,
}: ProjectTabsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newIcon, setNewIcon] = useState("folder")
  const [showNewIconPicker, setShowNewIconPicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [editingIcon, setEditingIcon] = useState("folder")
  const [showEditIconPicker, setShowEditIconPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useClickOutside(containerRef, () => setIsOpen(false), isOpen)

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
      setIsOpen(false)
    } catch {
      setError("Не удалось создать проект. Попробуйте ещё раз.")
    }
  }

  async function handleUpdate(id: string) {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    setError(null)
    try {
      await onUpdate(id, { title: editingTitle.trim(), icon: editingIcon })
      setEditingId(null)
      setShowEditIconPicker(false)
    } catch {
      setError("Не удалось сохранить проект. Попробуйте ещё раз.")
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id)
    setEditingTitle(project.title)
    setEditingIcon(project.icon)
    setShowEditIconPicker(false)
    setDeletingId(null)
  }

  function handleSelectProject(id: string | null) {
    onSelect(id)
  }

  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <div className="mb-3" ref={containerRef}>
      {/* Accordion header */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
      >
        {activeProject ? (
          <ProjectIcon icon={activeProject.icon} className="w-4 h-4 text-blue-500 flex-shrink-0" />
        ) : (
          <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-700 flex-1">
          Проекты
          {activeProjectId !== null && activeProject && (
            <span className="ml-1 text-blue-500">· {activeProject.title}</span>
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
              <div key={project.id} className="flex items-center">
                <DroppableProject id={project.id}>
                  {editingId === project.id ? (
                    deletingId === project.id ? (
                      <ConfirmDeleteDialog
                        onCancel={() => setDeletingId(null)}
                        onConfirm={async () => {
                          await onDelete(project.id)
                          setDeletingId(null)
                          setEditingId(null)
                        }}
                      />
                    ) : (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowEditIconPicker((o) => !o)}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
                        >
                          <ProjectIcon icon={editingIcon} className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleUpdate(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(project.id)
                            if (e.key === "Escape") {
                              setEditingId(null)
                              setShowEditIconPicker(false)
                            }
                          }}
                          className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                          style={{ fontSize: "16px" }}
                          autoFocus
                        />
                      </div>
                      {showEditIconPicker && (
                        <ProjectIconPicker
                          selected={editingIcon}
                          onChange={(icon) => {
                            setEditingIcon(icon)
                            setShowEditIconPicker(false)
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setDeletingId(project.id)}
                        className="text-xs text-red-400 hover:text-red-600 self-start"
                      >
                        Удалить проект
                      </button>
                    </div>
                    )
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => handleSelectProject(project.id)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1 min-h-[36px] transition-colors border ${
                          activeProjectId === project.id
                            ? "bg-blue-500 text-white border-blue-500 rounded-l-full"
                            : "text-gray-500 border-gray-200 hover:border-gray-400 rounded-full"
                        }`}
                      >
                        <ProjectIcon icon={project.icon} className="w-3.5 h-3.5" />
                        {project.title}
                      </button>
                      {activeProjectId === project.id && (
                        <button
                          onClick={() => startEditing(project)}
                          className="flex items-center justify-center w-8 min-h-[36px] bg-blue-500 text-white border border-l-0 border-blue-500 rounded-r-full hover:bg-blue-600 transition-colors"
                          aria-label="Редактировать проект"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </DroppableProject>
              </div>
            ))}
          </div>

          {/* New project form */}
          {showNew ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowNewIconPicker((o) => !o)}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
                >
                  <ProjectIcon icon={newIcon} className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  placeholder="Название проекта..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                  style={{ fontSize: "16px" }}
                  autoFocus
                  onBlur={() => {
                    if (!newTitle) {
                      setShowNew(false)
                      setShowNewIconPicker(false)
                    }
                  }}
                />
                <button
                  type="submit"
                  className="text-sm bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
                >
                  +
                </button>
              </div>
              {showNewIconPicker && (
                <ProjectIconPicker
                  selected={newIcon}
                  onChange={(icon) => {
                    setNewIcon(icon)
                    setShowNewIconPicker(false)
                  }}
                />
              )}
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
