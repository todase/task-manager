import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const mockAuth = vi.mocked(auth)
const mockFindUnique = vi.mocked(prisma.task.findUnique)
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>

function session(userId = "u1") {
  return { user: { id: userId } }
}

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/tasks/task-1/reflection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function params(id = "task-1") {
  return { params: Promise.resolve({ id }) }
}

const mockReflection = {
  id: "ref-1",
  taskId: "task-1",
  notes: "Went well",
  timeMinutes: 30,
  difficulty: 2,
  mood: "neutral",
  createdAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/tasks/[id]/reflection", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST(jsonReq({}), params())
    expect(res.status).toBe(401)
  })

  it("returns 404 when task not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockFindUnique.mockResolvedValue(null as never)
    const res = await POST(jsonReq({}), params())
    expect(res.status).toBe(404)
  })

  it("returns 404 when task belongs to another user", async () => {
    mockAuth.mockResolvedValue(session("u1") as never)
    mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u2", projectId: null } as never)
    const res = await POST(jsonReq({}), params())
    expect(res.status).toBe(404)
  })

  it("creates reflection without next step", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u1", projectId: "p1" } as never)

    const reflectionCreate = vi.fn().mockResolvedValue(mockReflection)
    const taskCreate = vi.fn()
    mockTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ taskReflection: { create: reflectionCreate }, task: { create: taskCreate } })
    )

    const res = await POST(
      jsonReq({ notes: "Went well", timeMinutes: 30, difficulty: 2, mood: "neutral" }),
      params()
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reflection).toMatchObject({ id: "ref-1" })
    expect(body.nextTask).toBeUndefined()
    expect(taskCreate).not.toHaveBeenCalled()
    expect(reflectionCreate).toHaveBeenCalledWith({
      data: { taskId: "task-1", notes: "Went well", timeMinutes: 30, difficulty: 2, mood: "neutral" },
    })
  })

  it("creates reflection and next task when nextStepTitle provided", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u1", projectId: "p1" } as never)

    const nextTask = { id: "task-2", title: "Follow up", userId: "u1", projectId: "p1", done: false }
    const reflectionCreate = vi.fn().mockResolvedValue(mockReflection)
    const taskCreate = vi.fn().mockResolvedValue(nextTask)
    mockTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ taskReflection: { create: reflectionCreate }, task: { create: taskCreate } })
    )

    const res = await POST(jsonReq({ nextStepTitle: "Follow up" }), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.nextTask).toMatchObject({ title: "Follow up" })
    expect(taskCreate).toHaveBeenCalledWith({
      data: { title: "Follow up", userId: "u1", projectId: "p1", done: false },
    })
  })

  it("ignores blank nextStepTitle", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u1", projectId: null } as never)

    const reflectionCreate = vi.fn().mockResolvedValue(mockReflection)
    const taskCreate = vi.fn()
    mockTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ taskReflection: { create: reflectionCreate }, task: { create: taskCreate } })
    )

    const res = await POST(jsonReq({ nextStepTitle: "   " }), params())
    expect(res.status).toBe(200)
    expect(taskCreate).not.toHaveBeenCalled()
  })
})
