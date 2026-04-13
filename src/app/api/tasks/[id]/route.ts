import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Обновить задачу (отметить выполненной)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { done } = await req.json()
  const task = await prisma.task.update({
    where: { id: params.id, userId: session.user.id },
    data: { done },
  })

  return NextResponse.json(task)
}

// Удалить задачу
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.task.delete({
    where: { id: params.id, userId: session.user.id },
  })

  return NextResponse.json({ success: true })
}
