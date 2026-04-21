import { NextRequest, NextResponse } from "next/server"

const PROTECTED = /^\/api\/(tasks|projects|tags)(\/|$)/

export function middleware(req: NextRequest) {
  if (!PROTECTED.test(req.nextUrl.pathname)) return NextResponse.next()

  const apiKey = req.headers.get("x-api-key")
  if (!apiKey) return NextResponse.next()

  const expected = process.env.CLAUDE_API_KEY
  if (!expected || apiKey !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = process.env.CLAUDE_API_USER_ID
  if (!userId) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const headers = new Headers(req.headers)
  headers.set("x-api-user-id", userId)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/api/:path*"],
}
