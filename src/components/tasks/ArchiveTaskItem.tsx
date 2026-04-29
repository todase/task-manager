"use client"

import { useState } from "react"
import { BookOpen, RotateCcw, Trash2 } from "lucide-react"
import type { Task } from "@/types"

const DIFFICULTY_LABEL: Record<number, [string, string]> = {
  1: ["😊", "Легко"],
  2: ["😐", "Нормально"],
  3: ["😤", "Сложно"],
}

const MOOD_LABEL: Record<string, string> = {
  energized: "зарядился",
  neutral: "нейтрально",
  tired: "устал",
}

interface ArchiveTaskItemProps {
  task: Task
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

export function ArchiveTaskItem({ task, onRestore, onDelete }: ArchiveTaskItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const reflection = task.reflections?.[0]
  const hasReflection = (task.reflections?.length ?? 0) > 0

  return (
    <li className="rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
      <div
        className={`flex items-center gap-3 p-4 select-none ${hasReflection ? "cursor-pointer" : ""}`}
        onClick={hasReflection ? () => setIsOpen((o) => !o) : undefined}
        role={hasReflection ? "button" : undefined}
        aria-expanded={hasReflection ? isOpen : undefined}
        tabIndex={hasReflection ? 0 : undefined}
        onKeyDown={hasReflection ? (e) => { if (e.key === "Enter" || e.key === " ") setIsOpen((o) => !o) } : undefined}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 line-through truncate">
            {task.title}
          </p>
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {task.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(task.reflections?.length ?? 0) > 0 && (
            <span title="Есть рефлексия">
              <BookOpen
                className="w-4 h-4 text-gray-400"
                aria-label="Есть рефлексия"
              />
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRestore(task.id)
            }}
            className="p-1.5 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
            aria-label="Восстановить"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(task.id)
            }}
            className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
            aria-label="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen && reflection && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Рефлексия
          </p>
          {reflection.notes && (
            <p className="text-sm text-gray-600">{reflection.notes}</p>
          )}
          {reflection.timeMinutes != null && (
            <p className="text-sm text-gray-500">⏱ {reflection.timeMinutes} мин</p>
          )}
          {reflection.difficulty != null && DIFFICULTY_LABEL[reflection.difficulty]?.[0] && (
            <p className="text-sm text-gray-500">
              {DIFFICULTY_LABEL[reflection.difficulty][0]} {DIFFICULTY_LABEL[reflection.difficulty][1]}
            </p>
          )}
          {reflection.mood && (
            <span className="self-start text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {MOOD_LABEL[reflection.mood] ?? reflection.mood}
            </span>
          )}
          <p className="text-xs text-gray-400">
            {new Date(reflection.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      )}
    </li>
  )
}
