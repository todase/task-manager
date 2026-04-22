# completedAt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `completedAt DateTime?` to Task, set/clear it on done toggle, sort archive by it descending.

**Architecture:** Schema migration → PATCH route update → GET route sort update. Each task is independently testable and committable.

**Tech Stack:** Prisma, Next.js App Router, Vitest

---

### Task 0: Prisma schema migration

**Goal:** Add `completedAt DateTime?` to the Task model and apply the migration locally.

**Files:**
- Modify: `prisma/schema.prisma`

**Acceptance Criteria:**
- [ ] `completedAt DateTime?` present in `Task` model
- [ ] Migration file created and applied locally
- [ ] `npx tsc --noEmit` passes

**Verify:** `npx prisma migrate status` → all migrations applied

**Steps:**

- [ ] **Step 1: Add field to schema**

In `prisma/schema.prisma`, add `completedAt` after `createdAt` in the `Task` model:

```prisma
model Task {
  id          String    @id @default(cuid())
  title       String
  done        Boolean   @default(false)
  completedAt DateTime?
  dueDate     DateTime?
  recurrence  String?
  description String?
  order       Int       @default(0)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id])
  subtasks    Subtask[]
  tags        TaskTag[]
  createdAt   DateTime  @default(now())
}
```

- [ ] **Step 2: Create and apply migration**

```bash
npx prisma migrate dev --name add_completed_at
```

Expected: `✔ Generated Prisma Client` and migration applied.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add completedAt field to Task schema"
```

---

### Task 1: Set/clear completedAt in PATCH route

**Goal:** When `done=true` set `completedAt=now()`, when `done=false` clear it to `null`. Recurring task path is unaffected.

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`
- Modify: `src/app/api/tasks/[id]/route.test.ts`

**Acceptance Criteria:**
- [ ] `done=true` (non-recurring) → `completedAt` set to current timestamp
- [ ] `done=false` → `completedAt` set to `null`
- [ ] Recurring task advance path → `completedAt` not included in update data
- [ ] All existing tests still pass

**Verify:** `npx vitest run src/app/api/tasks/\\[id\\]/route.test.ts` → all passed

**Steps:**

- [ ] **Step 1: Write failing tests first**

Add these three tests inside `describe("PATCH /api/tasks/[id]", ...)` in `src/app/api/tasks/[id]/route.test.ts`:

```typescript
it("sets completedAt when marking done=true (non-recurring)", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockTask.findUnique.mockResolvedValue({ id: "task-1", recurrence: null, dueDate: null } as never)
  mockTask.update.mockResolvedValue({ ...dbTask, done: true, completedAt: new Date() } as never)

  await PATCH(jsonReq("PATCH", { done: true }), params())

  expect(mockTask.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ done: true, completedAt: expect.any(Date) }),
    })
  )
})

it("clears completedAt when marking done=false", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockTask.findUnique.mockResolvedValue({ id: "task-1", recurrence: null, dueDate: null } as never)
  mockTask.update.mockResolvedValue({ ...dbTask, done: false, completedAt: null } as never)

  await PATCH(jsonReq("PATCH", { done: false }), params())

  expect(mockTask.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ done: false, completedAt: null }),
    })
  )
})

it("does not set completedAt when advancing recurring task date", async () => {
  mockAuth.mockResolvedValue(session() as never)
  const dueDate = new Date("2026-04-01T00:00:00.000Z")
  mockTask.findUnique.mockResolvedValue({ id: "task-1", recurrence: "daily", dueDate } as never)
  mockTask.update.mockResolvedValue({ ...dbTask, dueDate: new Date("2026-04-02"), done: false } as never)

  await PATCH(jsonReq("PATCH", { done: true }), params())

  expect(mockTask.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.not.objectContaining({ completedAt: expect.anything() }),
    })
  )
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/app/api/tasks/\[id\]/route.test.ts
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Update the PATCH route**

In `src/app/api/tasks/[id]/route.ts`, update the `data` build block (after `if (done !== undefined) data.done = done`):

```typescript
  // Build update data from explicit fields only
  const data: Record<string, unknown> = {}
  if (done !== undefined) {
    data.done = done
    data.completedAt = done === true ? new Date() : null
  }
  if (title !== undefined) data.title = title
```

The full updated section looks like:

```typescript
  // Build update data from explicit fields only
  const data: Record<string, unknown> = {}
  if (done !== undefined) {
    data.done = done
    data.completedAt = done === true ? new Date() : null
  }
  if (title !== undefined) data.title = title
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
  if (recurrence !== undefined) data.recurrence = recurrence
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/app/api/tasks/\[id\]/route.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tasks/\[id\]/route.ts src/app/api/tasks/\[id\]/route.test.ts
git commit -m "feat: set completedAt on task done toggle"
```

---

### Task 2: Sort archive by completedAt in GET route

**Goal:** When `GET /api/tasks?done=true`, sort results by `completedAt desc nulls last`.

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/route.test.ts`

**Acceptance Criteria:**
- [ ] `done=true` requests use `orderBy: { completedAt: { sort: "desc", nulls: "last" } }`
- [ ] Other requests use existing sort logic unchanged
- [ ] New test passes

**Verify:** `npx vitest run src/app/api/tasks/route.test.ts` → all passed

**Steps:**

- [ ] **Step 1: Write failing test**

Add this test inside `describe("GET /api/tasks", ...)` in `src/app/api/tasks/route.test.ts`:

```typescript
it("sorts by completedAt desc when done=true", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockPrisma.task.findMany.mockResolvedValue([] as never)

  await GET(req("http://localhost/api/tasks?done=true"))

  expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: { completedAt: { sort: "desc", nulls: "last" } },
    })
  )
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/app/api/tasks/route.test.ts
```

Expected: new test FAILS.

- [ ] **Step 3: Update the GET route**

In `src/app/api/tasks/route.ts`, replace the `orderBy` block:

```typescript
  const orderBy: Prisma.TaskOrderByWithRelationInput =
    doneFilter === true
      ? { completedAt: { sort: "desc", nulls: "last" } }
      : sortParam === "updatedAt_desc"
      ? { createdAt: "desc" }
      : { order: "asc" }
```

- [ ] **Step 4: Run all tests to confirm everything passes**

```bash
npx vitest run src/app/api/tasks/route.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit and push**

```bash
git add src/app/api/tasks/route.ts src/app/api/tasks/route.test.ts
git commit -m "feat: sort archive by completedAt desc"
git push
```

- [ ] **Step 7: Apply migration to production**

```bash
DATABASE_URL="<production url from Vercel env vars>" npx prisma migrate deploy
```

Expected: `20260422..._add_completed_at` migration applied.
