import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createVerificationToken } from "@/lib/tokens"
import { sendVerificationEmail } from "@/lib/email"
import { rateLimited } from "@/lib/rateLimit"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (rateLimited(`resend:${session.user.id}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "900" } })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true })
  }

  const token = await createVerificationToken(user.id)
  await sendVerificationEmail(user.email, token)

  return NextResponse.json({ ok: true })
}
