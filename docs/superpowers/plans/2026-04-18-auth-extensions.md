# Auth Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email verification on registration (Resend, soft), Google OAuth, and password reset to the existing NextAuth v5 JWT-based app.

**Architecture:** Keep JWT sessions and manual token management (no NextAuth Prisma Adapter). New Prisma models `EmailVerificationToken` and `PasswordResetToken` store time-limited tokens. Google users are created without a password; credentials users can't log in via Google.

**Tech Stack:** NextAuth v5 beta, Prisma 5, Resend, bcryptjs, Vitest, Tailwind CSS, Next.js 16 App Router

**Spec:** `docs/superpowers/specs/2026-04-18-auth-extensions-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `emailVerified`, `oauthProvider`, nullable `password` to User; add `EmailVerificationToken`, `PasswordResetToken` models |
| `src/lib/email.ts` | Create | Resend email utility — `sendVerificationEmail`, `sendPasswordResetEmail` |
| `src/lib/tokens.ts` | Create | Token CRUD — `createVerificationToken`, `createPasswordResetToken` |
| `src/lib/tokens.test.ts` | Create | Unit tests for token utilities |
| `src/auth.ts` | Modify | Add `emailVerified` to JWT/session; nullable password guard; Google provider + `signIn` callback |
| `src/app/api/register/route.ts` | Modify | After user creation: create token + send email |
| `src/app/api/register/route.test.ts` | Modify | Update mocks; add email/token assertions |
| `src/app/api/verify-email/route.ts` | Create | GET: validate token → set `emailVerified` → redirect |
| `src/app/api/verify-email/route.test.ts` | Create | Unit tests |
| `src/app/api/resend-verification/route.ts` | Create | POST (auth required): delete old tokens → create new → send email |
| `src/app/api/resend-verification/route.test.ts` | Create | Unit tests |
| `src/app/api/forgot-password/route.ts` | Create | POST: find user → create reset token → send email |
| `src/app/api/forgot-password/route.test.ts` | Create | Unit tests |
| `src/app/api/reset-password/route.ts` | Create | POST: validate token → hash password → update user |
| `src/app/api/reset-password/route.test.ts` | Create | Unit tests |
| `src/app/verify-email/page.tsx` | Create | Error states for expired/invalid verification links |
| `src/app/forgot-password/page.tsx` | Create | Form to request password reset email |
| `src/app/reset-password/page.tsx` | Create | Form to set new password (reads `?token=` from URL) |
| `src/components/EmailVerificationBanner.tsx` | Create | Orange banner with resend button; dismissed via `useState` |
| `src/app/tasks/page.tsx` | Modify | Add `session` to `useSession()` destructure; render `EmailVerificationBanner` |
| `src/app/login/page.tsx` | Modify | Add "Забыли пароль?" link + Google button |
| `src/app/register/page.tsx` | Modify | Add Google button; import `signIn` from `next-auth/react` |

---

### Task 0: Install Resend + environment setup + email utility

**Goal:** Add the Resend package, document required env vars, and create the email-sending utility that all auth features share.

**Files:**
- Create: `src/lib/email.ts`
- Create: `.env.example`

**Acceptance Criteria:**
- [ ] `resend` package installed
- [ ] `.env.example` documents all 5 new variables
- [ ] `src/lib/email.ts` exports `sendVerificationEmail(email, token)` and `sendPasswordResetEmail(email, token)`

**Verify:** `npx tsc --noEmit` → no errors in `src/lib/email.ts`

**Steps:**

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Create `.env.example`**

```bash
# existing
DATABASE_URL=postgresql://user:password@localhost:5432/taskmanager
AUTH_SECRET=generate-with-openssl-rand-base64-32

# new — add these to your .env file
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 3: Create `src/lib/email.ts`**

```typescript
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${token}`
  await resend.emails.send({
    from: "Task Manager <noreply@yourdomain.com>",
    to: email,
    subject: "Подтвердите ваш email",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Подтвердите ваш email</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5">Нажмите на кнопку ниже чтобы подтвердить адрес электронной почты. Ссылка действительна 24 часа.</p>
      <a href="${url}" style="background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block">Подтвердить email</a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Если вы не регистрировались — проигнорируйте это письмо.</p>
    </div>`,
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: "Task Manager <noreply@yourdomain.com>",
    to: email,
    subject: "Сброс пароля",
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Сброс пароля</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.5">Мы получили запрос на сброс пароля для вашего аккаунта. Ссылка действительна 1 час.</p>
      <a href="${url}" style="background:#6366f1;color:white;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block">Сбросить пароль</a>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Если вы не запрашивали сброс — проигнорируйте это письмо. Ваш пароль не изменится.</p>
    </div>`,
  })
}
```

- [ ] **Step 4: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts .env.example package.json package-lock.json
git commit -m "feat: install Resend and add email utility"
```

