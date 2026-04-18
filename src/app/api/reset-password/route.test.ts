import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: { update: vi.fn() },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("new-hashed-pw") },
}))

const mockPrt = vi.mocked(prisma.passwordResetToken)
const mockUser = vi.mocked(prisma.user)

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/reset-password", () => {
  it("returns 400 for password shorter than 8 chars", async () => {
    const res = await POST(jsonReq({ token: "t", password: "short" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for unknown token", async () => {
    mockPrt.findUnique.mockResolvedValue(null as never)
    const res = await POST(jsonReq({ token: "bad", password: "newpassword" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 and deletes expired token", async () => {
    mockPrt.findUnique.mockResolvedValue({
      token: "t",
      email: "a@b.com",
      expiresAt: new Date(Date.now() - 1000),
    } as never)
    mockPrt.delete.mockResolvedValue({} as never)
    const res = await POST(jsonReq({ token: "t", password: "newpassword" }))
    expect(res.status).toBe(400)
    expect(mockPrt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
  })

  it("updates password and deletes token on valid request", async () => {
    mockPrt.findUnique.mockResolvedValue({
      token: "t",
      email: "a@b.com",
      expiresAt: new Date(Date.now() + 60_000),
    } as never)
    mockUser.update.mockResolvedValue({} as never)
    mockPrt.delete.mockResolvedValue({} as never)
    const res = await POST(jsonReq({ token: "t", password: "newpassword" }))
    expect(res.status).toBe(200)
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
      data: { password: "new-hashed-pw" },
    })
    expect(mockPrt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
  })
})
