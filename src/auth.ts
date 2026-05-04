import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimited, clientIp } from "@/lib/rateLimit"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const key = `login:${clientIp(request)}`

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password) {
          if (rateLimited(key, 10, 15 * 60 * 1000)) throw new Error("TooManyRequests")
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isValid) {
          if (rateLimited(key, 10, 15 * 60 * 1000)) throw new Error("TooManyRequests")
          return null
        }

        return { id: user.id, email: user.email, emailVerified: user.emailVerified }
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true

      const existing = await prisma.user.findUnique({ where: { email: user.email! } })
      if (existing) {
        if (!existing.oauthProvider) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { oauthProvider: "google", emailVerified: existing.emailVerified ?? new Date() },
          })
        }
        user.id = existing.id
        ;(user as { emailVerified?: Date | null }).emailVerified = existing.emailVerified ?? new Date()
      } else {
        const created = await prisma.user.create({
          data: {
            email: user.email!,
            password: null,
            oauthProvider: "google",
            emailVerified: new Date(),
          },
        })
        user.id = created.id
        ;(user as { emailVerified?: Date | null }).emailVerified = created.emailVerified
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.emailVerified = token.emailVerified ?? null
      return session
    },
  },
})
