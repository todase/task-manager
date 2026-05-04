# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three open security gaps: login brute-force, bcrypt CPU-DoS, and tags duplicate-name 500.

**Architecture:** All three fixes are self-contained changes to existing files — no new modules. Task 1 adds rate limiting to the NextAuth credentials `authorize` callback. Task 2 adds a max-length guard to two existing password validators. Task 3 wraps one Prisma call in try-catch with a P2002 guard.

**Tech Stack:** Next.js 16, NextAuth v5 (`@auth/core`), Prisma, bcryptjs, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/auth.ts` | Import `rateLimited`/`clientIp`; add rate-limit check in `authorize` |
| `src/auth.test.ts` | New — tests for the `authorize` callback |
| `src/app/api/reset-password/route.ts` | Add `password.length > 72` to validation guard |
| `src/app/api/reset-password/route.test.ts` | Add one test: 73-char password → 400 |
| `src/app/api/register/route.ts` | Add `password.length > 72` to validation guard + update error message |
| `src/app/api/register/route.test.ts` | Add one test: 73-char password → 400 |
| `src/app/api/tags/route.ts` | Wrap `prisma.tag.create` in try-catch; P2002 → 409 |
| `src/app/api/tags/route.test.ts` | Add two tests: P2002 → 409, other error → rethrows |

---

## Task 1: Login brute-force rate limiting

**Goal:** Add IP-based rate limiting to the NextAuth credentials `authorize` callback and add tests.

**Files:**
- Modify: `src/auth.ts`
- Create: `src/auth.test.ts`

**Acceptance Criteria:**
- [ ] 10th login attempt from same IP returns a user (succeeds)
- [ ] 11th login attempt from same IP returns null (blocked)
- [ ] Request without `x-forwarded-for` header falls back to key `login:unknown` and still works
- [ ] All existing auth behaviour is unchanged (bad password returns null, good password returns user)

**Verify:** `npx vitest run src/auth.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write the failing tests**

Create `src/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
// vi.mock calls are hoisted by Vitest before all imports, so mocks are active
// when @/auth is imported below — NextAuth constructor fires and sets capturedAuthorize
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimited, clientIp } from "@/lib/rateLimit"
import "@/auth"

// Capture the Credentials provider config so we can call authorize directly
let capturedAuthorize: (
  credentials: Record<string, string>,
  request: Request
) => Promise<unknown>

vi.mock("next-auth", () => ({
  default: vi.fn((config: { providers: Array<{ authorize?: unknown }> }) => {
    // providers[0] is Google, providers[1] is Credentials
    capturedAuthorize = config.providers[1].authorize as typeof capturedAuthorize
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  }),
}))

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", type: "oauth" })),
}))

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((cfg: { authorize: unknown }) => ({
    id: "credentials",
    type: "credentials",
    authorize: cfg.authorize,
  })),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}))

vi.mock("@/lib/rateLimit", () => ({
  rateLimited: vi.fn(() => false),
  clientIp: vi.fn(() => "1.2.3.4"),
}))

const mockUser = vi.mocked(prisma.user)
const mockCompare = vi.mocked(bcrypt.compare)
const mockRateLimited = vi.mocked(rateLimited)
const mockClientIp = vi.mocked(clientIp)

function makeRequest(ip?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (ip) headers["x-forwarded-for"] = ip
  return new Request("http://localhost/api/auth/callback/credentials", { headers })
}

const validUser = {
  id: "u1",
  email: "a@b.com",
  password: "hashed",
  emailVerified: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe("authorize — rate limiting", () => {
  it("allows the 10th attempt (rate limit not yet hit)", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(validUser as never)
    mockCompare.mockResolvedValue(true as never)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "secret" },
      makeRequest("1.2.3.4")
    )
    expect(result).not.toBeNull()
  })

  it("blocks when rate limit is exceeded (returns null)", async () => {
    mockRateLimited.mockReturnValue(true)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "secret" },
      makeRequest("1.2.3.4")
    )
    expect(result).toBeNull()
    // DB must NOT be queried when rate limited
    expect(mockUser.findUnique).not.toHaveBeenCalled()
  })

  it("uses clientIp to build the rate-limit key", async () => {
    mockRateLimited.mockReturnValue(false)
    mockClientIp.mockReturnValue("5.6.7.8")
    mockUser.findUnique.mockResolvedValue(null as never)

    await capturedAuthorize({ email: "x@y.com", password: "pw" }, makeRequest("5.6.7.8"))

    expect(mockRateLimited).toHaveBeenCalledWith("login:5.6.7.8", 10, 15 * 60 * 1000)
  })

  it("falls back to 'unknown' key when no x-forwarded-for header", async () => {
    mockClientIp.mockReturnValue("unknown")
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(null as never)

    await capturedAuthorize({ email: "x@y.com", password: "pw" }, makeRequest())

    expect(mockRateLimited).toHaveBeenCalledWith("login:unknown", 10, 15 * 60 * 1000)
  })
})

describe("authorize — existing behaviour", () => {
  it("returns null when user not found", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(null as never)

    const result = await capturedAuthorize(
      { email: "no@b.com", password: "pw" },
      makeRequest()
    )
    expect(result).toBeNull()
  })

  it("returns null when password does not match", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(validUser as never)
    mockCompare.mockResolvedValue(false as never)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "wrong" },
      makeRequest()
    )
    expect(result).toBeNull()
  })

  it("returns user object on valid credentials", async () => {
    mockRateLimited.mockReturnValue(false)
    mockUser.findUnique.mockResolvedValue(validUser as never)
    mockCompare.mockResolvedValue(true as never)

    const result = await capturedAuthorize(
      { email: "a@b.com", password: "secret" },
      makeRequest()
    ) as { id: string; email: string }

    expect(result?.id).toBe("u1")
    expect(result?.email).toBe("a@b.com")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/auth.test.ts
```

