"use client"

import { useState } from "react"
import { Tag, ChevronDown, ChevronUp } from "lucide-react"
import type { Tag as TagType } from "@/types"

interface TagFilterProps {
  tags: TagType[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function TagFilter({ tags, selectedIds, onChange }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    )
  }

  const badgeCount = selectedIds.length > 0 ? selectedIds.length : tags.length

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
      >
        <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 flex-1">Метки</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            selectedIds.length > 0
              ? "bg-blue-100 text-blue-600"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {badgeCount}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2 animate-expand">
          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Теги появятся здесь после создания
            </p>
          ) : (
            <>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggle(tag.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedIds.includes(tag.id)
                      ? "text-white border-transparent"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
