import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { GET } from "./route"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

const mockEvt = vi.mocked(prisma.emailVerificationToken)
const mockUser = vi.mocked(prisma.user)

function makeReq(token?: string) {
  const url = token
    ? `http://localhost/api/verify-email?token=${token}`
    : "http://localhost/api/verify-email"
  return new NextRequest(url)
}

beforeEach(() => vi.clearAllMocks())

describe("GET /api/verify-email", () => {
  it("redirects to /verify-email?error=invalid when token not in DB", async () => {
    mockEvt.findUnique.mockResolvedValue(null as never)
    const res = await GET(makeReq("bad"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("error=invalid")
  })

  it("deletes expired token and redirects to /verify-email?error=expired", async () => {
    mockEvt.findUnique.mockResolvedValue({
      token: "t",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    } as never)
    mockEvt.delete.mockResolvedValue({} as never)
    const res = await GET(makeReq("t"))
    expect(res.headers.get("location")).toContain("error=expired")
    expect(mockEvt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("sets emailVerified, deletes token, redirects to /tasks on valid token", async () => {
    mockEvt.findUnique.mockResolvedValue({
      token: "t",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
    } as never)
    mockUser.update.mockResolvedValue({} as never)
    mockEvt.delete.mockResolvedValue({} as never)
    const res = await GET(makeReq("t"))
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: expect.any(Date) },
    })
    expect(mockEvt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
    expect(res.headers.get("location")).toContain("/tasks")
  })
})
