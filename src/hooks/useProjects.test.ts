// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useProjects } from "./useProjects"
import type { Project } from "@/types"

function makeProject(overrides: Partial<Project> = {}): Project {
  return { id: "p1", title: "Alpha", icon: "folder", ...overrides }
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

describe("useProjects — fetchProjects", () => {
  it("sets projects from API response", async () => {
    const projects = [makeProject({ id: "p1" }), makeProject({ id: "p2" })]
    vi.stubGlobal("fetch", mockFetch(projects))
    const { result } = renderHook(() => useProjects())

    await act(() => result.current.fetchProjects())

    expect(result.current.projects).toEqual(projects)
    expect(fetch).toHaveBeenCalledWith("/api/projects")
  })
})

describe("useProjects — createProject", () => {
  it("POSTs and appends new project to state", async () => {
    const project = makeProject({ id: "p2", title: "Beta" })
    vi.stubGlobal("fetch", mockFetch(project))
    const { result } = renderHook(() => useProjects())

    let returned: Project | undefined
    await act(async () => {
      returned = await result.current.createProject("Beta", "star")
    })

    expect(fetch).toHaveBeenCalledWith("/api/projects", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ title: "Beta", icon: "star" }),
    }))
    expect(returned).toEqual(project)
    expect(result.current.projects).toContainEqual(project)
  })

  it("uses 'folder' as default icon", async () => {
    vi.stubGlobal("fetch", mockFetch(makeProject()))
    const { result } = renderHook(() => useProjects())

    await act(() => result.current.createProject("Gamma"))

    expect(fetch).toHaveBeenCalledWith("/api/projects", expect.objectContaining({
      body: JSON.stringify({ title: "Gamma", icon: "folder" }),
    }))
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useProjects())

    await expect(
      act(() => result.current.createProject("Fail"))
    ).rejects.toThrow("Не удалось создать проект")
  })
})

describe("useProjects — deleteProject", () => {
  it("DELETEs and removes project from state", async () => {
    const project = makeProject({ id: "p1" })
    // fetchProjects then deleteProject
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([project]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(null) })
    vi.stubGlobal("fetch", fetchMock)
    const { result } = renderHook(() => useProjects())

    await act(() => result.current.fetchProjects())
    expect(result.current.projects).toHaveLength(1)

    await act(() => result.current.deleteProject("p1"))

    expect(fetch).toHaveBeenCalledWith("/api/projects/p1", { method: "DELETE" })
    expect(result.current.projects).toHaveLength(0)
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useProjects())

    await expect(
      act(() => result.current.deleteProject("p1"))
    ).rejects.toThrow("Не удалось удалить проект")
  })
})

describe("useProjects — updateProject", () => {
  it("PATCHes and replaces project in state", async () => {
    const original = makeProject({ id: "p1", title: "Old" })
    const updated = makeProject({ id: "p1", title: "New", icon: "inbox" })

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([original]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updated) })
    vi.stubGlobal("fetch", fetchMock)
    const { result } = renderHook(() => useProjects())

    await act(() => result.current.fetchProjects())

    let returned: Project | undefined
    await act(async () => {
      returned = await result.current.updateProject("p1", { title: "New", icon: "inbox" })
    })

    expect(fetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ title: "New", icon: "inbox" }),
    }))
    expect(returned).toEqual(updated)
    expect(result.current.projects.find((p) => p.id === "p1")?.title).toBe("New")
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useProjects())

    await expect(
      act(() => result.current.updateProject("p1", { title: "Fail" }))
    ).rejects.toThrow("Не удалось сохранить проект")
  })
})
