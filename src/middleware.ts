import { NextRequest, NextResponse } from "next/server"

const PROTECTED = /^\/api\/(tasks|projects|tags)(\/|$)/

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

export function middleware(req: NextRequest) {
  // Always strip the internal header so external callers cannot spoof it
  const headers = new Headers(req.headers)
  headers.delete("x-api-user-id")

  if (!PROTECTED.test(req.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers } })
  }

  const apiKey = req.headers.get("x-api-key")
  if (!apiKey) return NextResponse.next({ request: { headers } })

  const expected = process.env.CLAUDE_API_KEY
  if (!expected || !safeEqual(apiKey, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = process.env.CLAUDE_API_USER_ID
  if (!userId) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  headers.set("x-api-user-id", userId)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/api/:path*"],
}
