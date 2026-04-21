import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const { name, color } = await req.json()

  const tag = await prisma.tag.update({
    where: { id, userId },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(color && { color }),
    },
  })
  return NextResponse.json(tag)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params

  await prisma.tag.delete({ where: { id, userId } })
  return new NextResponse(null, { status: 204 })
}
