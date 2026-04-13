import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Обновить подзадачу
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { subtaskId } = await params
  const { done } = await req.json()

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: { done },
  })

  return NextResponse.json(subtask)
}

// Удалить подзадачу
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { subtaskId } = await params

  await prisma.subtask.delete({ where: { id: subtaskId } })

  return NextResponse.json({ success: true })
}
