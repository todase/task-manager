import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/lib/rateLimit", () => ({
  rateLimited: vi.fn(() => false),
  clientIp: vi.fn(() => "1.2.3.4"),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-pw") },
}))

vi.mock("@/lib/tokens", () => ({
  createVerificationToken: vi.fn().mockResolvedValue("verify-token-123"),
}))

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockUser = vi.mocked(prisma.user)

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/register", () => {
  it("returns 429 when rate limited", async () => {
    const { rateLimited } = await import("@/lib/rateLimit")
    vi.mocked(rateLimited).mockReturnValueOnce(true)
    const res = await POST(jsonReq({ email: "a@b.com", password: "secret123" }))
    expect(res.status).toBe(429)
  })

  it("returns 400 for invalid email", async () => {
    const res = await POST(jsonReq({ email: "notanemail", password: "secret123" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for password shorter than 8 chars", async () => {
    const res = await POST(jsonReq({ email: "a@b.com", password: "short" }))
    expect(res.status).toBe(400)
  })

  it("returns 200 when email already exists (prevents enumeration)", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com" } as never)
    const res = await POST(jsonReq({ email: "a@b.com", password: "secret123" }))
    expect(res.status).toBe(200)
    expect(mockUser.create).not.toHaveBeenCalled()
  })

  it("creates user and sends verification email on success", async () => {
    const { sendVerificationEmail } = await import("@/lib/email")
    const { createVerificationToken } = await import("@/lib/tokens")
    mockUser.findUnique.mockResolvedValue(null as never)
    mockUser.create.mockResolvedValue({ id: "u2", email: "new@b.com" } as never)

    const res = await POST(jsonReq({ email: "new@b.com", password: "secret123" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.email).toBe("new@b.com")
    expect(createVerificationToken).toHaveBeenCalledWith("u2")
    expect(sendVerificationEmail).toHaveBeenCalledWith("new@b.com", "verify-token-123")
  })

  it("returns 200 even when email sending throws", async () => {
    const { sendVerificationEmail } = await import("@/lib/email")
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error("SMTP error"))
    mockUser.findUnique.mockResolvedValue(null as never)
    mockUser.create.mockResolvedValue({ id: "u3", email: "fail@b.com" } as never)

    const res = await POST(jsonReq({ email: "fail@b.com", password: "secret123" }))
    expect(res.status).toBe(200)
  })
})
