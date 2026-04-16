import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { formatDueDate } from "./dates"

describe("formatDueDate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fix "now" = 2026-04-20 12:00 local time
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("возвращает 'просрочено' для прошедших дат", () => {
    expect(formatDueDate(new Date(2026, 3, 19).toISOString())).toBe("просрочено")
  })

  it("возвращает 'сегодня' для сегодняшней даты", () => {
    expect(formatDueDate(new Date(2026, 3, 20).toISOString())).toBe("сегодня")
  })

  it("возвращает 'завтра' для завтрашней даты", () => {
    expect(formatDueDate(new Date(2026, 3, 21).toISOString())).toBe("завтра")
  })

  it("возвращает локализованную дату для будущего", () => {
    expect(formatDueDate(new Date(2026, 3, 25).toISOString())).toBe("25.04.2026")
  })
})
