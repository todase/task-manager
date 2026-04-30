import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 90)
  since.setUTCHours(0, 0, 0, 0)

  const logs = await prisma.habitLog.findMany({
    where: { taskId: id, date: { gte: since } },
    include: {
      reflection: { select: { mood: true, difficulty: true } },
    },
    orderBy: { date: "asc" },
  })

  return NextResponse.json({ logs })
}