---

### Task 1: Database schema migration

**Goal:** Extend the Prisma schema with new fields on `User` and two new token models, then migrate the database.

**Files:**
- Modify: `prisma/schema.prisma`

**Acceptance Criteria:**
- [ ] `User.password` is nullable (`String?`)
- [ ] `User` has `emailVerified DateTime?` and `oauthProvider String?`
- [ ] `EmailVerificationToken` model exists with `token`, `userId` (FK → User, cascade delete), `expiresAt`
- [ ] `PasswordResetToken` model exists with `token`, `email`, `expiresAt` (no FK — privacy)
- [ ] Migration runs without error

**Verify:** `npx prisma migrate status` → all migrations applied

**Steps:**

- [ ] **Step 1: Update `prisma/schema.prisma`**

Replace the existing `User` model and add two new models. Keep all existing models (`Task`, `Subtask`, `Project`, `Tag`, `TaskTag`) unchanged.

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?
  emailVerified DateTime?
  oauthProvider String?
  tasks         Task[]
  projects      Project[]
  tags          Tag[]
  createdAt     DateTime  @default(now())

  verificationTokens EmailVerificationToken[]
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  token     String   @unique @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique @default(cuid())
  email     String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name auth-extensions
```

Expected output: `The following migration(s) have been applied: 20260418_auth_extensions`

- [ ] **Step 3: Regenerate Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add emailVerified, oauthProvider, token models to schema"
```

---

### Task 2: Token utilities with tests

**Goal:** Create `src/lib/tokens.ts` with two functions that create time-limited tokens, with full test coverage.

**Files:**
- Create: `src/lib/tokens.ts`
- Create: `src/lib/tokens.test.ts`

**Acceptance Criteria:**
- [ ] `createVerificationToken(userId)` deletes old tokens for user, creates new one expiring in 24h, returns token string
- [ ] `createPasswordResetToken(email)` deletes old tokens for email, creates new one expiring in 1h, returns token string
- [ ] All 4 tests pass

**Verify:** `npx vitest run src/lib/tokens.test.ts` → 4 passed

**Steps:**

