"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export function SortableTask({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="flex items-start gap-1"
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing mt-3 px-1 text-lg select-none"
        style={{ touchAction: "none" }}
        tabIndex={-1}
      >
        ⠿
      </button>
      <div className="flex-1">{children}</div>
    </li>
  )
}
