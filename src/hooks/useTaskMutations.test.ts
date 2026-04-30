// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTaskMutations } from "./useTaskMutations"
import type { Task } from "@/types"

vi.mock("@/lib/mutationQueue", () => ({ remapMutationQueue: vi.fn() }))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1", title: "Test", done: false, dueDate: null, recurrence: null,
    description: null, order: 0, isHabit: false, createdAt: "2026-01-01T00:00:00.000Z",
    project: null, subtasks: [], tags: [], priorityScore: 1,
    ...overrides,
  }
}

function makeWrapper(initialTasks: Task[] = []) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  qc.setQueryData(["tasks", {}], initialTasks)
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
  return { qc, Wrapper }
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("useTaskMutations — createTask", () => {
  it("adds a temp task optimistically before server responds", async () => {
    const serverTask = makeTask({ id: "server-1", title: "New" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(serverTask) }))
    const { qc, Wrapper } = makeWrapper([])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    act(() => { result.current.createTask({ title: "New" }, []) })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks.some((t) => t.title === "New")).toBe(true)
    })
  })
})

describe("useTaskMutations — toggleTask", () => {
  it("optimistically flips done and rolls back on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const task = makeTask({ done: false })
    const { qc, Wrapper } = makeWrapper([task])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    await act(async () => {
      try { await result.current.toggleTask(task) } catch { /* expected */ }
    })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks.find((t) => t.id === "t1")?.done).toBe(false)
    })
  })
})

describe("useTaskMutations — deleteTask", () => {
  it("removes task from cache on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
    const task = makeTask()
    const { qc, Wrapper } = makeWrapper([task])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    await act(async () => { await result.current.deleteTask("t1") })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks).toHaveLength(0)
    })
  })
})

describe("useTaskMutations — reorderTasks", () => {
  it("applies new order optimistically and rolls back on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const t1 = makeTask({ id: "t1", order: 0 })
    const t2 = makeTask({ id: "t2", order: 1 })
    const { qc, Wrapper } = makeWrapper([t1, t2])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    await act(async () => {
      try { await result.current.reorderTasks([t2, t1]) } catch { /* expected */ }
    })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks[0].id).toBe("t1")
    })
  })
})
