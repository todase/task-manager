import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Получить все задачи пользователя
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
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
  const orderBy =
    sortParam === "updatedAt_desc"
      ? { updatedAt: "desc" as const }
      : { order: "asc" as const }

  const where: Prisma.TaskWhereInput = {
    userId: session.user.id,
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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { title, projectId, dueDate, recurrence, tagIds } = await req.json()

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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get("done") !== "true") {
    return NextResponse.json({ error: "Missing done=true param" }, { status: 400 })
  }

  await prisma.task.deleteMany({
    where: { userId: session.user.id, done: true },
  })

  return new NextResponse(null, { status: 204 })
}
