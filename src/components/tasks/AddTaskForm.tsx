"use client"

import { useEffect, useRef, useState } from "react"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { Plus, X, CalendarDays, Tag as TagIcon, Folder } from "lucide-react"
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
  const [estimatedMinutes, setEstimatedMinutes] = useState("")
  const [isHabit, setIsHabit] = useState(false)
  const [recurrence, setRecurrence] = useState("daily")
  const [weeklyTarget, setWeeklyTarget] = useState(3)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  const isOnline = useOnlineStatus()
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isModalOpen) setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [isModalOpen])

  function closeModal() {
    setIsModalOpen(false)
    setTitle("")
    setDueDate(defaultDueDate ?? "")
    setEstimatedMinutes("")
    setIsHabit(false)
    setRecurrence("daily")
    setWeeklyTarget(3)
    setSelectedTagIds([])
    setTagInput("")
    setShowTagMenu(false)
    setShowDatePicker(false)
    setSelectedProjectId(null)
    setShowProjectDropdown(false)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isModalOpen) closeModal()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDueDate(defaultDueDate ?? "")
  }, [defaultDueDate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const estMin = estimatedMinutes ? Number(estimatedMinutes) : undefined
    void onSubmit({
      title: title.trim(),
      ...(dueDate && { dueDate }),
      ...(isHabit && {
        isHabit: true,
        recurrence,
        ...(recurrence === "weekly" && { weeklyTarget }),
      }),
      ...(activeProjectId
        ? { projectId: activeProjectId }
        : selectedProjectId
        ? { projectId: selectedProjectId }
        : {}),
      ...(selectedTagIds.length > 0 && { tagIds: selectedTagIds }),
      ...(estMin != null && Number.isFinite(estMin) && estMin > 0 && { estimatedMinutes: estMin }),
    })
    closeModal()
  }

  const placeholder = activeProjectId
    ? `Задача в «${projects.find((p) => p.id === activeProjectId)?.title}»...`
    : "Новая задача..."

  const filteredTags = tags.filter(
    (t) => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTagIds.includes(t.id)
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm mx-4 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Новая задача</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600" aria-label="Закрыть">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Title */}
              <input
                ref={titleInputRef}
                type="text"
                placeholder={placeholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400"
                style={{ fontSize: "16px" }}
              />

              {/* Estimated time */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  placeholder="—"
                  min={1}
                  max={1440}
                  aria-label="ожидаемое время мин"
                  className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                />
                <span className="text-sm text-gray-500">мин · ожидаемое время</span>
              </div>

              {/* Pill buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    dueDate || showDatePicker
                      ? "bg-blue-50 border-blue-300 text-blue-600"
                      : "border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  {dueDate ? new Date(dueDate).toLocaleDateString("ru-RU") : "Дата"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTagMenu((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedTagIds.length > 0 || showTagMenu
                      ? "bg-blue-50 border-blue-300 text-blue-600"
                      : "border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  {selectedTagIds.length > 0 ? `Метки (${selectedTagIds.length})` : "Метки"}
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
                          <ProjectIcon icon={projects.find((p) => p.id === selectedProjectId)?.icon ?? "folder"} className="w-3.5 h-3.5" />
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
                          onMouseDown={() => { setSelectedProjectId(null); setShowProjectDropdown(false) }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${!selectedProjectId ? "font-medium text-blue-600" : "text-gray-600"}`}
                        >
                          Без проекта
                        </button>
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => { setSelectedProjectId(p.id); setShowProjectDropdown(false) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${selectedProjectId === p.id ? "font-medium text-blue-600" : "text-gray-600"}`}
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
              {showDatePicker && (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2 text-sm text-gray-600 outline-none focus:border-blue-400"
                />
              )}

              {/* Tag selector */}
              {showTagMenu && (
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
                            <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </button>
                        ))}
                        {isOnline && tagInput.trim() && !tags.some((t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
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
                          <span key={id} className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1" style={{ backgroundColor: tag.color }}>
                            {tag.name}
                            <button type="button" onClick={() => setSelectedTagIds((prev) => prev.filter((s) => s !== id))} className="hover:opacity-70">×</button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Habit block — always visible */}
              <div className={`rounded-xl border px-3 py-2.5 transition-colors ${isHabit ? "border-purple-300 bg-purple-50" : "border-gray-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔁</span>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isHabit ? "text-purple-700" : "text-gray-700"}`}>Привычка</div>
                    {!isHabit && <div className="text-xs text-gray-400">повторяющаяся задача</div>}
                  </div>
                  {/* Toggle */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isHabit}
                    aria-label="Включить привычку"
                    onClick={() => {
                      setIsHabit((v) => !v)
                      if (!isHabit) setRecurrence("daily")
                    }}
                    className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative p-0 ${isHabit ? "bg-purple-500" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isHabit ? "translate-x-[1.125rem]" : ""}`} />
                  </button>
                </div>

                {isHabit && (
                  <div className="mt-3 flex flex-col gap-2">
                    {/* Period picker */}
                    <div className="flex gap-2">
                      {(["daily", "weekly", "monthly"] as const).map((r) => {
                        const labels = { daily: "День", weekly: "Неделя", monthly: "Месяц" }
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => { setRecurrence(r); if (r !== "weekly") setWeeklyTarget(3) }}
                            className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                              recurrence === r
                                ? "border-purple-400 bg-purple-100 text-purple-700 font-medium"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {labels[r]}
                          </button>
                        )
                      })}
                    </div>

                    {/* Weekly target counter */}
                    {recurrence === "weekly" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Уменьшить"
                          onClick={() => setWeeklyTarget((v) => Math.max(1, v - 1))}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-400 flex items-center justify-center text-sm"
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold text-purple-700 w-4 text-center">{weeklyTarget}</span>
                        <button
                          type="button"
                          aria-label="Увеличить"
                          onClick={() => setWeeklyTarget((v) => Math.min(7, v + 1))}
                          className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-400 flex items-center justify-center text-sm"
                        >
                          +
                        </button>
                        <span className="text-xs text-gray-500">раз в неделю</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Создать задачу
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
