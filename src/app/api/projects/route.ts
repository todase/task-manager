import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Получить все проекты пользователя
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { tasks: true },
  })

  return NextResponse.json(projects)
}

// Создать проект
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, icon = "folder" } = await req.json()
  const project = await prisma.project.create({
    data: { title, icon, userId: session.user.id },
  })

  return NextResponse.json(project)
}
