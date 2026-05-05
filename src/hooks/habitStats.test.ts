import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { computeHabitStats } from "./habitStats"
import type { HabitLog } from "@/types"

function makeLog(dateStr: string, mood?: "energized" | "neutral" | "tired"): HabitLog {
  return {
    id: dateStr,
    taskId: "task-1",
    date: `${dateStr}T00:00:00.000Z`,
    reflection: mood ? { mood, difficulty: 1 } : null,
  }
}

const CREATED_AT = new Date("2026-01-01T00:00:00.000Z")

describe("computeHabitStats — streak", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z")) // UTC today = 2026-04-30
  })
  afterEach(() => vi.useRealTimers())

  it("returns 0 streak when no logs", () => {
    const { streak } = computeHabitStats([], "daily", CREATED_AT)
    expect(streak).toBe(0)
  })

  it("counts consecutive days ending today", () => {
    const logs = [makeLog("2026-04-28"), makeLog("2026-04-29"), makeLog("2026-04-30")]
    const { streak } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(streak).toBe(3)
  })

  it("counts streak ending yesterday when today has no log", () => {
    const logs = [makeLog("2026-04-28"), makeLog("2026-04-29")]
    const { streak } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(streak).toBe(2)
  })

  it("resets streak if yesterday is missing (gap)", () => {
    const logs = [makeLog("2026-04-27"), makeLog("2026-04-30")]
    const { streak } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(streak).toBe(1) // only today counts
  })

  it("returns 0 streak for weekly habits", () => {
    const logs = [makeLog("2026-04-29")]
    const { streak } = computeHabitStats(logs, "weekly", CREATED_AT)
    expect(streak).toBe(0)
  })
})

describe("computeHabitStats — completion rate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"))
  })
  afterEach(() => vi.useRealTimers())

  it("caps daily denominator by createdAt", () => {
    const recentCreated = new Date("2026-04-28T00:00:00.000Z") // 3 days ago
    const logs = [makeLog("2026-04-28"), makeLog("2026-04-29"), makeLog("2026-04-30")]
    const { completionRate } = computeHabitStats(logs, "daily", recentCreated)
    expect(completionRate).toBeCloseTo(1.0)
  })

  it("returns < 1.0 rate when some days missed", () => {
    const recentCreated = new Date("2026-04-28T00:00:00.000Z")
    const logs = [makeLog("2026-04-28")]
    const { completionRate } = computeHabitStats(logs, "daily", recentCreated)
    // 1 log out of 2 past days (today Apr 30 not logged → excluded from denominator)
    expect(completionRate).toBeCloseTo(1 / 2)
  })

  it("includes today in denominator when today is logged", () => {
    const recentCreated = new Date("2026-04-28T00:00:00.000Z")
    const logs = [makeLog("2026-04-28"), makeLog("2026-04-30")]
    const { completionRate } = computeHabitStats(logs, "daily", recentCreated)
    // 2 logged out of 3 days (Apr 28, 29, 30 — today logged so counts in denominator)
    expect(completionRate).toBeCloseTo(2 / 3)
  })

  it("caps weekly denominator by createdAt (less than 12 weeks)", () => {
    const twoWeeksAgo = new Date("2026-04-16T00:00:00.000Z")
    const logs = [makeLog("2026-04-20"), makeLog("2026-04-27")]
    const { completionRate } = computeHabitStats(logs, "weekly", twoWeeksAgo)
    expect(completionRate).toBeCloseTo(1.0) // 2 of 2 weeks
  })

  it("computes monthly rate (1 of 3 months)", () => {
    const threeMonthsAgo = new Date("2026-02-01T00:00:00.000Z")
    const logs = [makeLog("2026-02-15")]
    const { completionRate } = computeHabitStats(logs, "monthly", threeMonthsAgo)
    expect(completionRate).toBeCloseTo(1 / 3)
  })
})

describe("computeHabitStats — moodTrend", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z")) // UTC today = 2026-04-30
  })
  afterEach(() => vi.useRealTimers())

  it("returns last 10 logs with non-null mood in chronological order", () => {
    const logs = [
      makeLog("2026-04-20", "energized"),
      makeLog("2026-04-21"), // no mood
      makeLog("2026-04-22", "neutral"),
      makeLog("2026-04-23", "tired"),
    ]
    const { moodTrend } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(moodTrend).toEqual(["energized", "neutral", "tired"])
  })

  it("returns at most 10 moods", () => {
    const logs = Array.from({ length: 15 }, (_, i) =>
      makeLog(`2026-04-${String(i + 1).padStart(2, "0")}`, "neutral")
    )
    const { moodTrend } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(moodTrend).toHaveLength(10)
  })

  it("excludes logs outside the completion rate window for weekly habits", () => {
    // log from 6 months ago — outside 12-week window
    const oldLog = makeLog("2025-10-01", "tired")
    // log from 3 weeks ago — within 12-week window
    const recentLog = makeLog("2026-04-10", "energized")
    const { moodTrend } = computeHabitStats([oldLog, recentLog], "weekly", CREATED_AT)
    expect(moodTrend).toEqual(["energized"])
  })

  it("excludes logs outside the completion rate window for monthly habits", () => {
    // log from 13 months ago — outside 12-month window
    const oldLog = makeLog("2025-03-15", "tired")
    // log from 2 months ago — within 12-month window
    const recentLog = makeLog("2026-02-20", "neutral")
    const { moodTrend } = computeHabitStats([oldLog, recentLog], "monthly", CREATED_AT)
    expect(moodTrend).toEqual(["neutral"])
  })
})

describe("computeHabitStats — weeklyTarget", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z")) // Thursday
  })
  afterEach(() => vi.useRealTimers())

  it("counts week as complete when logs >= weeklyTarget", () => {
    // Created Apr 27 (Monday of current week) → only 1 week in window
    const createdThisWeek = new Date("2026-04-27T00:00:00.000Z")
    const logs = [makeLog("2026-04-27"), makeLog("2026-04-28"), makeLog("2026-04-29")]
    const { completionRate } = computeHabitStats(logs, "weekly", createdThisWeek, 3)
    expect(completionRate).toBeCloseTo(1.0)
  })

  it("does not count week as complete when logs < weeklyTarget", () => {
    const twoWeeksAgo = new Date("2026-04-16T00:00:00.000Z")
    // Week 1 (Apr 14–20): 1 log, Week 2 (Apr 21–27): 3 logs. target = 3 → 1 complete out of 2
    const logs = [makeLog("2026-04-15"), makeLog("2026-04-21"), makeLog("2026-04-22"), makeLog("2026-04-23")]
    const { completionRate } = computeHabitStats(logs, "weekly", twoWeeksAgo, 3)
    expect(completionRate).toBeCloseTo(0.5)
  })

  it("defaults to target=1 when weeklyTarget omitted (backward compat)", () => {
    const twoWeeksAgo = new Date("2026-04-16T00:00:00.000Z")
    const logs = [makeLog("2026-04-20"), makeLog("2026-04-27")]
    const { completionRate } = computeHabitStats(logs, "weekly", twoWeeksAgo)
    expect(completionRate).toBeCloseTo(1.0)
  })
})
