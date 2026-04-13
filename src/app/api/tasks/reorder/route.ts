import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const items: { id: string; order: number }[] = await req.json()

  await prisma.$transaction(
    items.map(({ id, order }) =>
      prisma.task.update({
        where: { id, userId: session.user.id },
        data: { order },
      })
    )
  )

  return NextResponse.json({ success: true })
}
