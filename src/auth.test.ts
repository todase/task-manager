import { describe, it, expect, vi, beforeEach } from "vitest"
// vi.mock calls are hoisted by Vitest before all imports, so mocks are active
// when @/auth is imported below — NextAuth constructor fires and sets capturedAuthorize
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimited, clientIp } from "@/lib/rateLimit"
import "@/auth"

// Capture the Credentials provider config so we can call authorize directly
// Must be var (not let/const) — vi.mock is hoisted before declarations, so let/const
// would be in TDZ when the mock factory runs and assigns this variable.
var capturedAuthorize: (
  credentials: Record<string, string>,
  request: Request
) => Promise<unknown>

vi.mock("next-auth", () => ({
  default: vi.fn((config: { providers: Array<{ authorize?: unknown }> }) => {
    // providers[0] is Google, providers[1] is Credentials
    capturedAuthorize = config.providers[1].authorize as typeof capturedAuthorize
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  }),
}))

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", type: "oauth" })),
}))

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((cfg: { authorize: unknown }) => ({
    id: "credentials",
    type: "credentials",
    authorize: cfg.authorize,
  })),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}))

vi.mock("@/lib/rateLimit", () => ({
  rateLimited: vi.fn(() => false),
  clientIp: vi.fn(() => "1.2.3.4"),
}))

const mockUser = vi.mocked(prisma.user)
const mockCompare = vi.mocked(bcrypt.compare)
const mockRateLimited = vi.mocked(rateLimited)
const mockClientIp = vi.mocked(clientIp)

function makeRequest(ip?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (ip) headers["x-forwarded-for"] = ip
  return new Request("http://localhost/api/auth/callback/credentials", { headers })
}

const validUser = {
  id: "u1",
  email: "a@b.com",
  password: "hashed",
  emailVerified: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe("authorize — rate limiting", () => {
  it("allows the 10th attempt (rate limit not yet hit)", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(validUser as never)
    mockCompare.mockResolvedValue(true as never)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "secret" },
      makeRequest("1.2.3.4")
    )
    expect(result).not.toBeNull()
  })

  it("blocks when rate limit is exceeded (returns null)", async () => {
    mockRateLimited.mockReturnValue(true)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "secret" },
      makeRequest("1.2.3.4")
    )
    expect(result).toBeNull()
    // DB must NOT be queried when rate limited
    expect(mockUser.findUnique).not.toHaveBeenCalled()
  })

  it("uses clientIp to build the rate-limit key", async () => {
    mockRateLimited.mockReturnValue(false)
    mockClientIp.mockReturnValue("5.6.7.8")
    mockUser.findUnique.mockResolvedValue(null as never)

    await capturedAuthorize({ email: "x@y.com", password: "pw" }, makeRequest("5.6.7.8"))

    expect(mockRateLimited).toHaveBeenCalledWith("login:5.6.7.8", 10, 15 * 60 * 1000)
  })

  it("falls back to 'unknown' key when no x-forwarded-for header", async () => {
    mockClientIp.mockReturnValue("unknown")
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(null as never)

    await capturedAuthorize({ email: "x@y.com", password: "pw" }, makeRequest())

    expect(mockRateLimited).toHaveBeenCalledWith("login:unknown", 10, 15 * 60 * 1000)
  })
})

describe("authorize — existing behaviour", () => {
  it("returns null when user not found", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(null as never)

    const result = await capturedAuthorize(
      { email: "no@b.com", password: "pw" },
      makeRequest()
    )
    expect(result).toBeNull()
  })

  it("returns null when password does not match", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(validUser as never)
    mockCompare.mockResolvedValue(false as never)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "wrong" },
      makeRequest()
    )
    expect(result).toBeNull()
  })

  it("returns user object on valid credentials", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(validUser as never)
    mockCompare.mockResolvedValue(true as never)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "secret" },
      makeRequest()
    ) as { id: string; email: string }

    expect(result?.id).toBe("u1")
    expect(result?.email).toBe("a@b.com")
  })
})
