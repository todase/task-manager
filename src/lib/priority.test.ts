import { describe, it, expect } from "vitest"
import { priorityColor } from "./priority"

describe("priorityColor", () => {
  it("returns blue at score=1", () => {
    expect(priorityColor(1)).toBe("rgb(59, 130, 246)")
  })

  it("returns gray at score=0", () => {
    expect(priorityColor(0)).toBe("rgb(229, 231, 235)")
  })

  it("returns midpoint color at score=0.5", () => {
    const r = Math.round(59 + (229 - 59) * 0.5)
    const g = Math.round(130 + (231 - 130) * 0.5)
    const b = Math.round(246 + (235 - 246) * 0.5)
    expect(priorityColor(0.5)).toBe(`rgb(${r}, ${g}, ${b})`)
  })

  it("returns valid rgb string format", () => {
    expect(priorityColor(0.75)).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  })

  it("higher score produces lower red channel (more blue)", () => {
    const color1 = priorityColor(0.2)
    const color0 = priorityColor(0.8)
    const r1 = parseInt(color1.match(/\d+/)![0])
    const r0 = parseInt(color0.match(/\d+/)![0])
    expect(r1).toBeGreaterThan(r0)
  })
})
