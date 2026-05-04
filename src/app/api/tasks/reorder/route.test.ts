import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { update: vi.fn() },
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

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/tasks/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/tasks/reorder", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST(jsonReq([]))
    expect(res.status).toBe(401)
  })

  it("returns 400 when body is not a valid JSON array", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await POST(
      new Request("http://localhost/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      })
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when body is not an array", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await POST(jsonReq({ id: "task-1", order: 0 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when array exceeds 500 items", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const items = Array.from({ length: 501 }, (_, i) => ({ id: `task-${i}`, order: i }))
    const res = await POST(jsonReq(items))
    expect(res.status).toBe(400)
  })

  it("returns 400 when items have invalid shape", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await POST(jsonReq([{ id: 123, order: "bad" }]))
    expect(res.status).toBe(400)
  })

  it("runs a transaction with one update per item", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockPrisma.$transaction.mockResolvedValue([] as never)

    const items = [
      { id: "task-1", order: 0 },
      { id: "task-2", order: 1 },
    ]
    const res = await POST(jsonReq(items))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    // Should have called task.update for each item
    expect(mockPrisma.task.update).toHaveBeenCalledTimes(2)
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1", userId: "u1" },
      data: { order: 0 },
    })
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-2", userId: "u1" },
      data: { order: 1 },
    })
  })
})
