import { describe, it, expect, afterEach } from "vitest"
import { registerTempId, resolveId, resolveUrl, clearTempIds } from "./tempIdMap"

afterEach(() => clearTempIds())

describe("resolveId", () => {
  it("returns id unchanged when not registered", () => {
    expect(resolveId("real-123")).toBe("real-123")
  })
  it("returns real id after registration", () => {
    registerTempId("tmp_abc", "real-456")
    expect(resolveId("tmp_abc")).toBe("real-456")
  })
  it("handles multiple registrations independently", () => {
    registerTempId("tmp_a", "real-1")
    registerTempId("tmp_b", "real-2")
    expect(resolveId("tmp_a")).toBe("real-1")
    expect(resolveId("tmp_b")).toBe("real-2")
  })
})

describe("resolveUrl", () => {
  it("leaves url unchanged when no temp ids registered", () => {
    expect(resolveUrl("/api/tasks/real-123/subtasks")).toBe("/api/tasks/real-123/subtasks")
  })
  it("replaces temp id in url with real id", () => {
    registerTempId("tmp_abc", "real-456")
    expect(resolveUrl("/api/tasks/tmp_abc/subtasks")).toBe("/api/tasks/real-456/subtasks")
  })
  it("replaces multiple distinct temp ids in one url", () => {
    registerTempId("tmp_a", "real-1")
    expect(resolveUrl("/api/tasks/tmp_a/subtasks/tmp_a")).toBe("/api/tasks/real-1/subtasks/real-1")
  })
  it("does not replace unrelated segments", () => {
    registerTempId("tmp_abc", "real-456")
    expect(resolveUrl("/api/tasks/other-id/subtasks")).toBe("/api/tasks/other-id/subtasks")
  })
})
