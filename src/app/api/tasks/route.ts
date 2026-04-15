import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Получить все задачи пользователя
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      subtasks: true,
      project: { select: { id: true, title: true } },
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

  const { title, projectId, dueDate, recurrence } = await req.json()
  const task = await prisma.task.create({
    data: {
      title,
      userId: session.user.id,
      ...(projectId && { projectId }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(recurrence && { recurrence }),
    },
  })

  return NextResponse.json(task)
}

