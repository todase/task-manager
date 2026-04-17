import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PATCH, DELETE } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockAuth = vi.mocked(auth)
const mockTag = vi.mocked(prisma.tag)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function params(id = "t1") {
  return { params: Promise.resolve({ id }) }
}

function jsonReq(method: string, body: unknown) {
  return new Request("http://localhost/api/tags/t1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const dbTag = { id: "t1", name: "bug", color: "#60a5fa", userId: "u1" }

beforeEach(() => vi.clearAllMocks())

describe("PATCH /api/tags/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await PATCH(jsonReq("PATCH", { name: "feat" }), params())
    expect(res.status).toBe(401)
  })

  it("updates tag name and color", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const updated = { ...dbTag, name: "feat", color: "#a78bfa" }
    mockTag.update.mockResolvedValue(updated as never)

    const res = await PATCH(jsonReq("PATCH", { name: "feat", color: "#a78bfa" }), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.name).toBe("feat")
    expect(mockTag.update).toHaveBeenCalledWith({
      where: { id: "t1", userId: "u1" },
      data: { name: "feat", color: "#a78bfa" },
    })
  })

  it("trims whitespace from name", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.update.mockResolvedValue(dbTag as never)

    await PATCH(jsonReq("PATCH", { name: "  bug  " }), params())

    expect(mockTag.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "bug" }) })
    )
  })

  it("omits name from update data when blank", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.update.mockResolvedValue(dbTag as never)

    await PATCH(jsonReq("PATCH", { name: "", color: "#fff" }), params())

    expect(mockTag.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { color: "#fff" } })
    )
  })
})

describe("DELETE /api/tags/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await DELETE(new Request("http://localhost/api/tags/t1"), params())
    expect(res.status).toBe(401)
  })

  it("deletes tag and returns 204", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.delete.mockResolvedValue(dbTag as never)

    const res = await DELETE(new Request("http://localhost/api/tags/t1"), params())

    expect(res.status).toBe(204)
    expect(mockTag.delete).toHaveBeenCalledWith({
      where: { id: "t1", userId: "u1" },
    })
  })
})