- [ ] **Step 1: Write failing tests — `src/lib/tokens.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { createVerificationToken, createPasswordResetToken } from "./tokens"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("crypto", () => ({
  randomUUID: vi.fn().mockReturnValue("test-uuid"),
}))

const mockEvt = vi.mocked(prisma.emailVerificationToken)
const mockPrt = vi.mocked(prisma.passwordResetToken)

beforeEach(() => vi.clearAllMocks())

describe("createVerificationToken", () => {
  it("deletes existing tokens for user then creates new one", async () => {
    mockEvt.create.mockResolvedValue({} as never)
    await createVerificationToken("user-1")
    expect(mockEvt.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(mockEvt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ token: "test-uuid", userId: "user-1" }),
    })
  })

  it("returns token string and sets expiry ~24h ahead", async () => {
    const before = Date.now()
    mockEvt.create.mockResolvedValue({} as never)
    const token = await createVerificationToken("user-1")
    expect(token).toBe("test-uuid")
    const call = mockEvt.create.mock.calls[0][0]
    const expiry = (call.data as { expiresAt: Date }).expiresAt.getTime()
    expect(expiry).toBeGreaterThan(before + 23 * 60 * 60 * 1000)
    expect(expiry).toBeLessThan(before + 25 * 60 * 60 * 1000)
  })
})

describe("createPasswordResetToken", () => {
  it("deletes existing tokens for email then creates new one", async () => {
    mockPrt.create.mockResolvedValue({} as never)
    await createPasswordResetToken("user@example.com")
    expect(mockPrt.deleteMany).toHaveBeenCalledWith({ where: { email: "user@example.com" } })
    expect(mockPrt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ token: "test-uuid", email: "user@example.com" }),
    })
  })

  it("returns token string and sets expiry ~1h ahead", async () => {
    const before = Date.now()
    mockPrt.create.mockResolvedValue({} as never)
    const token = await createPasswordResetToken("user@example.com")
    expect(token).toBe("test-uuid")
    const call = mockPrt.create.mock.calls[0][0]
    const expiry = (call.data as { expiresAt: Date }).expiresAt.getTime()
    expect(expiry).toBeGreaterThan(before + 55 * 60 * 1000)
    expect(expiry).toBeLessThan(before + 65 * 60 * 1000)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/tokens.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Create `src/lib/tokens.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/tokens.test.ts
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/tokens.ts src/lib/tokens.test.ts
git commit -m "feat: add token creation utilities for email verification and password reset"
```

---

### Task 3: Update auth.ts — emailVerified in session + nullable password guard

**Goal:** Expose `emailVerified` in JWT and session so the banner can read it; guard credentials `authorize` against Google users (who have `password: null`).

**Files:**
- Modify: `src/auth.ts`

**Acceptance Criteria:**
- [ ] `authorize` returns `null` if `user.password` is null (Google user trying credentials login)
- [ ] `jwt` callback stores `emailVerified` on token
- [ ] `session` callback puts `emailVerified` on `session.user`

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Replace `src/auth.ts`**

```typescript
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
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to auth.ts)

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "feat: expose emailVerified in JWT session, guard credentials against null password"
```

---

### Task 4: Update registration route — create token + send email

**Goal:** After creating a user, generate a verification token and send the confirmation email. Email failures don't block registration.

**Files:**
- Modify: `src/app/api/register/route.ts`
- Modify: `src/app/api/register/route.test.ts`

**Acceptance Criteria:**
- [ ] On successful registration: `createVerificationToken` and `sendVerificationEmail` are called
- [ ] If Resend throws, registration still returns 200
- [ ] Existing email still returns 200 (enumeration protection)
- [ ] 5 tests pass

**Verify:** `npx vitest run src/app/api/register/route.test.ts` → 5 passed

**Steps:**

- [ ] **Step 1: Write failing tests — replace `src/app/api/register/route.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-pw") },
}))

vi.mock("@/lib/tokens", () => ({
  createVerificationToken: vi.fn().mockResolvedValue("verify-token-123"),
}))

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockUser = vi.mocked(prisma.user)

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/register", () => {
  it("returns 400 for invalid email", async () => {
    const res = await POST(jsonReq({ email: "notanemail", password: "secret123" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for password shorter than 8 chars", async () => {
    const res = await POST(jsonReq({ email: "a@b.com", password: "short" }))
    expect(res.status).toBe(400)
  })

  it("returns 200 when email already exists (prevents enumeration)", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "u1", email: "a@b.com" } as never)
    const res = await POST(jsonReq({ email: "a@b.com", password: "secret123" }))
    expect(res.status).toBe(200)
    expect(mockUser.create).not.toHaveBeenCalled()
  })

  it("creates user and sends verification email on success", async () => {
    const { sendVerificationEmail } = await import("@/lib/email")
    const { createVerificationToken } = await import("@/lib/tokens")
    mockUser.findUnique.mockResolvedValue(null as never)
    mockUser.create.mockResolvedValue({ id: "u2", email: "new@b.com" } as never)

    const res = await POST(jsonReq({ email: "new@b.com", password: "secret123" }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.email).toBe("new@b.com")
    expect(createVerificationToken).toHaveBeenCalledWith("u2")
    expect(sendVerificationEmail).toHaveBeenCalledWith("new@b.com", "verify-token-123")
  })

  it("returns 200 even when email sending throws", async () => {
    const { sendVerificationEmail } = await import("@/lib/email")
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error("SMTP error"))
    mockUser.findUnique.mockResolvedValue(null as never)
    mockUser.create.mockResolvedValue({ id: "u3", email: "fail@b.com" } as never)

    const res = await POST(jsonReq({ email: "fail@b.com", password: "secret123" }))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/app/api/register/route.test.ts
```

Expected: FAIL (mocked modules not called yet)

- [ ] **Step 3: Update `src/app/api/register/route.ts`**

```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { createVerificationToken } from "@/lib/tokens"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ email })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, password: hashed },
  })

  try {
    const token = await createVerificationToken(user.id)
    await sendVerificationEmail(email, token)
  } catch {
    // Email failure doesn't block registration — user can resend from banner
  }

  return NextResponse.json({ email: user.email })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/app/api/register/route.test.ts
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/app/api/register/route.ts src/app/api/register/route.test.ts
git commit -m "feat: send verification email after registration"
```

---

### Task 5: Email verification API routes with tests

**Goal:** Create `GET /api/verify-email` (validates token, marks user verified) and `POST /api/resend-verification` (creates fresh token and sends email).

**Files:**
- Create: `src/app/api/verify-email/route.ts`
- Create: `src/app/api/verify-email/route.test.ts`
- Create: `src/app/api/resend-verification/route.ts`
- Create: `src/app/api/resend-verification/route.test.ts`

**Acceptance Criteria:**
- [ ] Valid token → user.emailVerified set, token deleted, redirect to /tasks
- [ ] Expired token → token deleted, redirect to /verify-email?error=expired
- [ ] Unknown token → redirect to /verify-email?error=invalid
- [ ] Resend: requires auth (401 without session)
- [ ] Resend: creates new token and sends email, returns 200
- [ ] Resend: returns 200 silently if user already verified
- [ ] 7 tests pass total

**Verify:** `npx vitest run src/app/api/verify-email src/app/api/resend-verification` → 7 passed

**Steps:**

- [ ] **Step 1: Write failing tests — `src/app/api/verify-email/route.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { GET } from "./route"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}))

