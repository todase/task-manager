"use client"

import { useState } from "react"
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

  return (
    <div className="mt-3 pl-6">
      <ul className="flex flex-col gap-2 mb-2">
        {subtasks.map((subtask) => (
          <li key={subtask.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subtask.done}
                onChange={() => onToggle(taskId, subtask)}
              />
              <span
                className={
                  subtask.done ? "line-through text-gray-400 text-sm" : "text-sm"
                }
              >
                {subtask.title}
              </span>
            </div>
            <button
              onClick={() => onDelete(taskId, subtask.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Новая подзадача..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border p-1 rounded text-sm flex-1"
        />
        <button
          type="submit"
          className="bg-blue-400 text-white px-3 rounded text-sm"
        >
          +
        </button>
      </form>
    </div>
  )
}
