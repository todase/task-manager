import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createPasswordResetToken } from "@/lib/tokens"
import { sendPasswordResetEmail } from "@/lib/email"
import { rateLimited, clientIp } from "@/lib/rateLimit"

export async function POST(req: Request) {
  if (rateLimited(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "900" } })
  }

  const { email } = await req.json()

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.oauthProvider === "google") {
    return NextResponse.json({ ok: true })
  }

  const token = await createPasswordResetToken(email)
  await sendPasswordResetEmail(email, token)

  return NextResponse.json({ ok: true })
}
