import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { notes, timeMinutes, difficulty, mood, nextStepTitle } = await req.json()

  const result = await prisma.$transaction(async (tx) => {
    const reflection = await tx.taskReflection.create({
      data: {
        taskId: id,
        notes: notes ?? null,
        timeMinutes: timeMinutes ?? null,
        difficulty: difficulty ?? null,
        mood: mood ?? null,
      },
    })

    let nextTask: Awaited<ReturnType<typeof tx.task.create>> | undefined
    if (nextStepTitle?.trim()) {
      nextTask = await tx.task.create({
        data: {
          title: nextStepTitle.trim(),
          userId,
          projectId: task.projectId,
          done: false,
        },
      })
    }

    return { reflection, nextTask }
  })

  return NextResponse.json(result)
}
