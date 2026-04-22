import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { getUserId } from "./api-auth"

vi.mock("@/auth", () => ({ auth: vi.fn() }))

const mockAuth = vi.mocked(auth)

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/tasks", { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getUserId", () => {
  it("returns session userId when session exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never)
    const result = await getUserId(req())
    expect(result).toBe("u1")
  })

  it("returns x-api-user-id header when header is present (API key path)", async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await getUserId(req({ "x-api-user-id": "u2" }))
    expect(result).toBe("u2")
    // auth() should not be called — fast path short-circuits
    expect(mockAuth).not.toHaveBeenCalled()
  })

  it("returns null when both session and header are absent", async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await getUserId(req())
    expect(result).toBeNull()
  })

  it("prefers injected header over session (middleware always strips external header)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "session-user" } } as never)
    const result = await getUserId(req({ "x-api-user-id": "header-user" }))
    expect(result).toBe("header-user")
  })
})
