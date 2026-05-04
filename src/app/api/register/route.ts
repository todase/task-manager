import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createVerificationToken } from "@/lib/tokens"
import { sendVerificationEmail } from "@/lib/email"
import { rateLimited, clientIp } from "@/lib/rateLimit"

export async function POST(req: Request) {
  if (rateLimited(`register:${clientIp(req)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "900" } })
  }

  const { email, password } = await req.json()

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  if (!password || typeof password !== "string" || password.length < 8 || password.length > 72) {
    return NextResponse.json(
      { error: "Password must be 8–72 characters" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ email }, { status: 200 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, password: hashed },
  })

  try {
    const token = await createVerificationToken(user.id)
    await sendVerificationEmail(email, token)
  } catch {
    // Email failure doesn't block registration — user can resend from banner
  }

  return NextResponse.json({ email: user.email })
}
