"use client"

import { useState, useRef } from "react"
import { Tag as TagIcon } from "lucide-react"
import { useClickOutside } from "@/hooks/useClickOutside"
import type { Tag } from "@/types"

interface TaskTagPickerProps {
  assignedTags: Tag[]
  allTags: Tag[]
  onUpdateTags: (tagIds: string[]) => Promise<unknown>
  onCreateTag: (name: string) => Promise<Tag>
}

export function TaskTagPicker({
  assignedTags,
  allTags,
  onUpdateTags,
  onCreateTag,
}: TaskTagPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [tagError, setTagError] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const assignedTagIds = assignedTags.map((t) => t.id)
  const availableTags = allTags.filter((t) => !assignedTagIds.includes(t.id))

  function closePicker() {
    setShowPicker(false)
    setTagError(null)
  }

  useClickOutside(pickerRef, closePicker, showPicker)

  async function toggleTag(tagId: string) {
    const newIds = assignedTagIds.includes(tagId)
      ? assignedTagIds.filter((id) => id !== tagId)
      : [...assignedTagIds, tagId]
    try {
      await onUpdateTags(newIds)
    } catch {
      setTagError("Не удалось обновить метки")
    }
  }

  async function handleCreateTag() {
    if (!tagInput.trim()) return
    setTagError(null)
    try {
      const tag = await onCreateTag(tagInput.trim())
      setTagInput("")
      closePicker()
      await onUpdateTags([...assignedTagIds, tag.id])
    } catch {
      setTagError("Не удалось создать метку")
    }
  }

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex flex-wrap gap-1 items-center">
        {assignedTags.map((tag) => (
          <span
            key={tag.id}
            className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
            style={{ backgroundColor: tag.color }}
          >
            <TagIcon className="w-2.5 h-2.5" />
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleTag(tag.id)
              }}
              className="hover:opacity-70 ml-0.5 leading-none"
              aria-label={`Снять метку ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowPicker((o) => !o)
            setTagInput("")
          }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded-full border border-dashed border-gray-300 hover:border-gray-400"
        >
          <TagIcon className="w-2.5 h-2.5" />
          + тег
        </button>
      </div>

      {showPicker && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[180px] max-h-48 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={() => {
                toggleTag(tag.id)
                closePicker()
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}
          {availableTags.length === 0 && !tagInput && (
            <p className="px-3 py-2 text-xs text-gray-400">
              Все метки уже назначены
            </p>
          )}
          <div className="border-t border-gray-100 p-2">
            <input
              type="text"
              placeholder="Новая метка..."
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value)
                setTagError(null)
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  await handleCreateTag()
                }
                if (e.key === "Escape") closePicker()
              }}
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400"
              style={{ fontSize: "16px" }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {tagError && <p className="mt-1 text-xs text-red-500">{tagError}</p>}
            {tagInput.trim() &&
              !allTags.some(
                (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onMouseDown={handleCreateTag}
                  className="mt-1 w-full text-left text-xs text-blue-600 px-1 hover:underline"
                >
                  + Создать «{tagInput.trim()}»
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
