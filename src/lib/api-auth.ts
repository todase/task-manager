import { auth } from "@/auth"

export async function getUserId(req: Request): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id
  return req.headers.get("x-api-user-id")
}
