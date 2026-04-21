# Claude API Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow Claude to perform full CRUD on tasks, projects, and tags via the production Vercel API using an API key, and package that capability as a shareable Claude Code plugin.

**Architecture:** A Next.js middleware validates `X-API-Key` requests and injects `x-api-user-id` into the forwarded request headers. A shared helper `getUserId(req)` in each route handler checks the NextAuth session first, then falls back to the injected header — keeping existing UI auth completely unchanged. A standalone `task-manager-skill` plugin repo contains the skill file and plugin manifest.

**Tech Stack:** Next.js App Router, NextAuth, TypeScript, Vitest, Claude Code plugin format

---

## File Map

### New files
- `src/middleware.ts` — validates `X-API-Key`, injects `x-api-user-id`, scopes to protected routes
- `src/lib/api-auth.ts` — `getUserId(req)` helper used by all route handlers
- `src/lib/api-auth.test.ts` — unit tests for the helper
- `task-manager-skill/.claude-plugin/plugin.json` — plugin manifest
- `task-manager-skill/skills/task-manager.md` — the Claude skill with full API reference

### Modified files (9 route handlers)
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/[id]/route.ts`
- `src/app/api/tasks/[id]/subtasks/route.ts`
- `src/app/api/tasks/[id]/subtasks/[subtaskId]/route.ts`
- `src/app/api/tasks/reorder/route.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/tags/route.ts`
- `src/app/api/tags/[id]/route.ts`

---

## Task 1: API auth helper and middleware

**Goal:** Create `getUserId(req)` helper and `src/middleware.ts` so API key requests pass through to route handlers with userId injected.

**Files:**
- Create: `src/lib/api-auth.ts`
- Create: `src/lib/api-auth.test.ts`
- Create: `src/middleware.ts`

**Acceptance Criteria:**
- [ ] `getUserId` returns `session.user.id` when NextAuth session is present
- [ ] `getUserId` returns the `x-api-user-id` header value when session is null
- [ ] `getUserId` returns `null` when both are absent
- [ ] Middleware rejects requests with wrong API key with 401
- [ ] Middleware forwards requests with correct API key, injecting `x-api-user-id`
- [ ] Middleware is a no-op for requests without `X-API-Key` header
- [ ] Middleware does not apply to `/api/auth/*` routes
- [ ] All tests pass: `npx vitest run src/lib/api-auth.test.ts`

**Verify:** `npx vitest run src/lib/api-auth.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Write failing tests for `getUserId`**

Create `src/lib/api-auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { getUserId } from "./api-auth"

vi.mock("@/auth", () => ({ auth: vi.fn() }))

const mockAuth = vi.mocked(auth)

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/tasks", { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getUserId", () => {
  it("returns session userId when session exists", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } } as never)
    const result = await getUserId(req())
    expect(result).toBe("u1")
  })

  it("returns x-api-user-id header when session is null", async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await getUserId(req({ "x-api-user-id": "u2" }))
    expect(result).toBe("u2")
  })

  it("returns null when both session and header are absent", async () => {
    mockAuth.mockResolvedValue(null as never)
    const result = await getUserId(req())
    expect(result).toBeNull()
  })

  it("prefers session over header", async () => {
    mockAuth.mockResolvedValue({ user: { id: "session-user" } } as never)
    const result = await getUserId(req({ "x-api-user-id": "header-user" }))
    expect(result).toBe("session-user")
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/api-auth.test.ts
```

Expected: FAIL — `getUserId` not found

- [ ] **Step 3: Implement `src/lib/api-auth.ts`**

```typescript
import { auth } from "@/auth"

export async function getUserId(req: Request): Promise<string | null> {
  const session = await auth()
  if (session?.user?.id) return session.user.id
  return req.headers.get("x-api-user-id")
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/api-auth.test.ts
```

Expected: 4 tests pass

- [ ] **Step 5: Implement `src/middleware.ts`**

```typescript
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
```

- [ ] **Step 6: Run full test suite to confirm nothing broken**

```bash
npx vitest run
```

Expected: all previously passing tests still pass

- [ ] **Step 7: Commit**

```bash
git add src/lib/api-auth.ts src/lib/api-auth.test.ts src/middleware.ts
git commit -m "feat: add API key middleware and getUserId helper"
```

---

## Task 2: Update all route handlers to use `getUserId`

**Goal:** Replace `auth()` + `session.user.id` with `getUserId(req)` in all 9 protected route files so API key requests are accepted alongside cookie sessions.

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/[id]/route.ts`
- Modify: `src/app/api/tasks/[id]/subtasks/route.ts`
- Modify: `src/app/api/tasks/[id]/subtasks/[subtaskId]/route.ts`
- Modify: `src/app/api/tasks/reorder/route.ts`
- Modify: `src/app/api/projects/route.ts`
- Modify: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/api/tags/route.ts`
- Modify: `src/app/api/tags/[id]/route.ts`

**Acceptance Criteria:**
- [ ] No route handler calls `auth()` directly — all use `getUserId(req)`
- [ ] No route handler references `session.user.id` — all use `userId` returned by helper
- [ ] `auth` import removed from all 9 route files
- [ ] All existing route tests still pass
- [ ] Route handlers that had no `req` param on GET now accept `req: Request`

**Verify:** `npx vitest run` → all tests pass

**Steps:**

The change pattern is identical across all 9 files. For each file:

1. Add `import { getUserId } from "@/lib/api-auth"` 
2. Remove `import { auth } from "@/auth"`
3. Add `req: Request` param to any handler that lacks it
4. Replace:
   ```typescript
   const session = await auth()
   if (!session?.user?.id) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
   }
   // ... uses session.user.id
   ```
   With:
   ```typescript
   const userId = await getUserId(req)
   if (!userId) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
   }
   // ... uses userId
   ```

- [ ] **Step 1: Update `src/app/api/tasks/route.ts`**

Replace the auth block in GET, POST, and DELETE handlers. GET currently has no `req` param — add it.

```typescript
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // rest unchanged, replace session.user.id → userId
```

Apply same pattern to POST and DELETE handlers in this file.

- [ ] **Step 2: Run tasks route tests**

```bash
npx vitest run src/app/api/tasks/route.test.ts
```

Expected: all tests pass

- [ ] **Step 3: Update `src/app/api/tasks/[id]/route.ts`**

Both PATCH and DELETE already accept `req: Request` — just swap auth pattern.

```typescript
import { getUserId } from "@/lib/api-auth"
// remove: import { auth } from "@/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // rest unchanged
```

- [ ] **Step 4: Run tasks/[id] route tests**

```bash
npx vitest run src/app/api/tasks/\\[id\\]/route.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Update remaining 7 route files**

Apply the same pattern to:
- `src/app/api/tasks/[id]/subtasks/route.ts`
- `src/app/api/tasks/[id]/subtasks/[subtaskId]/route.ts`
- `src/app/api/tasks/reorder/route.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/tags/route.ts`
- `src/app/api/tags/[id]/route.ts`

For each: remove `auth` import, add `getUserId` import, add `req: Request` param where missing, replace auth block.

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass, no regressions

- [ ] **Step 7: Verify no remaining direct `auth()` calls in routes**

```bash
grep -r "from \"@/auth\"" src/app/api/
```

Expected: no output (all route files cleaned up)

- [ ] **Step 8: Commit**

```bash
git add src/app/api/
git commit -m "feat: update route handlers to accept API key auth via getUserId"
```

---

## Task 3: Create task-manager-skill plugin scaffold

**Goal:** Create the plugin directory in this repo and write the complete skill file with full CRUD API reference and behavior rules.

**Files:**
- Create: `task-manager-skill/.claude-plugin/plugin.json`
- Create: `task-manager-skill/skills/task-manager.md`
- Create: `task-manager-skill/README.md`

**Acceptance Criteria:**
- [ ] `plugin.json` is valid JSON with `name`, `description`, `version`, `author`
- [ ] Skill file covers all 13 CRUD operations with curl examples
- [ ] Skill file references `TASK_MANAGER_API_KEY` and `TASK_MANAGER_BASE_URL` env vars
- [ ] Skill file includes behavior rules (confirm before delete, show result, handle 401/403/404)
- [ ] README explains installation and env var setup

**Verify:** Load plugin locally: `claude --plugin-dir ./task-manager-skill` then invoke `/task-manager` — skill loads without errors.

**Steps:**

- [ ] **Step 1: Create `task-manager-skill/.claude-plugin/plugin.json`**

```json
{
  "name": "task-manager",
  "description": "Full CRUD for tasks, projects, and tags in the task manager app via its production API",
  "version": "1.0.0",
  "author": { "name": "sk01d" }
}
```

- [ ] **Step 2: Create `task-manager-skill/skills/task-manager.md`**

```markdown
# Task Manager

Interact with the task manager app via its production API.

## Setup

Before making any request, verify these env vars are set:

- `TASK_MANAGER_API_KEY` — your API key (get from the app owner)
- `TASK_MANAGER_BASE_URL` — production URL, e.g. `https://your-app.vercel.app`

If either is missing, tell the user before attempting any request.

```bash
# Quick check
echo $TASK_MANAGER_API_KEY
echo $TASK_MANAGER_BASE_URL
```

## API Reference

All requests use:
```
-H "X-API-Key: $TASK_MANAGER_API_KEY"
-H "Content-Type: application/json"
```

### Tasks

**List tasks**
```bash
curl "$TASK_MANAGER_BASE_URL/api/tasks" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

Optional query params: `?done=true|false`, `?sort=dueDate|createdAt`, `?q=search`, `?limit=N`

**Create task**
```bash
curl -X POST "$TASK_MANAGER_BASE_URL/api/tasks" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Task title",
    "dueDate": "2026-05-01T00:00:00.000Z",
    "recurrence": "daily|weekly|monthly|null",
    "description": "Optional description",
    "projectId": "optional-project-id"
  }'
```

Required: `title`. All others optional. `dueDate` is ISO 8601.

**Update task**
```bash
curl -X PATCH "$TASK_MANAGER_BASE_URL/api/tasks/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "done": true,
    "dueDate": "2026-05-01T00:00:00.000Z",
    "recurrence": "weekly",
    "description": "Updated description",
    "projectId": "project-id",
    "tagIds": ["tag-id-1", "tag-id-2"]
  }'
```

Send only the fields to update. Recurring tasks: marking `done: true` advances `dueDate` instead of archiving.

**Delete task**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/tasks/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Bulk delete completed tasks**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/tasks?done=true" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

### Projects

**List projects**
```bash
curl "$TASK_MANAGER_BASE_URL/api/projects" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Create project**
```bash
curl -X POST "$TASK_MANAGER_BASE_URL/api/projects" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Project title",
    "icon": "folder"
  }'
```

`icon` defaults to `"folder"` if omitted.

**Get project**
```bash
curl "$TASK_MANAGER_BASE_URL/api/projects/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Update project**
```bash
curl -X PATCH "$TASK_MANAGER_BASE_URL/api/projects/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "title": "New title", "icon": "star" }'
```

**Delete project**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/projects/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

### Tags

**List tags**
```bash
curl "$TASK_MANAGER_BASE_URL/api/tags" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

**Create tag**
```bash
curl -X POST "$TASK_MANAGER_BASE_URL/api/tags" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "urgent", "color": "#ef4444" }'
```

`color` defaults to `"#6b7280"` if omitted. `name` must not be blank.

**Update tag**
```bash
curl -X PATCH "$TASK_MANAGER_BASE_URL/api/tags/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "critical", "color": "#dc2626" }'
```

**Delete tag**
```bash
curl -X DELETE "$TASK_MANAGER_BASE_URL/api/tags/{id}" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY"
```

## Behavior Rules

- **Before any DELETE**: confirm with the user ("Delete task 'X'?") unless they explicitly said to skip confirmation.
- **After every write (POST/PATCH/DELETE)**: show a brief summary of the result (e.g., "Created task 'X' with id abc123").
- **401 response**: remind the user to check `TASK_MANAGER_API_KEY`.
- **403 response**: the resource belongs to a different user — report this clearly.
- **404 response**: resource not found — suggest listing first to get valid IDs.
- **400 response**: show the error message from the API body.
- **Never** echo the raw API key in any output.
```

- [ ] **Step 3: Create `task-manager-skill/README.md`**

```markdown
# task-manager-skill

Claude Code plugin for interacting with the task manager app via its production API.

## Installation

```bash
git clone https://github.com/sk01d/task-manager-skill
claude --plugin-dir ./task-manager-skill
```

Or add permanently to your `~/.claude/settings.json`:

```json
{
  "pluginDirs": ["/absolute/path/to/task-manager-skill"]
}
```

## Setup

Set two environment variables:

```bash
export TASK_MANAGER_API_KEY=your-api-key-here
export TASK_MANAGER_BASE_URL=https://your-app.vercel.app
```

Get your API key from the app owner.

## Usage

Invoke the skill in any Claude Code session:

```
/task-manager
```

Then ask Claude to create, list, update, or delete tasks and projects.
```

- [ ] **Step 4: Commit plugin scaffold to this repo**

```bash
git add task-manager-skill/
git commit -m "feat: add task-manager-skill Claude Code plugin scaffold"
```

- [ ] **Step 5: Create separate GitHub repo and push**

```bash
# Create new repo on GitHub (via gh CLI or browser), then:
cd task-manager-skill
git init
git add .
git commit -m "feat: initial plugin scaffold"
git remote add origin https://github.com/sk01d/task-manager-skill.git
git push -u origin main
cd ..
```

---

## Task 4: Configure environment variables and verify end-to-end

**Goal:** Set Vercel env vars, find the owner userId, and verify the full flow works with a real curl request against production.

**Files:** No code changes — configuration and verification only.

**Acceptance Criteria:**
- [ ] `CLAUDE_API_KEY` set in Vercel production env
- [ ] `CLAUDE_API_USER_ID` set in Vercel production env (owner's user cuid)
- [ ] `TASK_MANAGER_API_KEY` and `TASK_MANAGER_BASE_URL` set locally
- [ ] `GET /api/tasks` with API key returns 200 and the user's tasks
- [ ] Request without API key still works via browser (UI unaffected)
- [ ] Request with wrong API key returns 401

**Verify:**
```bash
curl -s "$TASK_MANAGER_BASE_URL/api/tasks" -H "X-API-Key: $TASK_MANAGER_API_KEY" | head -c 200
```
Expected: JSON array of tasks

**Steps:**

- [ ] **Step 1: Generate a strong API key**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value — it becomes `CLAUDE_API_KEY` on Vercel and `TASK_MANAGER_API_KEY` locally.

- [ ] **Step 2: Find the owner's userId**

Option A — query the database directly (if you have Neon access):
```sql
SELECT id FROM "User" WHERE email = 'your@email.com';
```

Option B — check the NextAuth JWT: open the app in the browser, open DevTools → Application → Cookies → find the `next-auth.session-token` JWT, decode it at jwt.io, copy the `sub` field.

- [ ] **Step 3: Set Vercel environment variables**

```bash
vercel env add CLAUDE_API_KEY production
# paste the key when prompted

vercel env add CLAUDE_API_USER_ID production
# paste the userId when prompted
```

Then redeploy:
```bash
vercel --prod
```

- [ ] **Step 4: Set local env vars**

```bash
export TASK_MANAGER_API_KEY=<the-key-from-step-1>
export TASK_MANAGER_BASE_URL=https://your-app.vercel.app
```

- [ ] **Step 5: Verify GET /api/tasks with API key**

```bash
curl -s "$TASK_MANAGER_BASE_URL/api/tasks" \
  -H "X-API-Key: $TASK_MANAGER_API_KEY" | head -c 300
```

Expected: JSON array starting with `[{`

- [ ] **Step 6: Verify wrong key returns 401**

```bash
curl -s -o /dev/null -w "%{http_code}" "$TASK_MANAGER_BASE_URL/api/tasks" \
  -H "X-API-Key: wrong-key"
```

Expected: `401`

- [ ] **Step 7: Verify UI still works**

Open the app in the browser and confirm tasks load normally (cookie auth unaffected).

- [ ] **Step 8: Add env vars to local `.env.local` for persistence**

```
CLAUDE_API_KEY=<value>
CLAUDE_API_USER_ID=<value>
```

Note: `.env.local` is already git-ignored.
