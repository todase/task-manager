"use client"

import type { Tag } from "@/types"

interface TagFilterProps {
  tags: Tag[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function TagFilter({ tags, selectedIds, onChange }: TagFilterProps) {
  if (tags.length === 0) return null

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    )
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggle(tag.id)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            selectedIds.includes(tag.id)
              ? "text-white border-transparent"
              : "bg-white border-gray-200 text-gray-600"
          }`}
          style={
            selectedIds.includes(tag.id)
              ? { backgroundColor: tag.color, borderColor: tag.color }
              : {}
          }
        >
          {tag.name}
        </button>
      ))}
      {selectedIds.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}
