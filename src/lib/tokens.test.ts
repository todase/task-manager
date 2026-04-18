import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { createVerificationToken, createPasswordResetToken } from "./tokens"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => {
      if (Array.isArray(ops)) {
        for (const op of ops) await op
      }
    }),
    emailVerificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("test-uuid"),
}))

const mockEvt = vi.mocked(prisma.emailVerificationToken)
const mockPrt = vi.mocked(prisma.passwordResetToken)

beforeEach(() => vi.clearAllMocks())

describe("createVerificationToken", () => {
  it("deletes existing tokens for user then creates new one", async () => {
    mockEvt.create.mockResolvedValue({} as never)
    await createVerificationToken("user-1")
    expect(mockEvt.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(mockEvt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ token: "test-uuid", userId: "user-1" }),
    })
  })

  it("returns token string and sets expiry ~24h ahead", async () => {
    const before = Date.now()
    mockEvt.create.mockResolvedValue({} as never)
    const token = await createVerificationToken("user-1")
    expect(token).toBe("test-uuid")
    const call = mockEvt.create.mock.calls[0][0]
    const expiry = (call.data as { expiresAt: Date }).expiresAt.getTime()
    expect(expiry).toBeGreaterThan(before + 23 * 60 * 60 * 1000)
    expect(expiry).toBeLessThan(before + 25 * 60 * 60 * 1000)
  })
})

describe("createPasswordResetToken", () => {
  it("deletes existing tokens for email then creates new one", async () => {
    mockPrt.create.mockResolvedValue({} as never)
    await createPasswordResetToken("user@example.com")
    expect(mockPrt.deleteMany).toHaveBeenCalledWith({ where: { email: "user@example.com" } })
    expect(mockPrt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ token: "test-uuid", email: "user@example.com" }),
    })
  })

  it("returns token string and sets expiry ~1h ahead", async () => {
    const before = Date.now()
    mockPrt.create.mockResolvedValue({} as never)
    const token = await createPasswordResetToken("user@example.com")
    expect(token).toBe("test-uuid")
    const call = mockPrt.create.mock.calls[0][0]
    const expiry = (call.data as { expiresAt: Date }).expiresAt.getTime()
    expect(expiry).toBeGreaterThan(before + 55 * 60 * 1000)
    expect(expiry).toBeLessThan(before + 65 * 60 * 1000)
  })
})
