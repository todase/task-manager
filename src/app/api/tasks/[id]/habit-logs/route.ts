import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 90)
  since.setUTCHours(0, 0, 0, 0)

  const logs = await prisma.habitLog.findMany({
    where: { taskId: id, date: { gte: since } },
    include: {
      reflection: { select: { mood: true, difficulty: true } },
    },
    orderBy: { date: "asc" },
  })

  return NextResponse.json({ logs })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const dateStr: string = body.date
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }

  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))

  const existing = await prisma.habitLog.findUnique({
    where: { taskId_date: { taskId: id, date } },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
    return NextResponse.json({ created: false })
  }

  const now = new Date()
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const todayStr = new Date(todayUTC).toISOString().slice(0, 10)
  const isToday = dateStr === todayStr

  if (isToday && task.recurrence && task.dueDate) {
    const next = new Date(task.dueDate)
    while (next.getTime() <= todayUTC) {
      if (task.recurrence === "daily") next.setUTCDate(next.getUTCDate() + 1)
      else if (task.recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7)
      else if (task.recurrence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1)
    }

    await prisma.$transaction([
      prisma.habitLog.create({ data: { taskId: id, date } }),
      prisma.task.update({ where: { id }, data: { dueDate: next, done: false } }),
    ])
  } else {
    await prisma.habitLog.create({ data: { taskId: id, date } })
  }

  return NextResponse.json({ created: true })
}
