"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

export function DraggableTask({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className="flex items-start gap-1"
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing mt-3 px-1 text-lg select-none"
        tabIndex={-1}
      >
        ⠿
      </button>
      <div className="flex-1">{children}</div>
    </div>
  )
}
