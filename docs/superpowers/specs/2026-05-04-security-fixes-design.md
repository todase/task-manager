# Security Fixes Design — 2026-05-04

## Scope

Three open security issues from the 2026-05-03 audit:

1. Login brute-force — credentials `authorize` callback has no rate limiting
2. bcrypt CPU-DoS — `reset-password` and `register` accept unbounded password length
3. `tags` POST returns 500 on duplicate name (Prisma P2002) instead of 409

---

## Issue 1 — Login brute-force

**File:** `src/auth.ts`

**Change:** Add IP-based rate limiting at the top of the `authorize` callback using the `request` parameter available in NextAuth v5 / `@auth/core`.

```ts
authorize: async (credentials, request) => {
  if (rateLimited(`login:${clientIp(request)}`, 10, 15 * 60 * 1000)) return null
  // ... existing logic unchanged
}
```

**Limit:** 10 attempts per 15 minutes per IP — matches the register endpoint.

**Error surface:** Returns `null` on rate limit. Client receives the same `CredentialsSignin` error as a wrong password — no distinguishing information leaked to attacker.

**Dependencies:** Existing `rateLimited` and `clientIp` from `src/lib/rateLimit.ts` — no new infrastructure.

**Tests:** Mock `request` with `x-forwarded-for` header. Assert 10th attempt returns a User, 11th returns null. Assert a request without the header still works (falls back to "unknown" key).

---

## Issue 2 — bcrypt CPU-DoS

**Files:** `src/app/api/reset-password/route.ts`, `src/app/api/register/route.ts`

**Change:** Add `password.length > 72` to the existing length validation in both files.

72 is bcrypt's hard limit — bcryptjs silently truncates anything longer, so extra bytes contribute zero security but consume full CPU. An attacker can craft requests with e.g. 1 MB passwords to exhaust server CPU.

**reset-password** — update existing guard:
```ts
if (!password || typeof password !== "string" || password.length < 8 || password.length > 72) {
  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}
```

**register** — update existing guard and error message:
```ts
if (!password || typeof password !== "string" || password.length < 8 || password.length > 72) {
  return NextResponse.json({ error: "Password must be 8–72 characters" }, { status: 400 })
}
```

**Tests:** Password of length 73 returns 400 in both endpoints.

---

## Issue 3 — tags POST 500 → 409

**File:** `src/app/api/tags/route.ts`

**Change:** Wrap `prisma.tag.create` in try-catch; detect `PrismaClientKnownRequestError` with `code === "P2002"` and return 409.

```ts
import { Prisma } from "@prisma/client"

try {
  const tag = await prisma.tag.create({ data: { name: name.trim(), color: color ?? "#6b7280", userId } })
  return NextResponse.json(tag)
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
  }
  throw e
}
```

`throw e` for any other error — Next.js returns 500 as before, nothing regresses.

**Tests:** Mock `prisma.tag.create` to throw a `PrismaClientKnownRequestError` with `code: "P2002"`. Assert response is 409 `{ error: "Tag already exists" }`. Assert a non-P2002 error still propagates as 500.

---

## Out of scope

- Showing "too many attempts" vs "wrong password" on the login page (UX improvement, separate task)
- Rate limiting for NextAuth Google OAuth flow (handled by Google's own infrastructure)
