"use client"

import { useDroppable } from "@dnd-kit/core"

export function DroppableProject({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-full transition-all ${isOver ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
    >
      {children}
    </div>
  )
}
