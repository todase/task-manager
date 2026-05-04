import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array" }, { status: 400 })
  }

  if (body.length > 500) {
    return NextResponse.json({ error: "Too many items" }, { status: 400 })
  }

  for (const item of body) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).id !== "string" ||
      typeof (item as Record<string, unknown>).order !== "number"
    ) {
      return NextResponse.json({ error: "Invalid item shape" }, { status: 400 })
    }
  }

  const items = body as { id: string; order: number }[]

  await prisma.$transaction(
    items.map(({ id, order }) =>
      prisma.task.updateMany({
        where: { id, userId },
        data: { order },
      })
    )
  )

  return NextResponse.json({ success: true })
}
