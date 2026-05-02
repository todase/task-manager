import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GET, POST, DELETE } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockAuth = vi.mocked(auth)
const mockPrisma = {
  task: vi.mocked(prisma.task),
  $transaction: vi.mocked(prisma.$transaction),
}

function session(userId = "u1") {
  return { user: { id: userId } }
}

function req(url: string, opts?: RequestInit) {
  return new Request(url, opts)
}

function jsonReq(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const dbTask = {
  id: "task-1",
  title: "Test",
  done: false,
  dueDate: null,
  recurrence: null,
  description: null,
  order: 0,
  project: null,
  subtasks: [],
  tags: [{ tag: { id: "tag-1", name: "bug", color: "#60a5fa" } }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await GET(req("http://localhost/api/tasks"))
    expect(res.status).toBe(401)
  })

  it("returns tasks with flattened tags", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([dbTask] as never)

    const res = await GET(req("http://localhost/api/tasks"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body[0].tags).toEqual([{ id: "tag-1", name: "bug", color: "#60a5fa" }])
  })

  it("filters by done=true", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks?done=true"))

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ done: true }) })
    )
  })

  it("filters by done=false", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks?done=false"))

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ done: false }) })
    )
  })

  it("orders by createdAt desc for sort=createdAt_desc", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks?sort=createdAt_desc"))

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    )
  })

  it("sorts by completedAt desc when done=true", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks?done=true"))

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { completedAt: { sort: "desc", nulls: "last" } },
      })
    )
  })

  it("filters by isHabit=true", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks?isHabit=true"))

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isHabit: true }) })
    )
  })

  it("filters by isHabit=false", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks?isHabit=false"))

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isHabit: false }) })
    )
  })

  it("includes reflections in include when done=true", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks?done=true"))

    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ reflections: expect.any(Object) }),
      })
    )
  })

  it("does not include reflections in include when done is not true", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([] as never)

    await GET(req("http://localhost/api/tasks"))

    const call = mockPrisma.task.findMany.mock.calls[0][0] as { include: Record<string, unknown> }
    expect(call.include).not.toHaveProperty("reflections")
  })

  it("filters by isHabit=true", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.findMany.mockResolvedValue([
      { ...dbTask, isHabit: true, tags: [] },
    ] as never)

    const res = await GET(req("http://localhost/api/tasks?isHabit=true"))
    expect(res.status).toBe(200)
    expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isHabit: true }),
      })
    )
  })
})

describe("POST /api/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST(jsonReq("http://localhost/api/tasks", "POST", { title: "X" }))
    expect(res.status).toBe(401)
  })

  it("creates task and returns with flattened tags", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.$transaction.mockImplementation(async (cb: unknown) =>
      (cb as (tx: typeof prisma) => Promise<unknown>)(prisma)
    )
    mockPrisma.task.updateMany.mockResolvedValue({ count: 0 } as never)
    mockPrisma.task.create.mockResolvedValue(dbTask as never)

    const res = await POST(jsonReq("http://localhost/api/tasks", "POST", { title: "Test" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.title).toBe("Test")
    expect(body.tags).toEqual([{ id: "tag-1", name: "bug", color: "#60a5fa" }])
  })

  it("returns 400 when isHabit=true and no recurrence", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await POST(
      jsonReq("http://localhost/api/tasks", "POST", { title: "Morning run", isHabit: true })
    )
    expect(res.status).toBe(400)
  })

  it("creates a habit task when isHabit=true with recurrence", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.$transaction.mockImplementation(async (cb: unknown) =>
      (cb as (tx: typeof prisma) => Promise<unknown>)(prisma)
    )
    mockPrisma.task.updateMany.mockResolvedValue({ count: 0 } as never)
    mockPrisma.task.create.mockResolvedValue({
      ...dbTask,
      isHabit: true,
      recurrence: "daily",
      tags: [],
    } as never)

    const res = await POST(
      jsonReq("http://localhost/api/tasks", "POST", { title: "Morning run", isHabit: true, recurrence: "daily" })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isHabit).toBe(true)
  })
})

describe("DELETE /api/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await DELETE(req("http://localhost/api/tasks?done=true"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when done=true param is missing", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await DELETE(req("http://localhost/api/tasks"))
    expect(res.status).toBe(400)
  })

  it("deletes all done tasks and returns 204", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.task.deleteMany.mockResolvedValue({ count: 3 } as never)

    const res = await DELETE(req("http://localhost/api/tasks?done=true"))
    expect(res.status).toBe(204)
    expect(mockPrisma.task.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", done: true },
    })
  })
})
