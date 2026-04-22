import { auth } from "@/auth"

export async function getUserId(req: Request): Promise<string | null> {
  // Fast path: middleware validated the API key and injected this header
  const injected = req.headers.get("x-api-user-id")
  if (injected) return injected
  const session = await auth()
  return session?.user?.id ?? null
}
