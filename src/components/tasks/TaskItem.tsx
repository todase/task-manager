"use client"

import { useState } from "react"
import type { Task, Subtask } from "@/types"
import { SwipeableRow } from "@/components/SwipeableRow"
import { SubtaskPanel } from "@/components/tasks/SubtaskPanel"

function priorityColor(score: number): string {
  // Interpolate from blue (#3b82f6) at score=1 to gray (#e5e7eb) at score=0
  const r = Math.round(59 + (229 - 59) * (1 - score))
  const g = Math.round(130 + (231 - 130) * (1 - score))
  const b = Math.round(246 + (235 - 246) * (1 - score))
  return `rgb(${r}, ${g}, ${b})`
}

interface TaskItemProps {
  task: Task
  showProject: boolean
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onUpdateDescription: (id: string, description: string) => Promise<void>
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
}

export function TaskItem({
  task,
  showProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(task.description ?? "")

  function startEdit() {
    setEditing(true)
    setEditTitle(task.title)
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

  return (
    <SwipeableRow
      onSubtasks={() => setIsOpen((o) => !o)}
      onDelete={() => onDelete(task.id)}
      subtasksLabel={isOpen ? "Свернуть" : "Подзадачи"}
    >
      <div
        className="border rounded p-3"
        style={{ borderLeftWidth: "3px", borderLeftColor: priorityColor(task.priorityScore) }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => onToggle(task)}
            />
            {showProject && task.project && (
              <span className="text-xs text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
                {task.project.title}
              </span>
            )}
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
                className="border p-1 rounded text-sm"
                autoFocus
              />
            ) : (
              <span
                className={task.done ? "line-through text-gray-400" : ""}
                onDoubleClick={startEdit}
              >
                {task.title}
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="date"
              id={`date-${task.id}`}
              value={
                task.dueDate
                  ? new Date(task.dueDate).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
              className="sr-only"
            />
            {task.recurrence && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-400">
                {
                  { daily: "↻ день", weekly: "↻ неделя", monthly: "↻ месяц" }[
                    task.recurrence
                  ]
                }
              </span>
            )}
            {task.dueDate ? (
              <label
                htmlFor={`date-${task.id}`}
                className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${(() => {
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0)
                  if (task.done) return "text-gray-400 bg-gray-100"
                  if (due < today) return "text-red-500 bg-red-50"
                  if (due.getTime() === today.getTime()) return "text-green-600 bg-green-50"
                  return "text-gray-400 bg-gray-100"
                })()}`}
              >
                {new Date(task.dueDate).toLocaleDateString("ru-RU")}
              </label>
            ) : (
              <label
                htmlFor={`date-${task.id}`}
                className="text-xs text-gray-300 hover:text-gray-500 cursor-pointer"
              >
                + дата
              </label>
            )}
            <button
              onClick={() => setIsOpen((o) => !o)}
              className="hidden md:block text-sm text-blue-400 hover:text-blue-600 min-h-[44px] px-2"
            >
              {isOpen ? "Свернуть" : "Подзадачи"}
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="hidden md:block text-sm text-red-400 hover:text-red-600 min-h-[44px] px-2"
            >
              Удалить
            </button>
          </div>
        </div>

        {/* Tag pills */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {editingDesc ? (
          <textarea
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) saveDescription()
              if (e.key === "Escape") {
                setDescValue(task.description ?? "")
                setEditingDesc(false)
              }
            }}
            className="mt-2 w-full border rounded p-2 text-sm text-gray-600 resize-none"
            rows={3}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingDesc(true)}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 text-left"
          >
            ✏{" "}
            {task.description
              ? task.description.slice(0, 60) +
                (task.description.length > 60 ? "…" : "")
              : "Добавить описание"}
          </button>
        )}

        {isOpen && (
          <SubtaskPanel
            taskId={task.id}
            subtasks={task.subtasks}
            onAdd={onAddSubtask}
            onToggle={onToggleSubtask}
            onDelete={onDeleteSubtask}
          />
        )}
      </div>
    </SwipeableRow>
  )
}
