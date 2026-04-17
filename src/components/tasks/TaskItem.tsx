"use client"

import { useState, useRef } from "react"
import { useClickOutside } from "@/hooks/useClickOutside"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  CalendarDays,
  Pencil,
} from "lucide-react"
import type { Task, Subtask, Project, Tag } from "@/types"
import { SubtaskPanel } from "@/components/tasks/SubtaskPanel"
import { TaskTagPicker } from "@/components/tasks/TaskTagPicker"
import { ProjectIcon } from "@/components/projects/ProjectIconPicker"
import { formatDueDate } from "@/lib/dates"
import { priorityColor } from "@/lib/priority"

function dateBadgeClasses(task: Task): string {
  if (!task.dueDate) return ""
  if (task.done) return "bg-gray-100 text-gray-400"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  if (due < today) return "bg-red-50 text-red-600"
  if (due.getTime() === today.getTime()) return "bg-green-50 text-green-700"
  return "bg-blue-50 text-blue-700"
}

const RECURRENCE_LABEL: Record<string, string> = {
  daily: "ежедневно",
  weekly: "еженедельно",
  monthly: "ежемесячно",
}

interface TaskItemProps {
  task: Task
  showProject: boolean
  projects: Project[]
  onAssignProject: (taskId: string, projectId: string | null, project: Project | null) => Promise<void>
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onUpdateDescription: (id: string, description: string) => Promise<void>
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
}

