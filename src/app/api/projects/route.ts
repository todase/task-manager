import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Получить все проекты пользователя
export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { tasks: true },
  })

  return NextResponse.json(projects)
}

// Создать проект
export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title, icon = "folder" } = await req.json()
  const project = await prisma.project.create({
    data: { title, icon, userId },
  })

  return NextResponse.json(project)
}
