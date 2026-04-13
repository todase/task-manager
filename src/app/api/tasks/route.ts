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
    orderBy: { createdAt: "desc" },
    include: { subtasks: true, project: { select: { id: true, title: true } } },
  })


  return NextResponse.json(tasks)
}

// Создать новую задачу
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, projectId, dueDate } = await req.json()
  const task = await prisma.task.create({
    data: {
      title,
      userId: session.user.id,
      ...(projectId && { projectId }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
    },
  })

  return NextResponse.json(task)
}

