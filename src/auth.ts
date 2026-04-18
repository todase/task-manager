import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isValid) return null

        return { id: user.id, email: user.email, emailVerified: user.emailVerified }
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.emailVerified = (user as any).emailVerified ?? null
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(session.user as any).emailVerified = token.emailVerified ?? null
      return session
    },
  },
})
