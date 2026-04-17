import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PATCH, DELETE } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subtask: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockAuth = vi.mocked(auth)
const mockSubtask = vi.mocked(prisma.subtask)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function jsonReq(method: string, body: unknown) {
  return new Request("http://localhost/api/tasks/task-1/subtasks/sub-1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function params(subtaskId = "sub-1") {
  return { params: Promise.resolve({ subtaskId }) }
}

const dbSubtask = {
  id: "sub-1",
  title: "Do it",
  done: false,
  taskId: "task-1",
  task: { userId: "u1" },
}

beforeEach(() => vi.clearAllMocks())

describe("PATCH /api/tasks/[id]/subtasks/[subtaskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await PATCH(jsonReq("PATCH", { done: true }), params())
    expect(res.status).toBe(401)
  })

  it("returns 404 when subtask not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockSubtask.findUnique.mockResolvedValue(null as never)

    const res = await PATCH(jsonReq("PATCH", { done: true }), params())
    expect(res.status).toBe(404)
  })

  it("returns 404 when subtask belongs to different user", async () => {
    mockAuth.mockResolvedValue(session("u1") as never)
    mockSubtask.findUnique.mockResolvedValue({ ...dbSubtask, task: { userId: "u2" } } as never)

    const res = await PATCH(jsonReq("PATCH", { done: true }), params())
    expect(res.status).toBe(404)
  })

  it("updates subtask and returns it", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockSubtask.findUnique.mockResolvedValue(dbSubtask as never)
    const updated = { ...dbSubtask, done: true }
    mockSubtask.update.mockResolvedValue(updated as never)

    const res = await PATCH(jsonReq("PATCH", { done: true }), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.done).toBe(true)
    expect(mockSubtask.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { done: true },
    })
  })
})

describe("DELETE /api/tasks/[id]/subtasks/[subtaskId]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await DELETE(new Request("http://localhost/api/tasks/task-1/subtasks/sub-1"), params())
    expect(res.status).toBe(401)
  })

  it("returns 404 when subtask not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockSubtask.findUnique.mockResolvedValue(null as never)

    const res = await DELETE(new Request("http://localhost/api/tasks/task-1/subtasks/sub-1"), params())
    expect(res.status).toBe(404)
  })

  it("returns 404 when subtask belongs to different user", async () => {
    mockAuth.mockResolvedValue(session("u1") as never)
    mockSubtask.findUnique.mockResolvedValue({ ...dbSubtask, task: { userId: "u2" } } as never)

    const res = await DELETE(new Request("http://localhost/api/tasks/task-1/subtasks/sub-1"), params())
    expect(res.status).toBe(404)
  })

  it("deletes subtask and returns success", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockSubtask.findUnique.mockResolvedValue(dbSubtask as never)
    mockSubtask.delete.mockResolvedValue(dbSubtask as never)

    const res = await DELETE(new Request("http://localhost/api/tasks/task-1/subtasks/sub-1"), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockSubtask.delete).toHaveBeenCalledWith({ where: { id: "sub-1" } })
  })
})
