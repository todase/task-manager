import { NextResponse } from "next/server"
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

  const doneFilter = doneParam === "true"
  const parsedLimit = parseInt(limitParam ?? "", 10)
  const take = isNaN(parsedLimit) ? 200 : Math.max(1, Math.min(parsedLimit, 500))
  const orderBy =
    sortParam === "updatedAt_desc"
      ? { updatedAt: "desc" as const }
      : { order: "asc" as const }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id, done: doneFilter },
    orderBy,
    take,
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