const mockEvt = vi.mocked(prisma.emailVerificationToken)
const mockUser = vi.mocked(prisma.user)

function makeReq(token?: string) {
  const url = token
    ? `http://localhost/api/verify-email?token=${token}`
    : "http://localhost/api/verify-email"
  return new NextRequest(url)
}

beforeEach(() => vi.clearAllMocks())

describe("GET /api/verify-email", () => {
  it("redirects to /verify-email?error=invalid when token not in DB", async () => {
    mockEvt.findUnique.mockResolvedValue(null as never)
    const res = await GET(makeReq("bad"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("error=invalid")
  })

  it("deletes expired token and redirects to /verify-email?error=expired", async () => {
    mockEvt.findUnique.mockResolvedValue({
      token: "t",
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    } as never)
    mockEvt.delete.mockResolvedValue({} as never)
    const res = await GET(makeReq("t"))
    expect(res.headers.get("location")).toContain("error=expired")
    expect(mockEvt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
    expect(mockUser.update).not.toHaveBeenCalled()
  })

  it("sets emailVerified, deletes token, redirects to /tasks on valid token", async () => {
    mockEvt.findUnique.mockResolvedValue({
      token: "t",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
    } as never)
    mockUser.update.mockResolvedValue({} as never)
    mockEvt.delete.mockResolvedValue({} as never)
    const res = await GET(makeReq("t"))
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: expect.any(Date) },
    })
    expect(mockEvt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
    expect(res.headers.get("location")).toContain("/tasks")
  })
})
```

- [ ] **Step 2: Write failing tests — `src/app/api/resend-verification/route.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock("@/lib/tokens", () => ({
  createVerificationToken: vi.fn().mockResolvedValue("new-token"),
}))
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockAuth = vi.mocked(auth)
const mockUser = vi.mocked(prisma.user)

function session(id = "u1") {
  return { user: { id } }
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/resend-verification", () => {
  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("returns 200 silently if user already verified", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: new Date(),
    } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    const { createVerificationToken } = await import("@/lib/tokens")
    expect(createVerificationToken).not.toHaveBeenCalled()
  })

  it("creates new token and sends email for unverified user", async () => {
    const { sendVerificationEmail } = await import("@/lib/email")
    const { createVerificationToken } = await import("@/lib/tokens")
    mockAuth.mockResolvedValue(session() as never)
    mockUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      emailVerified: null,
    } as never)
    const res = await POST()
    expect(res.status).toBe(200)
    expect(createVerificationToken).toHaveBeenCalledWith("u1")
    expect(sendVerificationEmail).toHaveBeenCalledWith("a@b.com", "new-token")
  })

  it("returns 200 even when user not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockUser.findUnique.mockResolvedValue(null as never)
    const res = await POST()
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npx vitest run src/app/api/verify-email src/app/api/resend-verification
```

Expected: FAIL (modules not found)

- [ ] **Step 4: Create `src/app/api/verify-email/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url))
  }

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } })
  if (!record) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url))
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { token } })
    return NextResponse.redirect(new URL("/verify-email?error=expired", req.url))
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() },
  })
  await prisma.emailVerificationToken.delete({ where: { token } })

  return NextResponse.redirect(new URL("/tasks", req.url))
}
```

- [ ] **Step 5: Create `src/app/api/resend-verification/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createVerificationToken } from "@/lib/tokens"
import { sendVerificationEmail } from "@/lib/email"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true })
  }

  const token = await createVerificationToken(user.id)
  await sendVerificationEmail(user.email, token)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npx vitest run src/app/api/verify-email src/app/api/resend-verification
