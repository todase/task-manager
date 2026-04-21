import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items: { id: string; order: number }[] = await req.json()

  await prisma.$transaction(
    items.map(({ id, order }) =>
      prisma.task.update({
        where: { id, userId },
        data: { order },
      })
    )
  )

  return NextResponse.json({ success: true })
}
