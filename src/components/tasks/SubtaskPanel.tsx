"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { Subtask } from "@/types"

interface SubtaskPanelProps {
  taskId: string
  subtasks: Subtask[]
  onAdd: (taskId: string, title: string) => Promise<void>
  onToggle: (taskId: string, subtask: Subtask) => Promise<void>
  onDelete: (taskId: string, subtaskId: string) => Promise<void>
}

export function SubtaskPanel({
  taskId,
  subtasks,
  onAdd,
  onToggle,
  onDelete,
}: SubtaskPanelProps) {
  const [input, setInput] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    await onAdd(taskId, input.trim())
    setInput("")
  }

  const doneCount = subtasks.filter((s) => s.done).length

  return (
    <div className="flex flex-col gap-1.5">
      {subtasks.length > 0 && (
        <p className="text-xs text-gray-400 font-medium">
          Подзадачи {doneCount}/{subtasks.length}
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {subtasks.map((subtask) => (
          <li key={subtask.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={subtask.done}
              onChange={() => onToggle(taskId, subtask)}
              className="w-3.5 h-3.5 rounded accent-blue-500 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <span
              className={`text-sm flex-1 ${
                subtask.done ? "line-through text-gray-400" : "text-gray-700"
              }`}
            >
              {subtask.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(taskId, subtask.id)
              }}
              className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              aria-label="Удалить подзадачу"
            >
              <X className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Добавить подзадачу..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="text-sm flex-1 border-b border-gray-200 py-0.5 outline-none focus:border-blue-400 bg-transparent text-gray-700 placeholder:text-gray-300"
        />
        <button
          type="submit"
          className="text-blue-400 hover:text-blue-600 text-sm font-medium flex-shrink-0"
        >
          +
        </button>
      </form>
    </div>
  )
}