```

Expected: 7 passed

- [ ] **Step 7: Commit**

```bash
git add src/app/api/verify-email/ src/app/api/resend-verification/
git commit -m "feat: add verify-email and resend-verification API routes"
```

---

### Task 6: Email verification UI (page + banner + tasks page)

**Goal:** Create the `/verify-email` error page, the `EmailVerificationBanner` component, and wire the banner into the tasks page.

**Files:**
- Create: `src/app/verify-email/page.tsx`
- Create: `src/components/EmailVerificationBanner.tsx`
- Modify: `src/app/tasks/page.tsx`

**Acceptance Criteria:**
- [ ] `/verify-email?error=expired` shows "Ссылка устарела" with link to /login
- [ ] `/verify-email?error=invalid` shows "Ссылка недействительна"
- [ ] Banner renders only when `emailVerified` is falsy
- [ ] Banner "Отправить повторно" calls `POST /api/resend-verification`
- [ ] Banner dismiss (✕) hides it via state only (reappears on next login)
- [ ] Tasks page shows banner for unverified users

**Verify:** Start dev server (`npm run dev`), register a new user, confirm banner appears at top of /tasks. Click "Отправить повторно" — check Resend dashboard for email.

**Steps:**

- [ ] **Step 1: Create `src/app/verify-email/page.tsx`**

```tsx
import Link from "next/link"

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <VerifyEmailContent searchParams={searchParams} />
    </main>
  )
}

async function VerifyEmailContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  if (error === "expired") {
    return (
      <div className="flex flex-col gap-4 w-80 text-center">
        <h1 className="text-2xl font-bold">Ссылка устарела</h1>
        <p className="text-gray-500">
          Ссылка для подтверждения истекла. Войдите в аккаунт и запросите новое письмо.
        </p>
        <Link href="/login" className="text-blue-500 hover:underline">
          Войти
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-80 text-center">
      <h1 className="text-2xl font-bold">Ссылка недействительна</h1>
      <p className="text-gray-500">Ссылка для подтверждения недействительна.</p>
      <Link href="/login" className="text-blue-500 hover:underline">
        Войти
      </Link>
    </div>
  )
}
```

> **Note:** `searchParams` is a Promise in Next.js 16. Always `await` it — do not use `.error` synchronously.

- [ ] **Step 2: Create `src/components/EmailVerificationBanner.tsx`**

```tsx
"use client"

import { useState } from "react"

interface Props {
  email: string | null | undefined
  emailVerified: Date | null | undefined
}

export function EmailVerificationBanner({ email, emailVerified }: Props) {
  const [hidden, setHidden] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (emailVerified || hidden) return null

  async function handleResend() {
    setSending(true)
    await fetch("/api/resend-verification", { method: "POST" })
    setSending(false)
    setSent(true)
  }

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-orange-900">
        <span>⚠️</span>
        <span>
          Подтвердите ваш email <strong>{email}</strong>. Проверьте почту или{" "}
          {sent ? (
            <span className="text-orange-700 font-medium">письмо отправлено!</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-indigo-600 underline disabled:opacity-50 cursor-pointer"
            >
              {sending ? "Отправляем..." : "отправьте повторно"}
            </button>
          )}
        </span>
      </div>
      <button
        onClick={() => setHidden(true)}
        className="text-orange-300 hover:text-orange-500 ml-4 text-lg leading-none"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/app/tasks/page.tsx`**

Change line 5 (the `useSession` destructure) from:
```tsx
const { status } = useSession()
```
to:
```tsx
const { data: session, status } = useSession()
```

Add import at the top of the file:
```tsx
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner"
```

Wrap the return statement (currently starting at line 122 with `<DndContext ...>`) in a fragment and prepend the banner:
```tsx
return (
  <>
    <EmailVerificationBanner
      email={session?.user?.email}
      emailVerified={(session?.user as any)?.emailVerified}
    />
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* existing JSX unchanged */}
    </DndContext>
  </>
)
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

