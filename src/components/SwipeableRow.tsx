"use client"

import { useRef, useState, useEffect, ReactNode } from "react"

type Props = {
  children: ReactNode
  onSubtasks: () => void
  onDelete: () => void
  subtasksLabel?: string
}

const SWIPE_THRESHOLD = 40   // px moved before we track
const SNAP_OPEN_AT = 60      // px — if dragged past this, snap open/close
const OPEN_WIDTH = 88        // px — total revealed width

export function SwipeableRow({ children, onSubtasks, onDelete, subtasksLabel = "Подзадачи" }: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const dragDirectionRef = useRef<"left" | "right" | null>(null)
  // Once set, the gesture is committed to vertical scroll — swipe must not activate
  const lockedToScrollRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Non-passive listener — must decide before the browser locks scroll direction.
  // Calls preventDefault only when horizontal movement clearly dominates (dx > dy).
  // Respects lockedToScrollRef so a scroll gesture is never interrupted mid-way.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchMove(e: TouchEvent) {
      if (lockedToScrollRef.current) return
      if (startXRef.current === null || startYRef.current === null) return
      const dx = Math.abs(e.touches[0].clientX - startXRef.current)
      const dy = Math.abs(e.touches[0].clientY - startYRef.current)
      if (dx > dy && dx > 5) {
        e.preventDefault()
      }
    }

    el.addEventListener("touchmove", onTouchMove, { passive: false })
    return () => el.removeEventListener("touchmove", onTouchMove)
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    isDraggingRef.current = false
    dragDirectionRef.current = null
    lockedToScrollRef.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (lockedToScrollRef.current) return
    if (startXRef.current === null || startYRef.current === null) return

    const deltaX = e.touches[0].clientX - startXRef.current
    const deltaY = e.touches[0].clientY - startYRef.current
    const absDx = Math.abs(deltaX)
    const absDy = Math.abs(deltaY)

    if (!isDraggingRef.current) {
      // Wait until there's enough movement to determine intent
      if (absDx < 5 && absDy < 5) return

      if (absDy > absDx) {
        // Vertical intent — lock this gesture to scroll, never activate swipe
        lockedToScrollRef.current = true
        return
      }

      if (absDx > SWIPE_THRESHOLD) {
        if (deltaX < 0) {
          isDraggingRef.current = true
          dragDirectionRef.current = "left"
        } else if (isOpen && deltaX > 0) {
          isDraggingRef.current = true
          dragDirectionRef.current = "right"
        } else {
          return
        }
      }
    }

    if (!isDraggingRef.current) return

    const base = isOpen ? -OPEN_WIDTH : 0
    const newOffset = Math.min(0, Math.max(-OPEN_WIDTH, base + deltaX))
    setOffsetX(newOffset)
  }

  function handleTouchEnd() {
    if (!isDraggingRef.current) return

    if (isOpen) {
      if (dragDirectionRef.current === "left") {
        // Left swipe when open → always close
        close()
      } else {
        // Right swipe when open → close if past snap threshold, else spring back
        if (offsetX > -(OPEN_WIDTH - SNAP_OPEN_AT)) {
          close()
        } else {
          setOffsetX(-OPEN_WIDTH)
        }
      }
    } else {
      // Menu closed: open if swiped left far enough
      if (offsetX < -SNAP_OPEN_AT) {
        setOffsetX(-OPEN_WIDTH)
        setIsOpen(true)
      } else {
        setOffsetX(0)
      }
    }

    startXRef.current = null
    startYRef.current = null
    isDraggingRef.current = false
    dragDirectionRef.current = null
    lockedToScrollRef.current = false
  }

  function close() {
    setOffsetX(0)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
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
        className="relative"
        style={{
          transform: `translateX(${offsetX}px)`,
          // eslint-disable-next-line react-hooks/refs
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
