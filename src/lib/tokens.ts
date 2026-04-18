import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function createVerificationToken(userId: string): Promise<string> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({ data: { token, userId, expiresAt } }),
  ])
  return token
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { email } }),
    prisma.passwordResetToken.create({ data: { token, email, expiresAt } }),
  ])
  return token
}