1. Register a new user at http://localhost:3000/register
2. Log in — confirm orange banner appears at the top of /tasks
3. Click "отправьте повторно" — button shows "Отправляем..." then "письмо отправлено!"
4. Click ✕ — banner disappears
5. Refresh — banner reappears (state reset on reload)
6. Check Resend dashboard (https://resend.com) — email should appear in logs

- [ ] **Step 5: Commit**

```bash
git add src/app/verify-email/ src/components/EmailVerificationBanner.tsx src/app/tasks/page.tsx
git commit -m "feat: add email verification UI — page, banner, tasks page integration"
```

---

### Task 7: Password reset API routes with tests

**Goal:** Create `POST /api/forgot-password` (creates reset token, sends email) and `POST /api/reset-password` (validates token, updates password).

**Files:**
- Create: `src/app/api/forgot-password/route.ts`
- Create: `src/app/api/forgot-password/route.test.ts`
- Create: `src/app/api/reset-password/route.ts`
- Create: `src/app/api/reset-password/route.test.ts`

**Acceptance Criteria:**
- [ ] `forgot-password`: unknown email → 200, no token created
- [ ] `forgot-password`: Google user → 200, no token created
- [ ] `forgot-password`: valid credentials user → token created, email sent
- [ ] `reset-password`: invalid/expired token → 400
- [ ] `reset-password`: valid token → password hashed and updated, token deleted
- [ ] `reset-password`: password < 8 chars → 400
- [ ] 7 tests pass total

**Verify:** `npx vitest run src/app/api/forgot-password src/app/api/reset-password` → 7 passed

**Steps:**

- [ ] **Step 1: Write failing tests — `src/app/api/forgot-password/route.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))
vi.mock("@/lib/tokens", () => ({
  createPasswordResetToken: vi.fn().mockResolvedValue("reset-token-123"),
}))
vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockUser = vi.mocked(prisma.user)

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/forgot-password", () => {
  it("returns 200 when email not found (prevents enumeration)", async () => {
    mockUser.findUnique.mockResolvedValue(null as never)
    const res = await POST(jsonReq({ email: "ghost@b.com" }))
    expect(res.status).toBe(200)
    const { createPasswordResetToken } = await import("@/lib/tokens")
    expect(createPasswordResetToken).not.toHaveBeenCalled()
  })

  it("returns 200 without sending email for Google user", async () => {
    mockUser.findUnique.mockResolvedValue({
      id: "u1",
      email: "g@b.com",
      oauthProvider: "google",
    } as never)
    const res = await POST(jsonReq({ email: "g@b.com" }))
    expect(res.status).toBe(200)
    const { createPasswordResetToken } = await import("@/lib/tokens")
    expect(createPasswordResetToken).not.toHaveBeenCalled()
  })

  it("creates reset token and sends email for credentials user", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email")
    const { createPasswordResetToken } = await import("@/lib/tokens")
    mockUser.findUnique.mockResolvedValue({
      id: "u2",
      email: "user@b.com",
      oauthProvider: null,
    } as never)
    const res = await POST(jsonReq({ email: "user@b.com" }))
    expect(res.status).toBe(200)
    expect(createPasswordResetToken).toHaveBeenCalledWith("user@b.com")
    expect(sendPasswordResetEmail).toHaveBeenCalledWith("user@b.com", "reset-token-123")
  })
})
```

- [ ] **Step 2: Write failing tests — `src/app/api/reset-password/route.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"
import { POST } from "./route"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: { update: vi.fn() },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("new-hashed-pw") },
}))

const mockPrt = vi.mocked(prisma.passwordResetToken)
const mockUser = vi.mocked(prisma.user)

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

describe("POST /api/reset-password", () => {
  it("returns 400 for password shorter than 8 chars", async () => {
    const res = await POST(jsonReq({ token: "t", password: "short" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for unknown token", async () => {
    mockPrt.findUnique.mockResolvedValue(null as never)
    const res = await POST(jsonReq({ token: "bad", password: "newpassword" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 and deletes expired token", async () => {
    mockPrt.findUnique.mockResolvedValue({
      token: "t",
      email: "a@b.com",
      expiresAt: new Date(Date.now() - 1000),
    } as never)
    mockPrt.delete.mockResolvedValue({} as never)
    const res = await POST(jsonReq({ token: "t", password: "newpassword" }))
    expect(res.status).toBe(400)
    expect(mockPrt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
  })

  it("updates password and deletes token on valid request", async () => {
    mockPrt.findUnique.mockResolvedValue({
      token: "t",
      email: "a@b.com",
      expiresAt: new Date(Date.now() + 60_000),
    } as never)
    mockUser.update.mockResolvedValue({} as never)
    mockPrt.delete.mockResolvedValue({} as never)
    const res = await POST(jsonReq({ token: "t", password: "newpassword" }))
    expect(res.status).toBe(200)
    expect(mockUser.update).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
      data: { password: "new-hashed-pw" },
    })
    expect(mockPrt.delete).toHaveBeenCalledWith({ where: { token: "t" } })
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npx vitest run src/app/api/forgot-password src/app/api/reset-password
```

Expected: FAIL (modules not found)

- [ ] **Step 4: Create `src/app/api/forgot-password/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createPasswordResetToken } from "@/lib/tokens"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.oauthProvider === "google") {
    return NextResponse.json({ ok: true })
  }

  const token = await createPasswordResetToken(email)
  await sendPasswordResetEmail(email, token)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `src/app/api/reset-password/route.ts`**

```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { token, password } = await req.json()

  if (!token || !password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!record) {
    return NextResponse.json({ error: "Token invalid or expired" }, { status: 400 })
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } })
    return NextResponse.json({ error: "Token invalid or expired" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({
    where: { email: record.email },
    data: { password: hashed },
  })
  await prisma.passwordResetToken.delete({ where: { token } })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npx vitest run src/app/api/forgot-password src/app/api/reset-password
```

Expected: 7 passed

- [ ] **Step 7: Commit**

```bash
git add src/app/api/forgot-password/ src/app/api/reset-password/
git commit -m "feat: add forgot-password and reset-password API routes"
```

---

### Task 8: Password reset pages

**Goal:** Create the `/forgot-password` form page and `/reset-password` page with password form and success state.

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/reset-password/page.tsx`

**Acceptance Criteria:**
- [ ] `/forgot-password`: submitting any email always shows success message (no enumeration)
- [ ] `/reset-password` without `?token=` shows "Ссылка недействительна"
- [ ] `/reset-password?token=xxx`: password mismatch shows error, success shows confirmation
- [ ] Password < 8 chars blocked client-side before fetch

**Verify:** `npm run dev` → manually test both pages end-to-end

**Steps:**

- [ ] **Step 1: Create `src/app/forgot-password/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col gap-4 w-80 text-center">
          <h1 className="text-2xl font-bold">Письмо отправлено</h1>
          <p className="text-gray-500">
            Если аккаунт с этим email существует, мы отправили ссылку для сброса пароля.
          </p>
          <Link href="/login" className="text-blue-500 hover:underline">
            Вернуться ко входу
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Сброс пароля</h1>
        <p className="text-sm text-gray-500">
          Введите email — пришлём ссылку для сброса пароля.
        </p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Отправить письмо
        </button>
        <Link href="/login" className="text-sm text-center text-blue-500 hover:underline">
          ← Вернуться ко входу
        </Link>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Create `src/app/reset-password/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col gap-4 w-80 text-center">
          <h1 className="text-2xl font-bold">Ссылка недействительна</h1>
          <p className="text-gray-500">Запросите новую ссылку для сброса пароля.</p>
        </div>
      </main>
    )
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col gap-4 w-80 text-center">
          <h1 className="text-2xl font-bold">Пароль изменён</h1>
          <p className="text-gray-500">Теперь вы можете войти с новым паролем.</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-500 text-white p-2 rounded"
          >
            Войти
          </button>
        </div>
      </main>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Пароли не совпадают")
      return
    }
    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов")
      return
    }
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Ссылка недействительна или устарела")
      return
    }
    setDone(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Новый пароль</h1>
        <p className="text-sm text-gray-500">Минимум 8 символов.</p>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input
          type="password"
          placeholder="Новый пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Повторите пароль"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Сохранить пароль
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Manual E2E test**

```bash
npm run dev
```

1. Go to http://localhost:3000/forgot-password
2. Enter a registered email → click "Отправить письмо" → success message appears
3. Open Resend dashboard → find the reset email → copy the link
4. Open the reset link → fill in new password (≥8 chars) → confirm → "Пароль изменён"
5. Click "Войти" → log in with new password → succeeds
6. Test: enter mismatching passwords → "Пароли не совпадают" error shown
7. Go to http://localhost:3000/reset-password (no token) → "Ссылка недействительна"

- [ ] **Step 4: Commit**

```bash
git add src/app/forgot-password/ src/app/reset-password/
git commit -m "feat: add forgot-password and reset-password pages"
```

---

### Task 9: Google OAuth — auth + UI

**Goal:** Add Google provider to NextAuth, handle user creation/linking in `signIn` callback, and add Google buttons to login and register pages.

**Files:**
- Modify: `src/auth.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/register/page.tsx`

**Acceptance Criteria:**
- [ ] Google sign-in button on login and register pages calls `signIn("google", { callbackUrl: "/tasks" })`
- [ ] New Google user: created with `password: null`, `oauthProvider: "google"`, `emailVerified: now()`
- [ ] Existing credentials user with same email: `oauthProvider` updated to "google", login succeeds
- [ ] "Забыли пароль?" link on login page points to `/forgot-password`
- [ ] Credentials user with `password: null` cannot log in (guard from Task 3 already handles this)

**Verify:**
1. `npm run dev` → click "Войти через Google" → Google OAuth flow → lands on /tasks, no verification banner (Google users are pre-verified)
2. Check DB: `npx prisma studio` → User table → new Google user has `oauthProvider: "google"`, `emailVerified` set

**Steps:**

- [ ] **Step 1: Set up Google Cloud credentials (one-time)**

1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Navigate to APIs & Services → Credentials
4. Click "Create Credentials" → OAuth 2.0 Client IDs
5. Application type: Web application
6. Add Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret into your `.env` file:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   ```

- [ ] **Step 2: Replace `src/auth.ts` with Google provider + signIn callback**

```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(user as any).emailVerified = existing.emailVerified ?? new Date()
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(user as any).emailVerified = created.emailVerified
      }
      return true
    },
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
```

- [ ] **Step 3: Replace `src/app/login/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (!res?.ok) {
      setError("Неверный email или пароль")
      return
    }

    router.push("/tasks")
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Вход</h1>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <div className="text-right -mt-2">
          <Link href="/forgot-password" className="text-sm text-blue-500 hover:underline">
            Забыли пароль?
          </Link>
        </div>
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Войти
        </button>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">или</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/tasks" })}
          className="flex items-center justify-center gap-2 border border-gray-300 p-2 rounded hover:bg-gray-50"
        >
          <GoogleIcon />
          Войти через Google
        </button>
        <p className="text-sm text-center text-gray-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="text-blue-500 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  )
}
```

- [ ] **Step 4: Replace `src/app/register/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error)
      return
    }

    router.push("/login")
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <h1 className="text-2xl font-bold">Регистрация</h1>
        {error && <p className="text-red-500">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Зарегистрироваться
        </button>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">или</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/tasks" })}
          className="flex items-center justify-center gap-2 border border-gray-300 p-2 rounded hover:bg-gray-50"
        >
          <GoogleIcon />
          Зарегистрироваться через Google
        </button>
        <p className="text-sm text-center text-gray-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-blue-500 hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  )
}
```

- [ ] **Step 5: E2E test**

```bash
npm run dev
```

1. Go to http://localhost:3000/login → click "Войти через Google"
2. Complete Google OAuth flow → lands on /tasks
3. Confirm no verification banner (Google users are pre-verified)
4. Open Prisma Studio: `npx prisma studio` → Users table → new user has `oauthProvider: "google"`, `emailVerified` set
5. Log out → try logging in with same email via email/password → should fail ("Неверный email или пароль")
6. Confirm "Забыли пароль?" link appears on login page and navigates to /forgot-password

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all previously passing tests still pass

- [ ] **Step 7: Commit**

```bash
git add src/auth.ts src/app/login/page.tsx src/app/register/page.tsx
git commit -m "feat: add Google OAuth with user creation/linking and UI buttons"
```

---

## Self-Review Checklist

- [x] Spec coverage: all features from spec covered (email verification ✓, Google OAuth ✓, password reset ✓)
- [x] No TBDs or placeholders — all steps have actual code
- [x] Type consistency: `createVerificationToken` used in Task 2, 4, 5 with same signature; `sendVerificationEmail`/`sendPasswordResetEmail` consistent between Task 0 and all callers
- [x] `searchParams` in Next.js 16 is a Promise — awaited in Task 6 (`verify-email/page.tsx`)
- [x] `PasswordResetToken` has no FK to User (privacy design) — consistent throughout
- [x] `password` nullable in schema (Task 1) referenced correctly in auth.ts guard (Task 3, 9)
- [x] Google `signIn` callback mutates `user.id` so it flows into JWT — consistent with how credentials `authorize` returns `id`
