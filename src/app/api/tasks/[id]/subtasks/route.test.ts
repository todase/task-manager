import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn() },
    subtask: { create: vi.fn() },
  },
}))

const mockAuth = vi.mocked(auth)
const mockTask = vi.mocked(prisma.task)
const mockSubtask = vi.mocked(prisma.subtask)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/tasks/task-1/subtasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function params(id = "task-1") {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/tasks/[id]/subtasks", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST(jsonReq({ title: "Sub" }), params())
    expect(res.status).toBe(401)
  })

  it("returns 404 when task does not belong to user", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findUnique.mockResolvedValue(null as never)

    const res = await POST(jsonReq({ title: "Sub" }), params())
    expect(res.status).toBe(404)
  })

  it("creates subtask and returns it", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findUnique.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
    const subtask = { id: "sub-1", title: "Sub", done: false, taskId: "task-1" }
    mockSubtask.create.mockResolvedValue(subtask as never)

    const res = await POST(jsonReq({ title: "Sub" }), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(subtask)
    expect(mockSubtask.create).toHaveBeenCalledWith({
      data: { title: "Sub", taskId: "task-1" },
    })
  })
})
