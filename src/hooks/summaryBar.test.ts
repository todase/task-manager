import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { computeHabitRate7d } from "./summaryBar"
import type { HabitLog } from "@/types"

function makeLog(dateStr: string): HabitLog {
  return { id: dateStr, taskId: "h1", date: `${dateStr}T00:00:00.000Z`, reflection: null }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z")) // today = 2026-05-03
})
afterEach(() => vi.useRealTimers())

describe("computeHabitRate7d", () => {
  it("daily: 7 logs in 7 days = 100%", () => {
    const logs = ["05-03","05-02","05-01","04-30","04-29","04-28","04-27"].map(d => makeLog(`2026-${d}`))
    expect(computeHabitRate7d(logs, "daily")).toBeCloseTo(1)
  })

  it("daily: 0 logs = 0%", () => {
    expect(computeHabitRate7d([], "daily")).toBe(0)
  })

  it("weekly: 1 log in last 7 days = 100%", () => {
    expect(computeHabitRate7d([makeLog("2026-05-01")], "weekly")).toBeCloseTo(1)
  })

  it("weekly: 0 logs in last 7 days = 0%", () => {
    expect(computeHabitRate7d([], "weekly")).toBe(0)
  })

  it("monthly: 1 log in last 7 days = 100%", () => {
    expect(computeHabitRate7d([makeLog("2026-05-01")], "monthly")).toBeCloseTo(1)
  })

  it("daily: partial — 3 of 7 days ≈ 43%", () => {
    const logs = ["05-03","05-01","04-29"].map(d => makeLog(`2026-${d}`))
    expect(computeHabitRate7d(logs, "daily")).toBeCloseTo(3 / 7)
  })
})
