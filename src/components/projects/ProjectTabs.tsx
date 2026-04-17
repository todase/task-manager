"use client"

import { useState, useRef } from "react"
import { useClickOutside } from "@/hooks/useClickOutside"
import { useProjectEditing } from "@/hooks/useProjectEditing"
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
  const containerRef = useRef<HTMLDivElement>(null)

  useClickOutside(containerRef, () => setIsOpen(false), isOpen)

  const edit = useProjectEditing({ onCreate, onDelete, onUpdate })
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
        <div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-col gap-2 animate-expand">
          {edit.error && <p className="text-sm text-red-500">{edit.error}</p>}

          <div className="flex flex-wrap gap-2">
            {/* All tasks */}
            <DroppableProject id="all">
              <button
                onClick={() => onSelect(null)}
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
                  {edit.editingId === project.id ? (
                    edit.deletingId === project.id ? (
                      <ConfirmDeleteDialog
                        onCancel={() => edit.setDeletingId(null)}
                        onConfirm={() => edit.handleConfirmDelete(project.id)}
                      />
                    ) : (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={edit.toggleEditIconPicker}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
                          >
                            <ProjectIcon icon={edit.editingIcon} className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            value={edit.editingTitle}
                            onChange={(e) => edit.setEditingTitle(e.target.value)}
                            onBlur={() => edit.handleUpdate(project.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") edit.handleUpdate(project.id)
                              if (e.key === "Escape") edit.cancelEdit()
                            }}
                            className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                            style={{ fontSize: "16px" }}
                            autoFocus
                          />
                        </div>
                        {edit.showEditIconPicker && (
                          <ProjectIconPicker
                            selected={edit.editingIcon}
                            onChange={(icon) => {
                              edit.setEditingIcon(icon)
                              edit.toggleEditIconPicker()
                            }}
                          />
                        )}
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => edit.setDeletingId(project.id)}
                          className="text-xs text-red-400 hover:text-red-600 self-start"
                        >
                          Удалить проект
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center">
                      <button
                        onClick={() => onSelect(project.id)}
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
                          onClick={() => edit.startEditing(project)}
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
          {edit.showNew ? (
            <form onSubmit={edit.handleCreate} className="flex flex-col gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={edit.toggleNewIconPicker}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
                >
                  <ProjectIcon icon={edit.newIcon} className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  placeholder="Название проекта..."
                  value={edit.newTitle}
                  onChange={(e) => edit.setNewTitle(e.target.value)}
                  className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                  style={{ fontSize: "16px" }}
                  autoFocus
                  onBlur={() => {
                    if (!edit.newTitle) edit.setShowNew(false)
                  }}
                />
                <button
                  type="submit"
                  className="text-sm bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
                >
                  +
                </button>
              </div>
              {edit.showNewIconPicker && (
                <ProjectIconPicker
                  selected={edit.newIcon}
                  onChange={(icon) => {
                    edit.setNewIcon(icon)
                    edit.toggleNewIconPicker()
                  }}
                />
              )}
            </form>
          ) : (
            <button
              onClick={() => edit.setShowNew(true)}
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
