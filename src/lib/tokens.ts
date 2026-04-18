import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function createVerificationToken(userId: string): Promise<string> {
  await prisma.emailVerificationToken.deleteMany({ where: { userId } })
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.emailVerificationToken.create({ data: { token, userId, expiresAt } })
  return token
}

export async function createPasswordResetToken(email: string): Promise<string> {
  await prisma.passwordResetToken.deleteMany({ where: { email } })
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.passwordResetToken.create({ data: { token, email, expiresAt } })
  return token
}
