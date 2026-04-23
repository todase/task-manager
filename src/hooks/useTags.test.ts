// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTags } from "./useTags"
import type { Tag } from "@/types"

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return { id: "t1", name: "bug", color: "#60a5fa", ...overrides }
}

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(data) })
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
  return Wrapper
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe("useTags — loads tags", () => {
  it("fetches and returns tag list", async () => {
    const tags = [makeTag({ id: "t1" }), makeTag({ id: "t2", name: "feat" })]
    vi.stubGlobal("fetch", mockFetch(tags))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tags).toHaveLength(2))
  })

  it("returns empty array when response is not an array", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "bad" }))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tags).toEqual([]))
  })
})

describe("useTags — createTag", () => {
  it("POSTs with provided color", async () => {
    const created = makeTag({ id: "t2", name: "alpha", color: "#fff" })
    vi.stubGlobal("fetch", mockFetch(created))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    let returned: Tag | undefined
    await act(async () => { returned = await result.current.createTag("alpha", "#fff") })
    expect(fetch).toHaveBeenCalledWith("/api/tags", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "alpha", color: "#fff" }),
    }))
    expect(returned).toEqual(created)
  })

  it("picks a random color from the palette when none provided", async () => {
    const TAG_COLORS = ["#60a5fa","#a78bfa","#f472b6","#fb923c","#2dd4bf","#4ade80","#fb7185","#22d3ee","#c084fc","#94a3b8"]
    const created = makeTag({ color: "#60a5fa" })
    vi.stubGlobal("fetch", mockFetch(created))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await act(async () => { await result.current.createTag("new-tag") })
    // find the POST call (useQuery also calls fetch for GET /api/tags)
    const fetchMock = fetch as ReturnType<typeof vi.fn>
    const postCall = fetchMock.mock.calls.find((c) => c[1]?.method === "POST")
    const body = JSON.parse(postCall![1].body)
    expect(TAG_COLORS).toContain(body.color)
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await expect(act(() => result.current.createTag("fail"))).rejects.toThrow("Не удалось создать метку")
  })
})

describe("useTags — updateTag", () => {
  it("PATCHes tag", async () => {
    const updated = makeTag({ name: "new" })
    vi.stubGlobal("fetch", mockFetch(updated))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    let returned: Tag | undefined
    await act(async () => { returned = await result.current.updateTag("t1", { name: "new" }) })
    expect(fetch).toHaveBeenCalledWith("/api/tags/t1", expect.objectContaining({ method: "PATCH" }))
    expect(returned).toEqual(updated)
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await expect(act(() => result.current.updateTag("t1", { name: "fail" }))).rejects.toThrow("Не удалось обновить метку")
  })
})

describe("useTags — deleteTag", () => {
  it("DELETEs tag", async () => {
    vi.stubGlobal("fetch", mockFetch(null))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await act(async () => { await result.current.deleteTag("t1") })
    expect(fetch).toHaveBeenCalledWith("/api/tags/t1", { method: "DELETE" })
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await expect(act(() => result.current.deleteTag("t1"))).rejects.toThrow("Не удалось удалить метку")
  })
})
