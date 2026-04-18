import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock("@/lib/tokens", () => ({
  createVerificationToken: vi.fn().mockResolvedValue("new-token"),
}))
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockAuth = vi.mocked(auth)
const mockUser = vi.mocked(prisma.user)

function session(id = "u1") {
  return { user: { id } }
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/resend-verification", () => {
  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("returns 200 silently if user already verified", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: new Date(),
    } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const { createVerificationToken } = await import("@/lib/tokens")
    expect(createVerificationToken).not.toHaveBeenCalled()
  })

  it("creates new token and sends email for unverified user", async () => {
    const { sendVerificationEmail } = await import("@/lib/email")
    const { createVerificationToken } = await import("@/lib/tokens")
    mockAuth.mockResolvedValue(session() as never)
    mockUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: null,
    } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    expect(createVerificationToken).toHaveBeenCalledWith("u1")
    expect(sendVerificationEmail).toHaveBeenCalledWith("a@b.com", "new-token")
  })

  it("returns 200 even when user not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockUser.findUnique.mockResolvedValue(null as never)
    const res = await POST()
    expect(res.status).toBe(200)
  })
})
