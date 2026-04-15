"use client"

import { useState } from "react"
import type { CreateTaskInput } from "@/hooks/useTasks"
import type { Project, Tag } from "@/types"

interface AddTaskFormProps {
  activeProjectId: string | null
  projects: Project[]
  tags: Tag[]
  inputRef: React.RefObject<HTMLInputElement>
  onSubmit: (input: CreateTaskInput) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
}

export function AddTaskForm({
  activeProjectId,
  projects,
  tags,
  inputRef,
  onSubmit,
  onCreateTag,
}: AddTaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [recurrence, setRecurrence] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showTagMenu, setShowTagMenu] = useState(false)
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
        ...(selectedTagIds.length > 0 && { tagIds: selectedTagIds }),
      })
      setTitle("")
      setDueDate("")
      setRecurrence("")
      setSelectedTagIds([])
    } catch {
      setError("Не удалось создать задачу. Попробуйте ещё раз.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const placeholder = activeProjectId
    ? `Задача в «${projects.find((p) => p.id === activeProjectId)?.title}»...`
    : "Новая задача..."

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTagIds.includes(t.id)
  )

  async function handleSelectTag(id: string) {
    setSelectedTagIds((prev) => [...prev, id])
    setTagInput("")
    setShowTagMenu(false)
  }

  async function handleCreateTag() {
    if (!tagInput.trim()) return
    const tag = await onCreateTag(tagInput.trim())
    setSelectedTagIds((prev) => [...prev, tag.id])
    setTagInput("")
    setShowTagMenu(false)
  }

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

        {/* Tag selector */}
        <div className="relative">
          <input
            type="text"
            placeholder="Добавить метку..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setShowTagMenu(true)}
            onBlur={() => setTimeout(() => setShowTagMenu(false), 150)}
            className="border p-2 rounded text-sm w-full"
          />
          {showTagMenu && (filteredTags.length > 0 || tagInput.trim()) && (
            <div className="absolute top-full left-0 bg-white border rounded shadow-md z-10 w-full max-h-40 overflow-y-auto">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={() => handleSelectTag(tag.id)}
                  className="w-full text-left px-3 py-1 hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
              {tagInput.trim() &&
                !tags.some(
                  (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
                ) && (
                  <button
                    type="button"
                    onMouseDown={handleCreateTag}
                    className="w-full text-left px-3 py-1 hover:bg-gray-50 text-sm text-blue-600"
                  >
                    + Создать «{tagInput.trim()}»
                  </button>
                )}
            </div>
          )}
          {selectedTagIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedTagIds.map((id) => {
                const tag = tags.find((t) => t.id === id)
                if (!tag) return null
                return (
                  <span
                    key={id}
                    className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTagIds((prev) => prev.filter((s) => s !== id))
                      }
                      className="hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
