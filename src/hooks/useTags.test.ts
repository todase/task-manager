// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTags } from "./useTags"
import type { Tag } from "@/types"

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return { id: "t1", name: "bug", color: "#60a5fa", ...overrides }
}

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  })
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useTags — fetchTags", () => {
  it("sets tags from API response", async () => {
    const tags = [makeTag({ id: "t1" }), makeTag({ id: "t2", name: "feat" })]
    vi.stubGlobal("fetch", mockFetch(tags))
    const { result } = renderHook(() => useTags())

    await act(() => result.current.fetchTags())

    expect(result.current.tags).toEqual(tags)
    expect(fetch).toHaveBeenCalledWith("/api/tags")
  })

  it("sets empty array when response is not an array", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "bad" }))
    const { result } = renderHook(() => useTags())

    await act(() => result.current.fetchTags())

    expect(result.current.tags).toEqual([])
  })

  it("sets empty array when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags())

    await act(() => result.current.fetchTags())

    expect(result.current.tags).toEqual([])
  })

  it("sets empty array when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")))
    const { result } = renderHook(() => useTags())

    await act(() => result.current.fetchTags())

    expect(result.current.tags).toEqual([])
  })
})

describe("useTags — createTag", () => {
  it("POSTs and appends tag sorted by name", async () => {
    const existing = makeTag({ id: "t1", name: "zebra" })
    const created = makeTag({ id: "t2", name: "alpha", color: "#fff" })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([existing]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(created) })
    vi.stubGlobal("fetch", fetchMock)
    const { result } = renderHook(() => useTags())

    await act(() => result.current.fetchTags())

    let returned: Tag | undefined
    await act(async () => {
      returned = await result.current.createTag("alpha", "#fff")
    })

    expect(fetch).toHaveBeenCalledWith("/api/tags", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "alpha", color: "#fff" }),
    }))
    expect(returned).toEqual(created)
    // sorted: alpha before zebra
    expect(result.current.tags[0].name).toBe("alpha")
    expect(result.current.tags[1].name).toBe("zebra")
  })

  it("picks a random color from the palette when none provided", async () => {
    const TAG_COLORS = [
      "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#2dd4bf",
      "#4ade80", "#fb7185", "#22d3ee", "#c084fc", "#94a3b8",
    ]
    const created = makeTag({ color: "#60a5fa" })
    vi.stubGlobal("fetch", mockFetch(created))
    const { result } = renderHook(() => useTags())

    await act(() => result.current.createTag("new-tag"))

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(TAG_COLORS).toContain(body.color)
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags())

    await expect(
      act(() => result.current.createTag("fail"))
    ).rejects.toThrow("Не удалось создать метку")
  })
})

describe("useTags — updateTag", () => {
  it("PATCHes and replaces tag in state", async () => {
    const original = makeTag({ id: "t1", name: "old" })
    const updated = makeTag({ id: "t1", name: "new" })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([original]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) })
    vi.stubGlobal("fetch", fetchMock)
    const { result } = renderHook(() => useTags())

    await act(() => result.current.fetchTags())

    let returned: Tag | undefined
    await act(async () => {
      returned = await result.current.updateTag("t1", { name: "new" })
    })

    expect(fetch).toHaveBeenCalledWith("/api/tags/t1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "new" }),
    }))
    expect(returned).toEqual(updated)
    expect(result.current.tags.find((t) => t.id === "t1")?.name).toBe("new")
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags())

    await expect(
      act(() => result.current.updateTag("t1", { name: "fail" }))
    ).rejects.toThrow("Не удалось обновить метку")
  })
})

describe("useTags — deleteTag", () => {
  it("DELETEs and removes tag from state", async () => {
    const tag = makeTag({ id: "t1" })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([tag]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) })
    vi.stubGlobal("fetch", fetchMock)
    const { result } = renderHook(() => useTags())

    await act(() => result.current.fetchTags())
    expect(result.current.tags).toHaveLength(1)

    await act(() => result.current.deleteTag("t1"))

    expect(fetch).toHaveBeenCalledWith("/api/tags/t1", { method: "DELETE" })
    expect(result.current.tags).toHaveLength(0)
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags())

    await expect(
      act(() => result.current.deleteTag("t1"))
    ).rejects.toThrow("Не удалось удалить метку")
  })
})
