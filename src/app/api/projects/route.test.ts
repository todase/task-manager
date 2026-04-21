import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GET, POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

const mockAuth = vi.mocked(auth)
const mockProject = vi.mocked(prisma.project)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function getReq() {
  return new Request("http://localhost/api/projects")
}

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const dbProject = { id: "p1", title: "Alpha", icon: "folder", userId: "u1", tasks: [] }

beforeEach(() => vi.clearAllMocks())

describe("GET /api/projects", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it("returns projects for authenticated user", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockProject.findMany.mockResolvedValue([dbProject] as never)

    const res = await GET(getReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([dbProject])
    expect(mockProject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    )
  })
})

describe("POST /api/projects", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST(jsonReq({ title: "Beta" }))
    expect(res.status).toBe(401)
  })

  it("creates project and returns it", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockProject.create.mockResolvedValue(dbProject as never)

    const res = await POST(jsonReq({ title: "Alpha", icon: "folder" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(dbProject)
    expect(mockProject.create).toHaveBeenCalledWith({
      data: { title: "Alpha", icon: "folder", userId: "u1" },
    })
  })

  it("defaults icon to 'folder' when not provided", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockProject.create.mockResolvedValue(dbProject as never)

    await POST(jsonReq({ title: "Alpha" }))

    expect(mockProject.create).toHaveBeenCalledWith({
      data: { title: "Alpha", icon: "folder", userId: "u1" },
    })
  })
})
