// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useProjects } from "./useProjects"
import type { Project } from "@/types"

function makeProject(overrides: Partial<Project> = {}): Project {
  return { id: "p1", title: "Alpha", icon: "folder", ...overrides }
}

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(data) })
}

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
  return { qc, Wrapper }
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe("useProjects — loads projects", () => {
  it("fetches and returns project list", async () => {
    const projects = [makeProject({ id: "p1" }), makeProject({ id: "p2" })]
    vi.stubGlobal("fetch", mockFetch(projects))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.projects).toHaveLength(2))
  })
})

describe("useProjects — createProject", () => {
  it("POSTs and adds new project", async () => {
    const project = makeProject({ id: "p2", title: "Beta" })
    vi.stubGlobal("fetch", mockFetch(project))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })

    let returned: Project | undefined
    await act(async () => { returned = await result.current.createProject("Beta", "star") })

    expect(fetch).toHaveBeenCalledWith("/api/projects", expect.objectContaining({ method: "POST" }))
    expect(returned).toEqual(project)
  })

  it("uses 'folder' as default icon", async () => {
    vi.stubGlobal("fetch", mockFetch(makeProject()))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await act(async () => { await result.current.createProject("Alpha") })
    expect(fetch).toHaveBeenCalledWith("/api/projects", expect.objectContaining({
      body: JSON.stringify({ title: "Alpha", icon: "folder" }),
    }))
  })
})

describe("useProjects — deleteProject", () => {
  it("calls DELETE endpoint", async () => {
    vi.stubGlobal("fetch", mockFetch(null))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await act(async () => { await result.current.deleteProject("p1") })
    expect(fetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "DELETE" }))
  })
})

describe("useProjects — updateProject", () => {
  it("PATCHes and returns updated project", async () => {
    const updated = makeProject({ title: "Updated" })
    vi.stubGlobal("fetch", mockFetch(updated))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    let returned: Project | undefined
    await act(async () => { returned = await result.current.updateProject("p1", { title: "Updated" }) })
    expect(returned).toEqual(updated)
  })
})
