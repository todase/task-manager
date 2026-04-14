"use client"

import { useState } from "react"
import { SwipeableRow } from "@/components/SwipeableRow"
import { SubtaskPanel } from "@/components/tasks/SubtaskPanel"
import type { Task, Subtask } from "@/types"

interface TaskItemProps {
  task: Task
  showProject: boolean
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
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
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")

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

  return (
    <SwipeableRow
      onSubtasks={() => setIsOpen((o) => !o)}
      onDelete={() => onDelete(task.id)}
      subtasksLabel={isOpen ? "Свернуть" : "Подзадачи"}
    >
      <div className="border rounded p-3">
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
              defaultValue={
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
              <span
                onClick={() =>
                  (
                    document.getElementById(`date-${task.id}`) as HTMLInputElement
                  )?.showPicker()
                }
                className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                  new Date(task.dueDate) < new Date() && !task.done
                    ? "text-red-500 bg-red-50"
                    : "text-gray-400 bg-gray-100"
                }`}
              >
                {new Date(task.dueDate).toLocaleDateString("ru-RU")}
              </span>
            ) : (
              <button
                onClick={() =>
                  (
                    document.getElementById(`date-${task.id}`) as HTMLInputElement
                  )?.showPicker()
                }
                className="text-xs text-gray-300 hover:text-gray-500"
              >
                + дата
              </button>
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
