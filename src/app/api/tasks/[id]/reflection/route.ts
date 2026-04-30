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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { notes, timeMinutes, difficulty, mood, nextStepTitle } = body

  const safeTime =
    typeof timeMinutes === "number" && Number.isFinite(timeMinutes) && timeMinutes >= 0 && timeMinutes <= 1440
      ? timeMinutes
      : null
  const safeDifficulty = [1, 2, 3].includes(difficulty as number) ? (difficulty as 1 | 2 | 3) : null
  const safeMood = ["energized", "neutral", "tired"].includes(mood as string)
    ? (mood as "energized" | "neutral" | "tired")
    : null

  const result = await prisma.$transaction(async (tx) => {
    const reflection = await tx.taskReflection.create({
      data: {
        taskId: id,
        notes: typeof notes === "string" && notes ? notes : null,
        timeMinutes: safeTime,
        difficulty: safeDifficulty,
        mood: safeMood,
      },
    })

    let nextTask: Awaited<ReturnType<typeof tx.task.create>> | undefined

    if (task.isHabit) {
      const latestLog = await tx.habitLog.findFirst({
        where: { taskId: id },
        orderBy: { date: "desc" },
      })
      if (latestLog) {
        await tx.habitLog.update({
          where: { id: latestLog.id },
          data: { reflectionId: reflection.id },
        })
      }
    } else {
      const nextStepStr = typeof nextStepTitle === "string" ? nextStepTitle.trim() : ""
      if (nextStepStr) {
        nextTask = await tx.task.create({
          data: {
            title: nextStepStr,
            userId,
            projectId: task.projectId,
            done: false,
          },
        })
      }
    }

    return { reflection, nextTask }
  })

  return NextResponse.json(result)
}
