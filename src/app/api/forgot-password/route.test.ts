import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))
vi.mock("@/lib/tokens", () => ({
  createPasswordResetToken: vi.fn().mockResolvedValue("reset-token-123"),
}))
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockUser = vi.mocked(prisma.user)

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/forgot-password", () => {
  it("returns 200 when email not found (prevents enumeration)", async () => {
    mockUser.findUnique.mockResolvedValue(null as never)
    const res = await POST(jsonReq({ email: "ghost@b.com" }))
    expect(res.status).toBe(200)
    const { createPasswordResetToken } = await import("@/lib/tokens")
    expect(createPasswordResetToken).not.toHaveBeenCalled()
  })

  it("returns 200 without sending email for Google user", async () => {
    mockUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "g@b.com",
      oauthProvider: "google",
    } as never)
    const res = await POST(jsonReq({ email: "g@b.com" }))
    expect(res.status).toBe(200)
    const { createPasswordResetToken } = await import("@/lib/tokens")
    expect(createPasswordResetToken).not.toHaveBeenCalled()
  })

  it("creates reset token and sends email for credentials user", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email")
    const { createPasswordResetToken } = await import("@/lib/tokens")
    mockUser.findUnique.mockResolvedValue({
      id: "u2",
      email: "user@b.com",
      oauthProvider: null,
    } as never)
    const res = await POST(jsonReq({ email: "user@b.com" }))
    expect(res.status).toBe(200)
    expect(createPasswordResetToken).toHaveBeenCalledWith("user@b.com")
    expect(sendPasswordResetEmail).toHaveBeenCalledWith("user@b.com", "reset-token-123")
  })
})
