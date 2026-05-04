import { describe, it, expect } from "vitest"
import { createRateLimiter } from "./rateLimit"

describe("createRateLimiter", () => {
  it("allows first request", () => {
    const check = createRateLimiter(() => 0)
    expect(check("key", 3, 1000)).toBe(false)
  })

  it("allows requests up to the limit", () => {
    let t = 0
    const check = createRateLimiter(() => t)
    expect(check("key", 3, 1000)).toBe(false)
    t = 100
    expect(check("key", 3, 1000)).toBe(false)
    t = 200
    expect(check("key", 3, 1000)).toBe(false)
  })

  it("blocks when limit is exceeded", () => {
    let t = 0
    const check = createRateLimiter(() => t)
    check("key", 3, 1000)
    t = 100; check("key", 3, 1000)
    t = 200; check("key", 3, 1000)
    t = 300
    expect(check("key", 3, 1000)).toBe(true)
  })

  it("allows again after the window expires", () => {
    let t = 0
    const check = createRateLimiter(() => t)
    check("key", 2, 1000)
    t = 100; check("key", 2, 1000)
    // Window of 1000ms expires from t=0: cutoff at t=1001 clears the first hit
    t = 1001; expect(check("key", 2, 1000)).toBe(false)
  })

  it("different keys do not interfere", () => {
    const check = createRateLimiter(() => 0)
    check("a", 1, 1000)
    // "a" is now at limit, "b" is fresh
    expect(check("a", 1, 1000)).toBe(true)
    expect(check("b", 1, 1000)).toBe(false)
  })
})
