import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Создать подзадачу
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { id: taskId } = await params
  const { title } = await req.json()

  const task = await prisma.task.findUnique({ where: { id: taskId, userId } })

  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const subtask = await prisma.subtask.create({
    data: { title, taskId },
  })

  return NextResponse.json(subtask)
}