export function TaskItem({
  task,
  showProject,
  projects,
  onAssignProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  tags,
  onCreateTag,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(task.description ?? "")
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  useClickOutside(projectDropdownRef, () => setShowProjectDropdown(false), showProjectDropdown)

  function handleRowClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "BUTTON" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "LABEL" ||
      target.closest("button") !== null ||
      target.closest("label") !== null ||
      target.closest("input") !== null ||
      target.closest("textarea") !== null
    )
      return
    setIsOpen((o) => !o)
  }

  async function commitRename() {
    if (!editTitle.trim() || editTitle === task.title) {
      setEditing(false)
      return
    }
    await onRename(task.id, editTitle.trim())
    setEditing(false)
  }

  async function saveDescription() {
    const current = task.description ?? ""
    if (descValue === current) {
      setEditingDesc(false)
      return
    }
    await onUpdateDescription(task.id, descValue)
    setEditingDesc(false)
  }

  const borderColor = isOpen ? "#3b82f6" : priorityColor(task.priorityScore)
  const dateInputId = `date-${task.id}`

  return (
    <>
      {/* Hidden native date picker */}
      <input
        type="date"
        id={dateInputId}
        value={
          task.dueDate
            ? new Date(task.dueDate).toISOString().split("T")[0]
            : ""
        }
        onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
        className="sr-only"
      />

      <div
        className="bg-white rounded-xl shadow-sm cursor-pointer select-none overflow-hidden"
        style={{ borderLeft: `3px solid ${borderColor}` }}
        onClick={handleRowClick}
      >
        {/* ─── Collapsed row ─── */}
        <div className={`flex gap-3 px-3 py-4 ${isOpen ? "items-start" : "items-center"}`}>
          {/* Round checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(task)
            }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              task.done
                ? "border-blue-500 bg-blue-500"
                : "border-gray-300 hover:border-blue-400"
            }`}
            aria-label={task.done ? "Отметить невыполненной" : "Отметить выполненной"}
          >
            {task.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>

          {/* Project icon (when showing all projects) */}
          {showProject && task.project && (
            <span
              className="text-blue-500 flex-shrink-0"
              title={task.project.title}
            >
              <ProjectIcon icon={task.project.icon} className="w-4 h-4" />
            </span>
          )}

          {/* Title */}
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename()
                if (e.key === "Escape") setEditing(false)
              }}
              className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
              style={{ fontSize: "16px" }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`text-sm font-medium flex-1 min-w-0 ${
                isOpen ? "break-words" : "truncate"
              } ${task.done ? "line-through text-gray-400" : "text-gray-900"}`}
            >
              {task.title}
            </span>
          )}

          {/* Date badge (only in collapsed) */}
          {task.dueDate && !isOpen && (
            <label
              htmlFor={dateInputId}
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer flex-shrink-0 ${dateBadgeClasses(task)}`}
              onClick={(e) => e.stopPropagation()}
            >
              {formatDueDate(task.dueDate)}
            </label>
          )}

          {/* Chevron toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen((o) => !o)
            }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label={isOpen ? "Свернуть" : "Развернуть"}
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ─── Expanded section ─── */}
        {isOpen && (
          <div className="border-t border-gray-100 px-3 pb-3 pt-2 flex flex-col gap-2.5 animate-expand">
            {/* Project chip + rename button row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Project chip */}
              <div className="relative" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowProjectDropdown((o) => !o)
                  }}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                    task.project
                      ? "bg-blue-50 border-blue-300 text-blue-600"
                      : "border-gray-200 text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {task.project ? (
                    <>
                      <ProjectIcon icon={task.project.icon} className="w-3 h-3" />
                      <span>{task.project.title}</span>
                    </>
                  ) : (
                    <span>Без проекта</span>
                  )}
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {showProjectDropdown && (
                  <div
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[160px] max-h-48 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onAssignProject(task.id, null, null)
                        setShowProjectDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                        !task.project ? "font-medium text-blue-600" : "text-gray-600"
                      }`}
                    >
                      Без проекта
                    </button>
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onAssignProject(task.id, p.id, p)
                          setShowProjectDropdown(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                          task.project?.id === p.id ? "font-medium text-blue-600" : "text-gray-600"
                        }`}
                      >
                        <ProjectIcon icon={p.icon} className="w-3 h-3 flex-shrink-0" />
                        {p.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rename button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(true)
                  setEditTitle(task.title)
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-full border border-gray-200 hover:border-gray-400 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                переименовать
              </button>
            </div>

            {/* Tags */}
            <TaskTagPicker
              assignedTags={task.tags}
              allTags={tags}
              onUpdateTags={(tagIds) => onUpdateTags(task.id, tagIds)}
              onCreateTag={onCreateTag}
            />

            {/* Recurrence */}
            {task.recurrence && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <RefreshCw className="w-3 h-3" />
                <span>{RECURRENCE_LABEL[task.recurrence] ?? task.recurrence}</span>
              </div>
            )}

            {/* Date with icon + clear button */}
            <div className="flex items-center gap-2">
              <label
                htmlFor={dateInputId}
                className={`flex items-center gap-1 text-xs cursor-pointer ${
                  task.dueDate
                    ? `${dateBadgeClasses(task)} px-2 py-0.5 rounded-full`
                    : "text-gray-400 hover:text-gray-600"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarDays className="w-3 h-3" />
                {task.dueDate ? formatDueDate(task.dueDate) : "Добавить дату"}
              </label>
              {task.dueDate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdateDueDate(task.id, "")
                  }}
                  className="text-gray-300 hover:text-gray-500 leading-none"
                  tabIndex={-1}
                  aria-label="Сбросить дату"
                >
                  ×
                </button>
              )}
            </div>

            {/* Description */}
            {editingDesc ? (
              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) saveDescription()
                    if (e.key === "Escape") {
                      setDescValue(task.description ?? "")
                      setEditingDesc(false)
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-600 resize-none outline-none focus:border-blue-400"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={saveDescription}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                  >
                    Сохранить
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setDescValue(task.description ?? "")
                      setEditingDesc(false)
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingDesc(true)
                  setDescValue(task.description ?? "")
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 text-left italic"
              >
                <Pencil className="w-3 h-3 flex-shrink-0" />
                {task.description
                  ? task.description.slice(0, 100) +
                    (task.description.length > 100 ? "…" : "")
                  : "Добавить описание..."}
              </button>
            )}

            {/* Subtask panel */}
            <SubtaskPanel
              taskId={task.id}
              subtasks={task.subtasks}
              onAdd={onAddSubtask}
              onToggle={onToggleSubtask}
              onDelete={onDeleteSubtask}
            />

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 self-start mt-1"
            >
              <Trash2 className="w-4 h-4" />
              Удалить задачу
            </button>
          </div>
        )}
      </div>
    </>
  )
}
