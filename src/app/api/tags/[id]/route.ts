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
  const { name, color } = await req.json()

  const tag = await prisma.tag.update({
    where: { id, userId: session.user.id },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(color && { color }),
    },
  })
  return NextResponse.json(tag)
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

  await prisma.tag.delete({ where: { id, userId: session.user.id } })
  return new NextResponse(null, { status: 204 })
}
