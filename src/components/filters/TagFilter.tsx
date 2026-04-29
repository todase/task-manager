"use client"

import { useState } from "react"
import { Tag, ChevronDown, ChevronUp, Pencil } from "lucide-react"
import { useTagEditing } from "@/hooks/useTagEditing"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import type { Tag as TagType } from "@/types"

interface TagFilterProps {
  tags: TagType[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  isOpen: boolean
  onToggle: () => void
  onUpdate: (id: string, updates: { name?: string }) => Promise<TagType>
  onDelete: (id: string) => Promise<void>
}

export function TagFilter({
  tags,
  selectedIds,
  onChange,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
}: TagFilterProps) {
  const edit = useTagEditing({ onUpdate, onDelete })
  const isOnline = useOnlineStatus()
  const [lastTappedId, setLastTappedId] = useState<string | null>(null)

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id))
      if (lastTappedId === id) setLastTappedId(null)
    } else {
      onChange([...selectedIds, id])
      setLastTappedId(id)
    }
  }

  const badgeCount = selectedIds.length > 0 ? selectedIds.length : tags.length

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
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
          {edit.error && <p className="text-xs text-red-500 w-full">{edit.error}</p>}
          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Теги появятся здесь после создания
            </p>
          ) : (
            <>
              {tags.map((tag) => {
                const active = selectedIds.includes(tag.id)

                if (edit.editingId === tag.id) {
                  if (edit.deletingId === tag.id) {
                    return (
                      <span key={tag.id} className="text-xs flex items-center gap-2">
                        Удалить «{tag.name}»?{" "}
                        <button
                          onClick={() => edit.handleConfirmDelete(tag.id)}
                          className="text-red-600 font-medium hover:underline"
                        >
                          Да
                        </button>
                        {" · "}
                        <button
                          onClick={() => edit.setDeletingId(null)}
                          className="text-gray-500 hover:underline"
                        >
                          Отмена
                        </button>
                      </span>
                    )
                  }
                  return (
                    <span key={tag.id} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={edit.editingName}
                        onChange={(e) => edit.setEditingName(e.target.value)}
                        onBlur={() => edit.handleUpdate(tag.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") edit.handleUpdate(tag.id)
                          if (e.key === "Escape") edit.cancelEdit()
                        }}
                        className="border px-2 py-0.5 rounded text-xs outline-none focus:border-blue-400 w-28"
                        style={{ fontSize: "16px" }}
                        autoFocus
                      />
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => edit.setDeletingId(tag.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  )
                }

                const showEdit = active && tag.id === lastTappedId

                return (
                  <span key={tag.id} className="flex items-center">
                    <button
                      onClick={() => toggle(tag.id)}
                      aria-expanded={showEdit || undefined}
                      className="text-xs px-2.5 py-1 border transition-colors"
                      style={
                        active
                          ? {
                              backgroundColor: tag.color,
                              borderColor: tag.color,
                              color: "white",
                              borderRadius: showEdit ? "9999px 0 0 9999px" : "9999px",
                            }
                          : {
                              backgroundColor: `${tag.color}26`,
                              borderColor: `${tag.color}80`,
                              color: tag.color,
                              borderRadius: "9999px",
                            }
                      }
                    >
                      {tag.name}
                    </button>
                    {showEdit && (
                      <button
                        onClick={() => edit.startEditing(tag)}
                        disabled={!isOnline}
                        title={!isOnline ? "Недоступно без подключения" : undefined}
                        className="flex items-center justify-center px-1.5 py-1 border border-l-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: tag.color,
                          borderColor: tag.color,
                          color: "white",
                          borderRadius: "0 9999px 9999px 0",
                        }}
                        aria-label="Редактировать метку"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )
              })}
              {selectedIds.length > 0 && (
                <button
                  onClick={() => { onChange([]); setLastTappedId(null) }}
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
