// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTaskQueries } from "./useTaskQueries"
import type { Task } from "@/types"

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1", title: "Test", done: false, dueDate: null, recurrence: null,
    description: null, order: 0, project: null, subtasks: [], tags: [], priorityScore: 1,
    ...overrides,
  }
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
  return Wrapper
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe("useTaskQueries", () => {
  it("returns tasks from API", async () => {
    const tasks = [makeTask({ id: "1" }), makeTask({ id: "2" })]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tasks),
    }))
    const { result } = renderHook(() => useTaskQueries(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tasks).toHaveLength(2))
    expect(result.current.error).toBeNull()
  })

  it("returns error string when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const { result } = renderHook(() => useTaskQueries(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
  })
})
