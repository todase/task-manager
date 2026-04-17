import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GET, POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

const mockAuth = vi.mocked(auth)
const mockTag = vi.mocked(prisma.tag)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const dbTag = { id: "t1", name: "bug", color: "#60a5fa", userId: "u1" }

beforeEach(() => vi.clearAllMocks())

describe("GET /api/tags", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns tags ordered by name", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.findMany.mockResolvedValue([dbTag] as never)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([dbTag])
    expect(mockTag.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { name: "asc" },
    })
  })
})

describe("POST /api/tags", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST(jsonReq({ name: "bug" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when name is missing", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await POST(jsonReq({ name: "" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when name is whitespace only", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await POST(jsonReq({ name: "   " }))
    expect(res.status).toBe(400)
  })

  it("creates tag with provided color", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.create.mockResolvedValue(dbTag as never)

    const res = await POST(jsonReq({ name: "bug", color: "#60a5fa" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(dbTag)
    expect(mockTag.create).toHaveBeenCalledWith({
      data: { name: "bug", color: "#60a5fa", userId: "u1" },
    })
  })

  it("defaults color to #6b7280 when not provided", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.create.mockResolvedValue({ ...dbTag, color: "#6b7280" } as never)

    await POST(jsonReq({ name: "bug" }))

    expect(mockTag.create).toHaveBeenCalledWith({
      data: { name: "bug", color: "#6b7280", userId: "u1" },
    })
  })

  it("trims whitespace from name", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.create.mockResolvedValue(dbTag as never)

    await POST(jsonReq({ name: "  bug  " }))

    expect(mockTag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "bug" }) })
    )
  })
})
