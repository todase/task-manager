import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// Обновить подзадачу
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { subtaskId } = await params
  const { done } = await req.json()

  const existing = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { select: { userId: true } } },
  })

  if (!existing || existing.task.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: { done },
  })

  return NextResponse.json(subtask)
}

// Удалить подзадачу
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { subtaskId } = await params

  const existing = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { select: { userId: true } } },
  })

  if (!existing || existing.task.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.subtask.delete({ where: { id: subtaskId } })

  return NextResponse.json({ success: true })
}
