import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  if (body.recurrence !== undefined && body.recurrence !== null) {
    const valid = ["daily", "weekly", "monthly"]
    if (!valid.includes(body.recurrence)) {
      return NextResponse.json({ error: "Invalid recurrence value" }, { status: 400 })
    }
  }

  // Если повторяющаяся задача отмечается выполненной — сдвигаем дату вместо done=true
  if (body.done === true) {
    const existing = await prisma.task.findUnique({ where: { id } })
    if (existing?.recurrence && existing.dueDate) {
      const next = new Date(existing.dueDate)
      if (existing.recurrence === "daily") next.setDate(next.getDate() + 1)
      if (existing.recurrence === "weekly") next.setDate(next.getDate() + 7)
      if (existing.recurrence === "monthly") next.setMonth(next.getMonth() + 1)

      const task = await prisma.task.update({
        where: { id, userId: session.user.id },
        data: { dueDate: next, done: false },
        include: { project: { select: { id: true, title: true } }, subtasks: true },
      })
      return NextResponse.json(task)
    }
  }

  const task = await prisma.task.update({
    where: { id, userId: session.user.id },
    data: body,
    include: { project: { select: { id: true, title: true } }, subtasks: true },
  })

  return NextResponse.json(task)
}


export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  await prisma.task.delete({
    where: { id, userId: session.user.id },
  })

  return NextResponse.json({ success: true })
}
