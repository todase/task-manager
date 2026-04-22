import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getUserId } from "@/lib/api-auth"

export const dynamic = "force-dynamic"
import { prisma } from "@/lib/prisma"

// Получить все задачи пользователя
export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const doneParam = searchParams.get("done")
  const limitParam = searchParams.get("limit")
  const sortParam = searchParams.get("sort")
  const q = searchParams.get("q") ?? undefined

  const doneFilter =
    doneParam === "true" ? true : doneParam === "false" ? false : undefined
  const parsedLimit = parseInt(limitParam ?? "", 10)
  const take = isNaN(parsedLimit) ? 200 : Math.max(1, Math.min(parsedLimit, 500))
  const orderBy: Prisma.TaskOrderByWithRelationInput =
    doneFilter === true
      ? { completedAt: { sort: "desc", nulls: "last" } }
      : sortParam === "createdAt_desc"
      ? { createdAt: "desc" }
      : { order: "asc" }

  const where: Prisma.TaskWhereInput = {
    userId,
    ...(doneFilter !== undefined && { done: doneFilter }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
    ...(q ? {} : { take }),
    include: {
      subtasks: true,
      project: { select: { id: true, title: true, icon: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    },
  })

  return NextResponse.json(
    tasks.map((t) => ({ ...t, tags: t.tags.map((tt) => tt.tag) }))
  )
}

// Создать новую задачу
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, projectId, dueDate, recurrence, tagIds } = await req.json()

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    })
    if (!project) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  if (Array.isArray(tagIds) && tagIds.length > 0) {
    const ownedCount = await prisma.tag.count({
      where: { id: { in: tagIds }, userId },
    })
    if (ownedCount !== tagIds.length) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const task = await prisma.$transaction(async (tx) => {
    // Shift all existing tasks down to make room at order 0
    await tx.task.updateMany({
      where: { userId },
      data: { order: { increment: 1 } },
    })

    return tx.task.create({
      data: {
        title,
        userId,
        order: 0,
        ...(projectId && { projectId }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(recurrence && { recurrence }),
        ...(Array.isArray(tagIds) && tagIds.length > 0 && {
          tags: { create: tagIds.map((tagId: string) => ({ tagId })) },
        }),
      },
      include: {
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      },
    })
  })

  return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
}

export async function DELETE(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get("done") !== "true") {
    return NextResponse.json({ error: "Missing done=true param" }, { status: 400 })
  }

  await prisma.task.deleteMany({
    where: { userId, done: true },
  })

  return new NextResponse(null, { status: 204 })
}
