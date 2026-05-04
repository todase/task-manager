import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GET, POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findFirst: vi.fn(), update: vi.fn() },
    habitLog: { findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const mockAuth = vi.mocked(auth)
const mockTask = vi.mocked(prisma.task)
const mockHabitLog = vi.mocked(prisma.habitLog)
const mockTransaction = vi.mocked(prisma.$transaction)

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
    // findFirst({ id, userId: "u1" }) returns null for a task owned by "u2"
    mockTask.findFirst.mockResolvedValue(null as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(403)
  })

  it("returns 403 when task not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue(null as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(403)
  })

  it("returns logs for last 90 days with reflection data", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
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

function postRequest(body: unknown) {
  return new Request("http://localhost/api/tasks/task-1/habit-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/tasks/[id]/habit-logs", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST(postRequest({ date: "2026-05-01" }), params())
    expect(res.status).toBe(401)
  })

  it("returns 403 when task not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue(null as never)
    const res = await POST(postRequest({ date: "2026-05-01" }), params())
    expect(res.status).toBe(403)
  })

  it("returns 403 when task belongs to another user", async () => {
    mockAuth.mockResolvedValue(session("u1") as never)
    // findFirst({ id, userId: "u1" }) returns null for a task owned by "u2"
    mockTask.findFirst.mockResolvedValue(null as never)
    const res = await POST(postRequest({ date: "2026-05-01" }), params())
    expect(res.status).toBe(403)
  })

  it("returns 400 when date is missing", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
    const res = await POST(postRequest({}), params())
    expect(res.status).toBe(400)
  })

  it("returns 400 when date is not in YYYY-MM-DD format", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
    const res = await POST(postRequest({ date: "01-05-2026" }), params())
    expect(res.status).toBe(400)
  })

  it("returns 400 when date is in the future", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-03T12:00:00.000Z"))
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
    const res = await POST(postRequest({ date: "2026-05-04" }), params())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/future/i)
    vi.useRealTimers()
  })

  it("deletes existing log and returns { created: false } when log already exists", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
    mockHabitLog.findUnique.mockResolvedValue({ id: "log-99", taskId: "task-1" } as never)
    mockHabitLog.delete.mockResolvedValue({} as never)

    const res = await POST(postRequest({ date: "2026-05-01" }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.created).toBe(false)
    expect(mockHabitLog.delete).toHaveBeenCalledWith({ where: { id: "log-99" } })
  })

  it("creates log and returns { created: true } for a past date without recurrence", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      userId: "u1",
      recurrence: null,
      dueDate: null,
    } as never)
    mockHabitLog.findUnique.mockResolvedValue(null as never)
    mockHabitLog.create.mockResolvedValue({ id: "log-new" } as never)

    const res = await POST(postRequest({ date: "2026-01-01" }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.created).toBe(true)
    expect(mockHabitLog.create).toHaveBeenCalledWith({
      data: { taskId: "task-1", date: new Date(Date.UTC(2026, 0, 1)) },
    })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it("advances dueDate past today when dueDate is stale on today's toggle", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-02T12:00:00.000Z"))

    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      userId: "u1",
      recurrence: "weekly",
      dueDate: new Date("2026-04-01T00:00:00.000Z"), // 4+ weeks in the past
    } as never)
    mockHabitLog.findUnique.mockResolvedValue(null as never)
    mockTransaction.mockResolvedValue([] as never)

    await POST(postRequest({ date: "2026-05-02" }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dueDate: new Date("2026-05-06T00:00:00.000Z"),
        }),
      })
    )

    vi.useRealTimers()
  })

  it("scopes dueDate update to owner userId in transaction", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"))

    mockAuth.mockResolvedValue(session("u1") as never)
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      userId: "u1",
      recurrence: "daily",
      dueDate: new Date("2026-05-03T00:00:00.000Z"),
    } as never)
    mockHabitLog.findUnique.mockResolvedValue(null as never)
    mockTask.update.mockResolvedValue({} as never)
    mockTransaction.mockResolvedValue([] as never)

    await POST(postRequest({ date: "2026-05-04" }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1", userId: "u1" },
      })
    )

    vi.useRealTimers()
  })

  it("advances dueDate in $transaction when creating for today with daily recurrence", async () => {
    const now = new Date()
    const todayStr = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
      .toISOString()
      .slice(0, 10)
    const dueDate = new Date("2026-05-02T00:00:00.000Z")

    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      userId: "u1",
      recurrence: "daily",
      dueDate,
    } as never)
    mockHabitLog.findUnique.mockResolvedValue(null as never)
    mockHabitLog.create.mockResolvedValue({ id: "log-new" } as never)
    mockTask.update.mockResolvedValue({} as never)
    mockTransaction.mockResolvedValue([] as never)

    const res = await POST(postRequest({ date: todayStr }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.created).toBe(true)
    expect(mockTransaction).toHaveBeenCalled()
    expect(mockHabitLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ taskId: "task-1" }),
    })
  })
})
