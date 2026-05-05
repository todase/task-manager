import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PATCH, DELETE } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      count: vi.fn(),
    },
    habitLog: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockAuth = vi.mocked(auth)
const mockTask = vi.mocked(prisma.task)
const mockTag = vi.mocked(prisma.tag)
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>

function session(userId = "u1") {
  return { user: { id: userId } }
}

function jsonReq(method: string, body: unknown) {
  return new Request("http://localhost/api/tasks/task-1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function params(id = "task-1") {
  return { params: Promise.resolve({ id }) }
}

const dbTask = {
  id: "task-1",
  title: "Test",
  done: false,
  dueDate: null,
  recurrence: null,
  description: null,
  order: 0,
  project: { id: "p1", title: "Project" },
  subtasks: [],
  tags: [{ tag: { id: "tag-1", name: "bug", color: "#60a5fa" } }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PATCH /api/tasks/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await PATCH(jsonReq("PATCH", { title: "X" }), params())
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid recurrence value", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await PATCH(jsonReq("PATCH", { recurrence: "hourly" }), params())
    expect(res.status).toBe(400)
  })

  it("accepts null recurrence (clearing it)", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.update.mockResolvedValue(dbTask as never)

    const res = await PATCH(jsonReq("PATCH", { recurrence: null }), params())
    expect(res.status).toBe(200)
  })

  it("uses findFirst with userId when checking recurring task on done=true", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue(null as never)
    mockTask.update.mockResolvedValue({ ...dbTask, done: true } as never)

    await PATCH(jsonReq("PATCH", { done: true }), params())

    expect(mockTask.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "u1" }) })
    )
  })

  it("advances date for recurring task marked done", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const dueDate = new Date("2026-04-01T00:00:00.000Z")
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      recurrence: "weekly",
      dueDate,
    } as never)
    mockTask.update.mockResolvedValue({ ...dbTask, dueDate: new Date("2026-04-08"), done: false } as never)

    const res = await PATCH(jsonReq("PATCH", { done: true }), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    // Should update dueDate 7 days later, not set done=true
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ done: false }) })
    )
    expect(body.done).toBe(false)
  })

  it("returns 403 when tagIds include tags not owned by user", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.count.mockResolvedValue(0 as never) // owns 0 of the requested tags

    const res = await PATCH(jsonReq("PATCH", { tagIds: ["tag-other"] }), params())
    expect(res.status).toBe(403)
  })

  it("updates task and returns with flattened tags", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.update.mockResolvedValue(dbTask as never)

    const res = await PATCH(jsonReq("PATCH", { title: "Updated" }), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tags).toEqual([{ id: "tag-1", name: "bug", color: "#60a5fa" }])
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-1", userId: "u1" },
        data: { title: "Updated" },
      })
    )
  })

  it("replaces tags when tagIds provided and owned", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTag.count.mockResolvedValue(1 as never) // owns all requested tags
    mockTask.update.mockResolvedValue(dbTask as never)

    await PATCH(jsonReq("PATCH", { tagIds: ["tag-1"] }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: { deleteMany: {}, create: [{ tagId: "tag-1" }] },
        }),
      })
    )
  })

  it("sets completedAt when marking done=true (non-recurring)", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", recurrence: null, dueDate: null } as never)
    mockTask.update.mockResolvedValue({ ...dbTask, done: true, completedAt: new Date() } as never)

    await PATCH(jsonReq("PATCH", { done: true }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ done: true, completedAt: expect.any(Date) }),
      })
    )
  })

  it("clears completedAt when marking done=false", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", recurrence: null, dueDate: null } as never)
    mockTask.update.mockResolvedValue({ ...dbTask, done: false, completedAt: null } as never)

    await PATCH(jsonReq("PATCH", { done: false }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ done: false, completedAt: null }),
      })
    )
  })

  it("does not set completedAt when advancing recurring task date", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const dueDate = new Date("2026-04-01T00:00:00.000Z")
    mockTask.findFirst.mockResolvedValue({ id: "task-1", recurrence: "daily", dueDate } as never)
    mockTask.update.mockResolvedValue({ ...dbTask, dueDate: new Date("2026-04-02"), done: false } as never)

    await PATCH(jsonReq("PATCH", { done: true }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ completedAt: expect.anything() }),
      })
    )
  })

  it("advances dueDate past today when dueDate is stale (multiple periods in the past)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-02T12:00:00.000Z"))

    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      recurrence: "weekly",
      dueDate: new Date("2026-04-01T00:00:00.000Z"), // 4+ weeks in the past
      isHabit: false,
    } as never)
    mockTask.update.mockResolvedValue({ ...dbTask, done: false } as never)

    await PATCH(jsonReq("PATCH", { done: true }), params())

    // April 1 + 5 weekly steps → May 6 (first Wednesday after May 2)
    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dueDate: new Date("2026-05-06T00:00:00.000Z"),
          done: false,
        }),
      })
    )

    vi.useRealTimers()
  })

  it("returns 400 when isHabit=true and recurrence=null", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await PATCH(
      jsonReq("PATCH", { isHabit: true, recurrence: null }),
      params()
    )
    expect(res.status).toBe(400)
  })

  it("upserts HabitLog and shifts dueDate in transaction for habit done", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const dueDate = new Date("2026-04-01T00:00:00.000Z")
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      recurrence: "daily",
      dueDate,
      isHabit: true,
    } as never)

    const updatedTask = { ...dbTask, dueDate: new Date("2026-04-02"), done: false }
    mockTransaction.mockResolvedValue([{}, updatedTask])

    const res = await PATCH(jsonReq("PATCH", { done: true }), params())
    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({}),
        expect.objectContaining({}),
      ])
    )
  })

  it("returns 400 for weeklyTarget out of range in PATCH", async () => {
    mockAuth.mockResolvedValue(session() as never)
    const res = await PATCH(jsonReq("PATCH", { recurrence: "weekly", weeklyTarget: 8 }), params())
    expect(res.status).toBe(400)
  })

  it("saves weeklyTarget when recurrence is weekly in same request", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.update.mockResolvedValue({ ...dbTask, recurrence: "weekly", weeklyTarget: 3 } as never)

    await PATCH(jsonReq("PATCH", { recurrence: "weekly", weeklyTarget: 3 }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ weeklyTarget: 3 }),
      })
    )
  })

  it("ignores weeklyTarget when existing recurrence is not weekly", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({ id: "task-1", recurrence: "daily" } as never)
    mockTask.update.mockResolvedValue({ ...dbTask, recurrence: "daily" } as never)

    await PATCH(jsonReq("PATCH", { weeklyTarget: 3 }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ weeklyTarget: expect.anything() }),
      })
    )
  })

  it("clears estimatedMinutes when null is sent in PATCH", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.update.mockResolvedValue({ ...dbTask, estimatedMinutes: null } as never)

    await PATCH(jsonReq("PATCH", { estimatedMinutes: null }), params())

    expect(mockTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estimatedMinutes: null }),
      })
    )
  })

  it("does not upsert HabitLog for non-habit recurring task done", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findFirst.mockResolvedValue({
      id: "task-1",
      recurrence: "daily",
      dueDate: new Date("2026-04-01"),
      isHabit: false,
    } as never)
    mockTask.update.mockResolvedValue({ ...dbTask, dueDate: new Date("2026-04-02"), done: false } as never)

    await PATCH(jsonReq("PATCH", { done: true }), params())
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockTask.update).toHaveBeenCalled()
  })
})

describe("DELETE /api/tasks/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await DELETE(new Request("http://localhost/api/tasks/task-1"), params())
    expect(res.status).toBe(401)
  })

  it("deletes task and returns success", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.delete.mockResolvedValue(dbTask as never)

    const res = await DELETE(new Request("http://localhost/api/tasks/task-1"), params())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockTask.delete).toHaveBeenCalledWith({
      where: { id: "task-1", userId: "u1" },
    })
  })
})
