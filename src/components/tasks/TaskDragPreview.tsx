"use client"

import type { Task } from "@/types"
import { Check } from "lucide-react"

function priorityColor(score: number): string {
  const r = Math.round(59 + (229 - 59) * (1 - score))
  const g = Math.round(130 + (231 - 130) * (1 - score))
  const b = Math.round(246 + (235 - 246) * (1 - score))
  return `rgb(${r}, ${g}, ${b})`
}

export function TaskDragPreview({ task }: { task: Task }) {
  return (
    <div
      className="bg-white rounded-xl select-none overflow-hidden"
      style={{
        borderLeft: `3px solid ${priorityColor(task.priorityScore)}`,
        transform: "scale(1.03)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex gap-3 px-3 py-4 items-center">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            task.done ? "border-blue-500 bg-blue-500" : "border-gray-300"
          }`}
        >
          {task.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        <span className="text-sm font-medium text-gray-900 truncate flex-1">
          {task.title}
        </span>
      </div>
    </div>
  )
}
