import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { token, password } = await req.json()

  if (!token || !password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record) {
    return NextResponse.json({ error: "Token invalid or expired" }, { status: 400 })
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } })
    return NextResponse.json({ error: "Token invalid or expired" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({
    where: { email: record.email },
    data: { password: hashed },
  })
  await prisma.passwordResetToken.delete({ where: { token } })

  return NextResponse.json({ ok: true })
}
