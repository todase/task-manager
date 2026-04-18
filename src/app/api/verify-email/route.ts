import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url))
  }

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } })
  if (!record) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url))
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { token } })
    return NextResponse.redirect(new URL("/verify-email?error=expired", req.url))
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  })
  await prisma.emailVerificationToken.delete({ where: { token } })

  return NextResponse.redirect(new URL("/tasks", req.url))
}
