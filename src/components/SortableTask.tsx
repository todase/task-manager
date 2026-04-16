"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export function SortableTask({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: isDragging
          ? `${CSS.Transform.toString(transform)} scale(1.03)`
          : CSS.Transform.toString(transform),
        transition,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : undefined,
        zIndex: isDragging ? 50 : undefined,
        opacity: 1,
        // "manipulation" allows native scroll; "none" would block it.
        // TouchSensor with delay:500 handles drag without needing "none".
        touchAction: "manipulation",
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </li>
  )
}
