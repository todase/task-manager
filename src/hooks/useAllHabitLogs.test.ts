// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAllHabitLogs } from "./useAllHabitLogs"
import type { HabitLog } from "@/types"

function makeLog(overrides: Partial<HabitLog> = {}): HabitLog {
  return {
    id: "l1",
    taskId: "h1",
    date: "2026-05-01T00:00:00.000Z",
    reflection: null,
    ...overrides,
  }
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
  return Wrapper
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useAllHabitLogs", () => {
  it("returns empty map and isLoading=false when habitIds is empty", () => {
    const { result } = renderHook(() => useAllHabitLogs([]), {
      wrapper: makeWrapper(),
    })
    expect(result.current.logsByHabitId).toEqual({})
    expect(result.current.isLoading).toBe(false)
  })

  it("keys logs by habit id after fetches resolve", async () => {
    const logsA = [makeLog({ id: "a1", taskId: "h1" })]
    const logsB = [
      makeLog({ id: "b1", taskId: "h2", date: "2026-05-02T00:00:00.000Z" }),
      makeLog({ id: "b2", taskId: "h2", date: "2026-05-03T00:00:00.000Z" }),
    ]
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const logs = url.includes("/h1/") ? logsA : logsB
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ logs }) })
      })
    )
    const { result } = renderHook(() => useAllHabitLogs(["h1", "h2"]), {
      wrapper: makeWrapper(),
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.logsByHabitId.h1).toHaveLength(1)
    expect(result.current.logsByHabitId.h1[0].id).toBe("a1")
    expect(result.current.logsByHabitId.h2).toHaveLength(2)
  })

  it("returns empty array for an id whose query has not resolved yet", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {}))
    )
    const { result } = renderHook(() => useAllHabitLogs(["h1"]), {
      wrapper: makeWrapper(),
    })
    expect(result.current.logsByHabitId.h1).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })
})
