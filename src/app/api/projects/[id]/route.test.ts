import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GET, PATCH, DELETE } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockAuth = vi.mocked(auth)
const mockProject = vi.mocked(prisma.project)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function params(id = "p1") {
  return { params: Promise.resolve({ id }) }
}

function jsonReq(method: string, body: unknown) {
  return new Request("http://localhost/api/projects/p1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const dbProject = { id: "p1", title: "Alpha", icon: "folder", userId: "u1", tasks: [] }

beforeEach(() => vi.clearAllMocks())

describe("GET /api/projects/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await GET(new Request("http://localhost/api/projects/p1"), params())
    expect(res.status).toBe(401)
  })

  it("returns 404 when project not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockProject.findUnique.mockResolvedValue(null as never)

    const res = await GET(new Request("http://localhost/api/projects/p1"), params())
    expect(res.status).toBe(404)
  })

  it("returns project with tasks", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockProject.findUnique.mockResolvedValue(dbProject as never)

    const res = await GET(new Request("http://localhost/api/projects/p1"), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(dbProject)
  })
})

describe("PATCH /api/projects/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await PATCH(jsonReq("PATCH", { title: "Beta" }), params())
    expect(res.status).toBe(401)
  })

  it("updates project title and icon", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const updated = { ...dbProject, title: "Beta", icon: "star" }
    mockProject.update.mockResolvedValue(updated as never)

    const res = await PATCH(jsonReq("PATCH", { title: "Beta", icon: "star" }), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.title).toBe("Beta")
    expect(mockProject.update).toHaveBeenCalledWith({
      where: { id: "p1", userId: "u1" },
      data: { title: "Beta", icon: "star" },
    })
  })

  it("updates only provided fields", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockProject.update.mockResolvedValue(dbProject as never)

    await PATCH(jsonReq("PATCH", { title: "Beta" }), params())

    expect(mockProject.update).toHaveBeenCalledWith({
      where: { id: "p1", userId: "u1" },
      data: { title: "Beta" },
    })
  })
})

describe("DELETE /api/projects/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await DELETE(new Request("http://localhost/api/projects/p1"), params())
    expect(res.status).toBe(401)
  })

  it("deletes project and returns success", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockProject.delete.mockResolvedValue(dbProject as never)

    const res = await DELETE(new Request("http://localhost/api/projects/p1"), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockProject.delete).toHaveBeenCalledWith({
      where: { id: "p1", userId: "u1" },
    })
  })
})
