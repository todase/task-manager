import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GET } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn() },
    habitLog: { findMany: vi.fn() },
  },
}))

const mockAuth = vi.mocked(auth)
const mockTask = vi.mocked(prisma.task)
const mockHabitLog = vi.mocked(prisma.habitLog)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function params(id = "task-1") {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

describe("GET /api/tasks/[id]/habit-logs", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(401)
  })

  it("returns 403 when task belongs to another user", async () => {
    mockAuth.mockResolvedValue(session("u1") as never)
    mockTask.findUnique.mockResolvedValue({ id: "task-1", userId: "u2" } as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(403)
  })

  it("returns 403 when task not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findUnique.mockResolvedValue(null as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(403)
  })

  it("returns logs for last 90 days with reflection data", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findUnique.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
    const mockLogs = [
      {
        id: "log-1",
        taskId: "task-1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        reflection: { mood: "energized", difficulty: 1 },
      },
    ]
    mockHabitLog.findMany.mockResolvedValue(mockLogs as never)

    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.logs).toHaveLength(1)
    expect(body.logs[0].reflection.mood).toBe("energized")
    expect(mockHabitLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ taskId: "task-1" }),
        orderBy: { date: "asc" },
      })
    )
  })
})
