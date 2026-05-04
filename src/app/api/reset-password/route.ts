import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimited, clientIp } from "@/lib/rateLimit"

export async function POST(req: Request) {
  if (rateLimited(`reset:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "900" } })
  }

  const { token, password } = await req.json()

  if (!token || !password || typeof password !== "string" || password.length < 8 || password.length > 72) {
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
