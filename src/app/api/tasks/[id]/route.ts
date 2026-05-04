import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { tagIds, done, title, dueDate, recurrence, projectId, description, isHabit } =
    await req.json()

  if (recurrence !== undefined && recurrence !== null) {
    const valid = ["daily", "weekly", "monthly"]
    if (!valid.includes(recurrence)) {
      return NextResponse.json(
        { error: "Invalid recurrence value" },
        { status: 400 }
      )
    }
  }

  if (isHabit === true) {
    if (recurrence === null) {
      return NextResponse.json(
        { error: "isHabit requires recurrence" },
        { status: 400 }
      )
    }
    if (recurrence === undefined) {
      const existing = await prisma.task.findFirst({ where: { id, userId } })
      if (!existing?.recurrence) {
        return NextResponse.json(
          { error: "isHabit requires recurrence" },
          { status: 400 }
        )
      }
    }
  }

  // Повторяющаяся задача — сдвигаем дату вместо архивирования.
  // completedAt намеренно не записывается: задача не завершается, а переносится.
  if (done === true) {
    const existing = await prisma.task.findFirst({ where: { id, userId } })
    if (existing?.recurrence && existing.dueDate) {
      const now = new Date()
      const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      const next = new Date(existing.dueDate)
      while (next.getTime() <= todayUTC) {
        if (existing.recurrence === "daily") next.setUTCDate(next.getUTCDate() + 1)
        else if (existing.recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7)
        else if (existing.recurrence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1)
      }

      const include = {
        project: { select: { id: true, title: true } },
        subtasks: true,
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      } as const

      if (existing.isHabit) {
        const date = new Date(todayUTC)
        const [, task] = await prisma.$transaction([
          prisma.habitLog.upsert({
            where: { taskId_date: { taskId: id, date } },
            create: { taskId: id, date },
            update: {},
          }),
          prisma.task.update({
            where: { id, userId },
            data: { dueDate: next, done: false },
            include,
          }),
        ])
        return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
      }

      const task = await prisma.task.update({
        where: { id, userId },
        data: { dueDate: next, done: false },
        include,
      })
      return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
    }
  }

  // Build update data from explicit fields only
  const data: Record<string, unknown> = {}
  if (done !== undefined) {
    data.done = done
    data.completedAt = done === true ? new Date() : null
  }
  if (title !== undefined) data.title = title
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
  if (recurrence !== undefined) data.recurrence = recurrence
  if (projectId !== undefined) {
    if (projectId !== null) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      })
      if (!project) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    data.projectId = projectId
  }
  if (description !== undefined) data.description = description
  if (isHabit !== undefined) data.isHabit = isHabit
  if (Array.isArray(tagIds)) {
    if (tagIds.length > 0) {
      const ownedCount = await prisma.tag.count({
        where: { id: { in: tagIds }, userId },
      })
      if (ownedCount !== tagIds.length) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    data.tags = {
      deleteMany: {},
      create: tagIds.map((tagId: string) => ({ tagId })),
    }
  }

  const task = await prisma.task.update({
    where: { id, userId },
    data,
    include: {
      project: { select: { id: true, title: true } },
      subtasks: true,
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  })

  return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
}


export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await prisma.task.delete({
    where: { id, userId },
  })

  return NextResponse.json({ success: true })
}
