import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

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
  it("returns 400 when email already exists", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com" } as never)

    const res = await POST(jsonReq({ email: "a@b.com", password: "secret" }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("Email already in use")
    expect(mockUser.create).not.toHaveBeenCalled()
  })

  it("creates user with hashed password and returns id and email", async () => {
    mockUser.findUnique.mockResolvedValue(null as never)
    mockUser.create.mockResolvedValue({ id: "u2", email: "new@b.com", password: "hashed-pw" } as never)

    const res = await POST(jsonReq({ email: "new@b.com", password: "secret" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe("u2")
    expect(body.email).toBe("new@b.com")
    expect(body.password).toBeUndefined() // never expose password
    expect(mockUser.create).toHaveBeenCalledWith({
      data: { email: "new@b.com", password: "hashed-pw" },
    })
  })
})