Expected: errors because `rateLimited` is not called in `authorize` yet.

- [ ] **Step 3: Update `src/auth.ts`**

Add import and rate-limit check:

```ts
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
        if (rateLimited(`login:${clientIp(request)}`, 10, 15 * 60 * 1000)) return null

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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/auth.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/auth.ts src/auth.test.ts
git commit -m "security: rate-limit login by IP in NextAuth credentials authorize"
```

---

## Task 2: bcrypt CPU-DoS password length cap

**Goal:** Add `password.length > 72` guard to `reset-password` and `register` routes; add one test each.

**Files:**
- Modify: `src/app/api/reset-password/route.ts`
- Modify: `src/app/api/reset-password/route.test.ts`
- Modify: `src/app/api/register/route.ts`
- Modify: `src/app/api/register/route.test.ts`

**Acceptance Criteria:**
- [ ] `POST /api/reset-password` with a 73-character password returns 400
- [ ] `POST /api/register` with a 73-character password returns 400
- [ ] All existing tests in both files still pass

**Verify:** `npx vitest run src/app/api/reset-password/route.test.ts src/app/api/register/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Add failing test to `reset-password/route.test.ts`**

After the existing `"returns 400 for password shorter than 8 chars"` test, add:

```ts
it("returns 400 for password longer than 72 chars", async () => {
  const res = await POST(jsonReq({ token: "t", password: "a".repeat(73) }))
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Add failing test to `register/route.test.ts`**

After the existing `"returns 400 for password shorter than 8 chars"` test, add:

```ts
it("returns 400 for password longer than 72 chars", async () => {
  const res = await POST(jsonReq({ email: "a@b.com", password: "a".repeat(73) }))
  expect(res.status).toBe(400)
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/reset-password/route.test.ts src/app/api/register/route.test.ts
```

Expected: both new tests fail (73-char password currently returns 200).

- [ ] **Step 4: Update `src/app/api/reset-password/route.ts`**

Change line 13 from:
```ts
  if (!token || !password || typeof password !== "string" || password.length < 8) {
```
to:
```ts
  if (!token || !password || typeof password !== "string" || password.length < 8 || password.length > 72) {
```

- [ ] **Step 5: Update `src/app/api/register/route.ts`**

Change lines 18-21 from:
```ts
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }
```
to:
```ts
  if (!password || typeof password !== "string" || password.length < 8 || password.length > 72) {
    return NextResponse.json(
      { error: "Password must be 8–72 characters" },
      { status: 400 }
    )
  }
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx vitest run src/app/api/reset-password/route.test.ts src/app/api/register/route.test.ts
```

Expected: all tests pass including the two new ones.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/reset-password/route.ts src/app/api/reset-password/route.test.ts \
        src/app/api/register/route.ts src/app/api/register/route.test.ts
git commit -m "security: cap password length at 72 chars to prevent bcrypt CPU-DoS"
```

---

## Task 3: tags POST P2002 → 409

**Goal:** Catch Prisma unique-constraint error on `tag.create` and return 409 instead of 500; add tests.

**Files:**
- Modify: `src/app/api/tags/route.ts`
- Modify: `src/app/api/tags/route.test.ts`

**Acceptance Criteria:**
- [ ] `POST /api/tags` with a duplicate name returns 409 `{ error: "Tag already exists" }`
- [ ] `POST /api/tags` when `prisma.tag.create` throws a non-P2002 error still throws (Next.js → 500)
- [ ] All existing tests in the file still pass

**Verify:** `npx vitest run src/app/api/tags/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Add failing tests to `tags/route.test.ts`**

Add the following import and two test cases at the end of the `describe("POST /api/tags", ...)` block:

Add at the top of the file alongside other imports:
```ts
import { Prisma } from "@prisma/client"
```

Add inside `describe("POST /api/tags", () => { ... })` after the existing tests:
```ts
it("returns 409 when tag name already exists (P2002)", async () => {
  mockAuth.mockResolvedValue(session() as never)
  const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
    code: "P2002",
    clientVersion: "0.0.0",
  })
  mockTag.create.mockRejectedValue(p2002)

  const res = await POST(jsonReq({ name: "duplicate" }))
  const body = await res.json()

  expect(res.status).toBe(409)
  expect(body).toEqual({ error: "Tag already exists" })
})

it("rethrows non-P2002 prisma errors", async () => {
  mockAuth.mockResolvedValue(session() as never)
  const dbError = new Prisma.PrismaClientKnownRequestError("Connection lost", {
    code: "P1001",
    clientVersion: "0.0.0",
  })
  mockTag.create.mockRejectedValue(dbError)

  await expect(POST(jsonReq({ name: "anytag" }))).rejects.toThrow("Connection lost")
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/tags/route.test.ts
```

Expected: both new tests fail (P2002 currently propagates as unhandled rejection).

- [ ] **Step 3: Update `src/app/api/tags/route.ts`**

Full updated file:

```ts
import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(tags)
}

export async function POST(req: Request) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, color } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  try {
    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color ?? "#6b7280",
        userId,
      },
    })
    return NextResponse.json(tag)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
    }
    throw e
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/app/api/tags/route.test.ts
```

Expected: all tests pass including the two new ones.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/tags/route.ts src/app/api/tags/route.test.ts
git commit -m "fix: return 409 on duplicate tag name (P2002) instead of 500"
```
