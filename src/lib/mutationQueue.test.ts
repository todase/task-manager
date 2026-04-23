import { describe, it, expect, vi, beforeEach } from "vitest"
import { remapMutationQueue } from "./mutationQueue"

vi.mock("idb-keyval", () => ({
  get: vi.fn(),
  set: vi.fn(),
}))

import * as idbKeyval from "idb-keyval"

beforeEach(() => vi.clearAllMocks())

describe("remapMutationQueue", () => {
  it("replaces tempId with realId everywhere in the cached JSON", async () => {
    const cache = JSON.stringify({
      clientState: {
        mutations: [
          {
            variables: { id: "tmp_abc-123" },
            url: "/api/tasks/tmp_abc-123/subtasks",
          },
        ],
      },
    })
    vi.mocked(idbKeyval.get).mockResolvedValue(cache)
    vi.mocked(idbKeyval.set).mockResolvedValue(undefined)

    await remapMutationQueue("tmp_abc-123", "real-server-id")

    const written = vi.mocked(idbKeyval.set).mock.calls[0][1] as string
    expect(written).not.toContain("tmp_abc-123")
    expect(written).toContain("real-server-id")
  })

  it("does nothing when cache is empty", async () => {
    vi.mocked(idbKeyval.get).mockResolvedValue(undefined)
    await remapMutationQueue("tmp_abc-123", "real-server-id")
    expect(idbKeyval.set).not.toHaveBeenCalled()
  })

  it("does nothing when tempId is not present in cache", async () => {
    vi.mocked(idbKeyval.get).mockResolvedValue(JSON.stringify({ some: "other data" }))
    await remapMutationQueue("tmp_abc-123", "real-server-id")
    expect(idbKeyval.set).not.toHaveBeenCalled()
  })
})
