"use client"

import { useState } from "react"
import type { CreateTaskInput } from "@/hooks/useTasks"
import type { Project } from "@/types"

interface AddTaskFormProps {
  activeProjectId: string | null
  projects: Project[]
  inputRef: React.RefObject<HTMLInputElement>
  onSubmit: (input: CreateTaskInput) => Promise<void>
}

export function AddTaskForm({
  activeProjectId,
  projects,
  inputRef,
  onSubmit,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [recurrence, setRecurrence] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        ...(dueDate && { dueDate }),
        ...(recurrence && { recurrence }),
        ...(activeProjectId && { projectId: activeProjectId }),
      })
      setTitle("")
      setDueDate("")
      setRecurrence("")
    } catch {
      setError("Не удалось создать задачу. Попробуйте ещё раз.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const placeholder = activeProjectId
    ? `Задача в «${projects.find((p) => p.id === activeProjectId)?.title}»...`
    : "Новая задача..."

  return (
    <div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 mb-6 md:static md:shadow-none md:bg-transparent sticky bottom-[80px] z-30 bg-white rounded-lg focus-within:shadow-lg focus-within:px-3 focus-within:py-2 transition-all"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-500 text-white px-4 rounded disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Добавить"}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500 flex-1"
          />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500"
          >
            <option value="">Не повторять</option>
            <option value="daily">Каждый день</option>
            <option value="weekly">Каждую неделю</option>
            <option value="monthly">Каждый месяц</option>
          </select>
        </div>
      </form>
    </div>
  )
}
