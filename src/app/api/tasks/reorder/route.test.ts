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
