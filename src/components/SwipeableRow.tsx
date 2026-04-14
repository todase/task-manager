"use client"

import { useRef, useState, ReactNode } from "react"

type Props = {
  children: ReactNode
  onSubtasks: () => void
  onDelete: () => void
  subtasksLabel?: string
}

const SWIPE_THRESHOLD = 40   // px moved before we track
const SNAP_OPEN_AT = 60      // px — if dragged past this, snap open
const OPEN_WIDTH = 88        // px — total revealed width

export function SwipeableRow({ children, onSubtasks, onDelete, subtasksLabel = "Подзадачи" }: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    isDraggingRef.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return
    const delta = e.touches[0].clientX - startXRef.current

    // Only track leftward swipe
    if (!isDraggingRef.current && Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) isDraggingRef.current = true
      else return
    }

    if (!isDraggingRef.current) return

    const base = isOpen ? -OPEN_WIDTH : 0
    const newOffset = Math.min(0, Math.max(-OPEN_WIDTH, base + delta))
    setOffsetX(newOffset)
  }

  function handleTouchEnd() {
    if (!isDraggingRef.current) return
    const shouldOpen = isOpen
      ? offsetX > -(OPEN_WIDTH - SNAP_OPEN_AT)
      : offsetX < -SNAP_OPEN_AT

    if (shouldOpen || (!isOpen && offsetX < -SNAP_OPEN_AT)) {
      setOffsetX(-OPEN_WIDTH)
      setIsOpen(true)
    } else {
      setOffsetX(0)
      setIsOpen(false)
    }
    startXRef.current = null
    isDraggingRef.current = false
  }

  function close() {
    setOffsetX(0)
    setIsOpen(false)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons (revealed on swipe) — 48px height per spec */}
      <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: OPEN_WIDTH }}>
        <button
          onClick={() => { onSubtasks(); close() }}
          className="flex-1 bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center min-h-[48px]"
        >
          {subtasksLabel}
        </button>
        <button
          onClick={() => { onDelete(); close() }}
          className="flex-1 bg-red-100 text-red-600 text-xs font-medium flex items-center justify-center min-h-[48px]"
        >
          Удалить
        </button>
      </div>

      {/* Main content — slides left */}
      <div
        className="relative bg-white"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDraggingRef.current ? "none" : "transform 200ms ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isOpen ? close : undefined}
      >
        {children}
      </div>
    </div>
  )
}
