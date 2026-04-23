"use client"

import { useEffect, useRef, useState } from "react"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import {
  Plus,
  X,
  CalendarDays,
  RefreshCw,
  Tag as TagIcon,
  Folder,
} from "lucide-react"
import type { CreateTaskInput } from "@/hooks/useTasks"
import type { Project, Tag } from "@/types"
import { ProjectIcon } from "@/components/projects/ProjectIconPicker"

interface AddTaskFormProps {
  activeProjectId: string | null
  projects: Project[]
  tags: Tag[]
  onSubmit: (input: CreateTaskInput) => Promise<unknown>
  onCreateTag: (name: string) => Promise<Tag>
  defaultDueDate?: string
}

export function AddTaskForm({
  activeProjectId,
  projects,
  tags,
  onSubmit,
  onCreateTag,
  defaultDueDate,
}: AddTaskFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "")
  const [recurrence, setRecurrence] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [activeField, setActiveField] = useState<"date" | "recurrence" | "tags" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  const isOnline = useOnlineStatus()
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => titleInputRef.current?.focus(), 50)
    }
  }, [isModalOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isModalOpen) closeModal()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDueDate(defaultDueDate ?? "")
  }, [defaultDueDate])

  function closeModal() {
    setIsModalOpen(false)
    setTitle("")
    setDueDate(defaultDueDate ?? "")
    setRecurrence("")
    setSelectedTagIds([])
    setTagInput("")
    setShowTagMenu(false)
    setActiveField(null)
    setError(null)
    setSelectedProjectId(null)
    setShowProjectDropdown(false)
  }

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
        ...(activeProjectId
          ? { projectId: activeProjectId }
          : selectedProjectId
          ? { projectId: selectedProjectId }
          : {}),
        ...(selectedTagIds.length > 0 && { tagIds: selectedTagIds }),
      })
      closeModal()
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

  function toggleField(field: "date" | "recurrence" | "tags") {
    setActiveField((prev) => (prev === field ? null : field))
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center transition-colors z-30"
        aria-label="Добавить задачу"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Panel — bottom sheet on mobile, centered on desktop */}
          <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
            <div className="bg-white rounded-t-2xl md:rounded-2xl md:max-w-md md:w-full md:mx-4 shadow-xl pointer-events-auto">
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Modal header */}
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-base font-semibold text-gray-900">
                  Новая задача
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-4 pb-6 flex flex-col gap-3">
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                {/* Title input */}
                <input
                  ref={titleInputRef}
                  type="text"
                  placeholder={placeholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400"
                  style={{ fontSize: "16px" }}
                />

                {/* Icon buttons row */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleField("date")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      dueDate || activeField === "date"
                        ? "bg-blue-50 border-blue-300 text-blue-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    {dueDate
                      ? new Date(dueDate).toLocaleDateString("ru-RU")
                      : "Дата"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleField("recurrence")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      recurrence || activeField === "recurrence"
                        ? "bg-blue-50 border-blue-300 text-blue-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {recurrence
                      ? ({ daily: "День", weekly: "Неделя", monthly: "Месяц" } as Record<string, string>)[recurrence]
                      : "Повтор"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleField("tags")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedTagIds.length > 0 || activeField === "tags"
                        ? "bg-blue-50 border-blue-300 text-blue-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    <TagIcon className="w-3.5 h-3.5" />
                    {selectedTagIds.length > 0
                      ? `Метки (${selectedTagIds.length})`
                      : "Метки"}
                  </button>

                  {activeProjectId === null && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowProjectDropdown((o) => !o)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          selectedProjectId
                            ? "bg-blue-50 border-blue-300 text-blue-600"
                            : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}
                      >
                        {selectedProjectId ? (
                          <>
                            <ProjectIcon
                              icon={projects.find((p) => p.id === selectedProjectId)?.icon ?? "folder"}
                              className="w-3.5 h-3.5"
                            />
                            {projects.find((p) => p.id === selectedProjectId)?.title}
                          </>
                        ) : (
                          <>
                            <Folder className="w-3.5 h-3.5" />
                            Проект
                          </>
                        )}
                      </button>

                      {showProjectDropdown && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[160px] max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onMouseDown={() => {
                              setSelectedProjectId(null)
                              setShowProjectDropdown(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                              !selectedProjectId ? "font-medium text-blue-600" : "text-gray-600"
                            }`}
                          >
                            Без проекта
                          </button>
                          {projects.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={() => {
                                setSelectedProjectId(p.id)
                                setShowProjectDropdown(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                                selectedProjectId === p.id ? "font-medium text-blue-600" : "text-gray-600"
                              }`}
                            >
                              <ProjectIcon icon={p.icon} className="w-3 h-3 flex-shrink-0" />
                              {p.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Date picker */}
                {activeField === "date" && (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2 text-sm text-gray-600 outline-none focus:border-blue-400"
                  />
                )}

                {/* Recurrence picker */}
                {activeField === "recurrence" && (
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2 text-sm text-gray-600 outline-none focus:border-blue-400"
                  >
                    <option value="">Не повторять</option>
                    <option value="daily">Каждый день</option>
                    <option value="weekly">Каждую неделю</option>
                    <option value="monthly">Каждый месяц</option>
                  </select>
                )}

                {/* Tag selector */}
                {activeField === "tags" && (
                  <div className="flex flex-col gap-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Добавить метку..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onFocus={() => setShowTagMenu(true)}
                        onBlur={() => setTimeout(() => setShowTagMenu(false), 150)}
                        className="border border-gray-200 rounded-lg p-2 text-sm w-full outline-none focus:border-blue-400"
                        style={{ fontSize: "16px" }}
                      />
                      {showTagMenu && (filteredTags.length > 0 || tagInput.trim()) && (
                        <div className="absolute top-full left-0 bg-white border rounded-lg shadow-md z-10 w-full max-h-40 overflow-y-auto mt-1">
                          {filteredTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onMouseDown={() => handleSelectTag(tag.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm flex items-center gap-2"
                            >
                              <span
                                className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </button>
                          ))}
                          {isOnline &&
                            tagInput.trim() &&
                            !tags.some(
                              (t) =>
                                t.name.toLowerCase() === tagInput.trim().toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onMouseDown={handleCreateTag}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm text-blue-600"
                              >
                                + Создать «{tagInput.trim()}»
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                    {selectedTagIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
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
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {isSubmitting ? "Создаём..." : "Создать задачу"}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
