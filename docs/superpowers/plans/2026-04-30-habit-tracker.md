# Habit Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a habit tracker by extending Task with `isHabit` and a new `HabitLog` model, enabling recurring tasks to track completion history with streaks and statistics on a dedicated `/habits` page.

**Architecture:** Habits reuse the existing Task/recurrence system — no separate entity. Each tap on a habit upserts a `HabitLog` (idempotent on double-tap, UTC-day keyed). Stats (streak, completion rate, mood trend) are computed client-side by `computeHabitStats`. The tasks page gains a collapsible `HabitSection`; `/habits` shows full `HabitCard` stat cards.

**Tech Stack:** Prisma migration, Next.js 16 API routes, TanStack Query v5, React + Tailwind CSS, Vitest + React Testing Library.

---

## File Structure

**New files:**
- `src/app/api/tasks/[id]/habit-logs/route.ts` — GET last 90 days of logs for one habit
- `src/app/api/tasks/[id]/habit-logs/route.test.ts` — unit tests for the above
- `src/hooks/habitStats.ts` — pure `computeHabitStats(logs, recurrence, createdAt)` function
- `src/hooks/habitStats.test.ts` — comprehensive unit tests for stat logic
- `src/hooks/useHabits.ts` — TanStack Query hook: `GET /api/tasks?isHabit=true`
- `src/hooks/useHabitLogs.ts` — TanStack Query hook: `GET /api/tasks/[id]/habit-logs`
- `src/components/habits/HabitSection.tsx` — collapsible habit list on the tasks page
- `src/components/habits/HabitSection.test.tsx` — component tests
- `src/components/habits/HabitCard.tsx` — full stat card for `/habits` page
- `src/app/habits/page.tsx` — `/habits` route listing HabitCards

**Modified files:**
- `prisma/schema.prisma` — add `isHabit`, `HabitLog` model, `TaskReflection.habitLog` backlink
- `src/types/index.ts` — add `HabitLog` type; add `isHabit`, `createdAt` to Task
- `src/hooks/taskUtils.ts` — add `isHabit` to `TaskFilters` and `CreateTaskInput`; update `buildTasksUrl`
- `src/app/api/tasks/route.ts` — GET: filter by `isHabit`; POST: validate `isHabit` requires `recurrence`
- `src/app/api/tasks/route.test.ts` — extend GET and POST tests
- `src/app/api/tasks/[id]/route.ts` — PATCH: habit log upsert in transaction; `isHabit` validation and update
- `src/app/api/tasks/[id]/route.test.ts` — extend PATCH tests
- `src/app/api/tasks/[id]/reflection/route.ts` — link `HabitLog`; skip `nextStepTitle` for habits
- `src/app/api/tasks/[id]/reflection/route.test.ts` — extend POST reflection tests
- `src/components/tasks/TaskList.tsx` — render `HabitSection`; pass `isHabit` to `ReflectionModal`
- `src/components/tasks/AddTaskForm.tsx` — add `isHabit` toggle
- `src/components/tasks/ReflectionModal.tsx` — add `isHabit` prop; hide next-step field
- `src/components/BurgerMenu.tsx` — add "Привычки" nav link

---

### Task 0: Schema Migration

**Goal:** Add `isHabit` to `Task`, create `HabitLog` model, add `habitLog` backlink to `TaskReflection`.

**Files:**
- Modify: `prisma/schema.prisma`

**Acceptance Criteria:**
- [ ] `Task` model has `isHabit Boolean @default(false)` and `habitLogs HabitLog[]`
- [ ] `HabitLog` model exists with `@@unique([taskId, date])` and `onDelete: Cascade`
- [ ] `TaskReflection` has `habitLog HabitLog?` backlink
- [ ] `npx prisma migrate dev` runs without errors

**Verify:** `npx prisma validate` → `The schema at ... is valid!`

**Steps:**

- [ ] **Step 1: Edit prisma/schema.prisma — Task model**

Inside the `Task` model, after the `recurrence String?` line, add:

```prisma
isHabit   Boolean    @default(false)
habitLogs HabitLog[]
```

- [ ] **Step 2: Edit prisma/schema.prisma — add HabitLog model**

After the closing `}` of the `Task` model, add the new model:

```prisma
model HabitLog {
  id           String          @id @default(cuid())
  taskId       String
  task         Task            @relation(fields: [taskId], references: [id], onDelete: Cascade)
  date         DateTime
  reflectionId String?         @unique
  reflection   TaskReflection? @relation(fields: [reflectionId], references: [id])
  createdAt    DateTime        @default(now())

  @@unique([taskId, date])
  @@index([taskId, date])
}
```

- [ ] **Step 3: Edit prisma/schema.prisma — TaskReflection backlink**

Inside the `TaskReflection` model, add after the last field:

```prisma
habitLog HabitLog?
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add_habit_tracker
```

Expected output contains: `The following migration(s) have been created and applied from new schema changes`

- [ ] **Step 5: Validate**

```bash
npx prisma validate
```

Expected: `The schema at ... is valid!`

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat: add HabitLog model and isHabit field to Task schema"
```

---

### Task 1: Types and taskUtils

**Goal:** Add `HabitLog` type, extend `Task` with `isHabit` and `createdAt`, update `TaskFilters`/`CreateTaskInput`/`buildTasksUrl`.

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/taskUtils.ts`

**Acceptance Criteria:**
- [ ] `Task` type has `isHabit: boolean` and `createdAt: string`
- [ ] `HabitLog` type is exported from `src/types/index.ts`
- [ ] `TaskFilters` and `CreateTaskInput` both have `isHabit?: boolean`
- [ ] `buildTasksUrl({ isHabit: true })` returns a URL containing `isHabit=true`
- [ ] `npx tsc --noEmit` passes

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Extend Task type and add HabitLog type in src/types/index.ts**

Add `isHabit: boolean` and `createdAt: string` to the `Task` type:

```ts
export type Task = {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  recurrence: string | null
  description: string | null
  order: number
  isHabit: boolean
  createdAt: string
  project: { id: string; title: string; icon: string } | null
  subtasks: Subtask[]
  tags: Tag[]
  priorityScore: number
  reflections?: TaskReflection[]
}
```

After the `TaskReflection` type, add:

```ts
export type HabitLog = {
  id: string
  taskId: string
  date: string // ISO date string, UTC midnight
  reflection?: Pick<TaskReflection, "mood" | "difficulty">
}
```

- [ ] **Step 2: Update TaskFilters, CreateTaskInput, and buildTasksUrl in src/hooks/taskUtils.ts**

Replace `TaskFilters`:

```ts
export type TaskFilters = {
  done?: boolean
  q?: string
  sort?: "order" | "createdAt_desc"
  isHabit?: boolean
}
```

Replace `CreateTaskInput`:

```ts
export type CreateTaskInput = {
  title: string
  dueDate?: string
  recurrence?: string
  projectId?: string
  tagIds?: string[]
  isHabit?: boolean
}
```

Replace `buildTasksUrl`:

```ts
export function buildTasksUrl(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.done !== undefined) params.set("done", String(filters.done))
  if (filters.q) params.set("q", filters.q)
  if (filters.sort) params.set("sort", filters.sort)
  if (filters.isHabit) params.set("isHabit", "true")
  const str = params.toString()
  return str ? `/api/tasks?${str}` : "/api/tasks"
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors)

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/hooks/taskUtils.ts
git commit -m "feat: add HabitLog type and isHabit to Task, TaskFilters, CreateTaskInput"
```

---

### Task 2: GET /api/tasks — isHabit filter

**Goal:** Support `?isHabit=true` query param in `GET /api/tasks`.

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/route.test.ts`

**Acceptance Criteria:**
- [ ] `GET /api/tasks?isHabit=true` returns only tasks where `isHabit = true`
- [ ] Omitting the param returns all tasks (existing behaviour unchanged)
- [ ] Test for the filter passes

**Verify:** `npx vitest run src/app/api/tasks/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Add isHabit param parsing in src/app/api/tasks/route.ts**

After `const q = searchParams.get("q") ?? undefined`, add:

```ts
const isHabitParam = searchParams.get("isHabit")
const isHabitFilter = isHabitParam === "true" ? true : undefined
```

In the `where` object, add after the `done` spread:

```ts
...(isHabitFilter !== undefined && { isHabit: true }),
```

- [ ] **Step 2: Add test in src/app/api/tasks/route.test.ts**

Add a new `it` inside the `describe("GET /api/tasks", ...)` block:

```ts
it("filters by isHabit=true", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockTask.findMany.mockResolvedValue([
    { ...dbTask, isHabit: true, tags: [] },
  ] as never)

  const req = new Request("http://localhost/api/tasks?isHabit=true")
  const res = await GET(req)
  expect(res.status).toBe(200)
  expect(mockTask.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ isHabit: true }),
    })
  )
})
```

Note: check the existing `dbTask` fixture and `session()` helper in `route.test.ts` — reuse them verbatim.

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/app/api/tasks/route.test.ts
```

Expected: all tests pass, no failures

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/route.ts src/app/api/tasks/route.test.ts
git commit -m "feat: add isHabit filter to GET /api/tasks"
```

---

### Task 3: PATCH /api/tasks/[id] — isHabit validation and habit log upsert

**Goal:** When marking a habit done, upsert a `HabitLog` and shift `dueDate` in one transaction. Validate that `isHabit: true` cannot be set alongside `recurrence: null`.

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`
- Modify: `src/app/api/tasks/[id]/route.test.ts`

**Acceptance Criteria:**
- [ ] `PATCH { isHabit: true, recurrence: null }` → 400
- [ ] `PATCH { done: true }` on a task with `isHabit: true` upserts `HabitLog` and shifts `dueDate` in a `$transaction`
- [ ] `PATCH { done: true }` on a task with `isHabit: false` still shifts `dueDate` without upsert (existing behaviour)
- [ ] `PATCH { isHabit: true }` on a task with existing recurrence sets `isHabit` via `data.isHabit = true`

**Verify:** `npx vitest run src/app/api/tasks/[id]/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Update destructuring and add validation in src/app/api/tasks/[id]/route.ts**

Replace the existing destructure line:

```ts
const { tagIds, done, title, dueDate, recurrence, projectId, description } =
  await req.json()
```

with:

```ts
const { tagIds, done, title, dueDate, recurrence, projectId, description, isHabit } =
  await req.json()
```

After the existing recurrence validation block (lines 18–26), add:

```ts
if (isHabit === true) {
  if (recurrence === null) {
    // Explicit recurrence:null + isHabit:true in the same PATCH — reject immediately
    return NextResponse.json(
      { error: "isHabit requires recurrence" },
      { status: 400 }
    )
  }
  if (recurrence === undefined) {
    // isHabit:true being set but recurrence not in body — check the existing task
    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing?.recurrence) {
      return NextResponse.json(
        { error: "isHabit requires recurrence" },
        { status: 400 }
      )
    }
  }
}
```

> **Note:** This early `findUnique` for `isHabit` validation is separate from the one inside the `done === true` branch below. If both `done: true` and `isHabit: true` (without `recurrence`) appear in the same body the task will be fetched twice — acceptable for this edge case.

- [ ] **Step 2: Add habitLog upsert inside the recurring done:true branch**

Replace the entire `if (done === true)` block (lines 30–49) with:

```ts
if (done === true) {
  const existing = await prisma.task.findUnique({ where: { id } })
  if (existing?.recurrence && existing.dueDate) {
    const next = new Date(existing.dueDate)
    if (existing.recurrence === "daily") next.setDate(next.getDate() + 1)
    if (existing.recurrence === "weekly") next.setDate(next.getDate() + 7)
    if (existing.recurrence === "monthly") next.setMonth(next.getMonth() + 1)

    const include = {
      project: { select: { id: true, title: true } },
      subtasks: true,
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
    } as const

    if (existing.isHabit) {
      const now = new Date()
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      )
      const [, task] = await prisma.$transaction([
        prisma.habitLog.upsert({
          where: { taskId_date: { taskId: id, date } },
          create: { taskId: id, date },
          update: {},
        }),
        prisma.task.update({
          where: { id, userId },
          data: { dueDate: next, done: false },
          include,
        }),
      ])
      return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
    }

    const task = await prisma.task.update({
      where: { id, userId },
      data: { dueDate: next, done: false },
      include,
    })
    return NextResponse.json({ ...task, tags: task.tags.map((tt) => tt.tag) })
  }
}
```

- [ ] **Step 3: Add isHabit to the update data section**

After `if (description !== undefined) data.description = description`, add:

```ts
if (isHabit !== undefined) data.isHabit = isHabit
```

- [ ] **Step 4: Extend (merge, do NOT replace) the mock factory in route.test.ts**

The existing mock factory does not have `habitLog` or `$transaction`. **Merge** the additions into the existing factory — do not replace it wholesale, or the existing tests that depend on `tag.count` will lose their mock.

The final merged factory must be:

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tag: {
      count: vi.fn(),
    },
    habitLog: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
```

Add alongside the existing `mockTask` / `mockTag` declarations:

```ts
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>
```

- [ ] **Step 5: Write tests for habit branch**

Add inside `describe("PATCH /api/tasks/[id]", ...)`:

```ts
it("returns 400 when isHabit=true and recurrence=null", async () => {
  mockAuth.mockResolvedValue(session() as never)
  const res = await PATCH(
    jsonReq("PATCH", { isHabit: true, recurrence: null }),
    params()
  )
  expect(res.status).toBe(400)
})

it("upserts HabitLog and shifts dueDate in transaction for habit done", async () => {
  mockAuth.mockResolvedValue(session() as never)
  const dueDate = new Date("2026-04-01T00:00:00.000Z")
  mockTask.findUnique.mockResolvedValue({
    id: "task-1",
    recurrence: "daily",
    dueDate,
    isHabit: true,
  } as never)

  const updatedTask = { ...dbTask, dueDate: new Date("2026-04-02"), done: false }
  mockTransaction.mockResolvedValue([{}, updatedTask])

  const res = await PATCH(jsonReq("PATCH", { done: true }), params())
  expect(res.status).toBe(200)
  expect(mockTransaction).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ /* habitLog.upsert call */ }),
      expect.objectContaining({ /* task.update call */ }),
    ])
  )
})

it("does not upsert HabitLog for non-habit recurring task done", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockTask.findUnique.mockResolvedValue({
    id: "task-1",
    recurrence: "daily",
    dueDate: new Date("2026-04-01"),
    isHabit: false,
  } as never)
  // Must mock update return value or the JSON spread will throw on undefined
  mockTask.update.mockResolvedValue({ ...dbTask, dueDate: new Date("2026-04-02"), done: false } as never)

  await PATCH(jsonReq("PATCH", { done: true }), params())
  expect(mockTransaction).not.toHaveBeenCalled()
  expect(mockTask.update).toHaveBeenCalled()
})
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/app/api/tasks/[id]/route.test.ts
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts src/app/api/tasks/[id]/route.test.ts
git commit -m "feat: upsert HabitLog on habit completion, validate isHabit requires recurrence"
```

---

### Task 4: POST /api/tasks — isHabit validation and field

**Goal:** Accept `isHabit` in task creation; return 400 if `isHabit: true` but `recurrence` is absent.

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/route.test.ts`

**Acceptance Criteria:**
- [ ] `POST { title: "H", isHabit: true }` (no recurrence) → 400
- [ ] `POST { title: "H", isHabit: true, recurrence: "daily" }` → 200 with `isHabit: true` in response
- [ ] `POST { title: "H" }` (no isHabit) still works as before

**Verify:** `npx vitest run src/app/api/tasks/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Update POST handler destructuring and add validation**

Replace the destructuring line in the `POST` handler:

```ts
const { title, projectId, dueDate, recurrence, tagIds } = await req.json()
```

with:

```ts
const { title, projectId, dueDate, recurrence, tagIds, isHabit } = await req.json()
```

After the `title` validation block, add:

```ts
if (isHabit === true && !recurrence) {
  return NextResponse.json(
    { error: "isHabit requires recurrence" },
    { status: 400 }
  )
}
```

- [ ] **Step 2: Pass isHabit when creating the task**

Inside `tx.task.create({ data: { ... } })`, add:

```ts
...(isHabit === true && { isHabit: true }),
```

- [ ] **Step 3: Write tests**

Inside `describe("POST /api/tasks", ...)` in `route.test.ts`, add:

```ts
it("returns 400 when isHabit=true and no recurrence", async () => {
  mockAuth.mockResolvedValue(session() as never)
  const req = new Request("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Morning run", isHabit: true }),
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
})

it("creates a habit task when isHabit=true with recurrence", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      task: {
        updateMany: vi.fn(),
        create: vi.fn().mockResolvedValue({
          ...dbTask,
          isHabit: true,
          recurrence: "daily",
          tags: [],
        }),
      },
    })
  )
  const req = new Request("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Morning run", isHabit: true, recurrence: "daily" }),
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.isHabit).toBe(true)
})
```

Note: Check the existing POST test setup in `route.test.ts` for the `mockTransaction` reference — it may already be defined; reuse it.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/app/api/tasks/route.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tasks/route.ts src/app/api/tasks/route.test.ts
git commit -m "feat: accept isHabit in POST /api/tasks with recurrence validation"
```

---

### Task 5: POST /api/tasks/[id]/reflection — habit log linkage

**Goal:** After creating a reflection for a habit task, find the most recent `HabitLog` and link it via `reflectionId`. Skip `nextStepTitle` creation for habits.

**Files:**
- Modify: `src/app/api/tasks/[id]/reflection/route.ts`
- Modify: `src/app/api/tasks/[id]/reflection/route.test.ts`

**Acceptance Criteria:**
- [ ] Reflection on a habit task links `HabitLog.reflectionId` to the new reflection's id
- [ ] `nextStepTitle` is ignored for habit tasks (no `task.create` called)
- [ ] Non-habit tasks still create next-step tasks as before

**Verify:** `npx vitest run src/app/api/tasks/[id]/reflection/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Add habitLog mock to the Prisma mock factory**

In `route.test.ts`, update the prisma mock:

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn() },
    habitLog: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))
```

- [ ] **Step 2: Update the transaction in reflection/route.ts**

Replace the entire `prisma.$transaction(async (tx) => { ... })` block with:

```ts
const result = await prisma.$transaction(async (tx) => {
  const reflection = await tx.taskReflection.create({
    data: {
      taskId: id,
      notes: typeof notes === "string" && notes ? notes : null,
      timeMinutes: safeTime,
      difficulty: safeDifficulty,
      mood: safeMood,
    },
  })

  let nextTask: Awaited<ReturnType<typeof tx.task.create>> | undefined

  if (task.isHabit) {
    const latestLog = await tx.habitLog.findFirst({
      where: { taskId: id },
      orderBy: { date: "desc" },
    })
    if (latestLog) {
      await tx.habitLog.update({
        where: { id: latestLog.id },
        data: { reflectionId: reflection.id },
      })
    }
  } else {
    const nextStepStr = typeof nextStepTitle === "string" ? nextStepTitle.trim() : ""
    if (nextStepStr) {
      nextTask = await tx.task.create({
        data: {
          title: nextStepStr,
          userId,
          projectId: task.projectId,
          done: false,
        },
      })
    }
  }

  return { reflection, nextTask }
})
```

- [ ] **Step 3: Write tests for habit reflection**

Add inside `describe("POST /api/tasks/[id]/reflection", ...)`:

```ts
it("links habit log to reflection and skips nextStep for habit tasks", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockFindUnique.mockResolvedValue({
    id: "task-1",
    userId: "u1",
    projectId: null,
    isHabit: true,
  } as never)

  const mockReflection = { id: "ref-1", taskId: "task-1" }
  const mockLog = { id: "log-1", taskId: "task-1", date: new Date() }
  const reflectionCreate = vi.fn().mockResolvedValue(mockReflection)
  const habitLogFindFirst = vi.fn().mockResolvedValue(mockLog)
  const habitLogUpdate = vi.fn().mockResolvedValue(mockLog)
  const taskCreate = vi.fn()

  mockTransaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        taskReflection: { create: reflectionCreate },
        habitLog: { findFirst: habitLogFindFirst, update: habitLogUpdate },
        task: { create: taskCreate },
      })
  )

  const res = await POST(
    jsonReq({ notes: "Done", nextStepTitle: "Should be ignored" }),
    params()
  )
  expect(res.status).toBe(200)
  expect(habitLogUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: "log-1" },
      data: { reflectionId: "ref-1" },
    })
  )
  expect(taskCreate).not.toHaveBeenCalled()
})

it("creates next-step task for non-habit tasks as before", async () => {
  mockAuth.mockResolvedValue(session() as never)
  mockFindUnique.mockResolvedValue({
    id: "task-1",
    userId: "u1",
    projectId: "p1",
    isHabit: false,
  } as never)

  const reflectionCreate = vi.fn().mockResolvedValue({ id: "ref-1" })
  const taskCreate = vi.fn().mockResolvedValue({ id: "task-2", title: "Next" })

  mockTransaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        taskReflection: { create: reflectionCreate },
        habitLog: { findFirst: vi.fn(), update: vi.fn() },
        task: { create: taskCreate },
      })
  )

  const res = await POST(
    jsonReq({ nextStepTitle: "Follow up" }),
    params()
  )
  expect(res.status).toBe(200)
  expect(taskCreate).toHaveBeenCalled()
})
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/app/api/tasks/[id]/reflection/route.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tasks/[id]/reflection/
git commit -m "feat: link HabitLog to reflection and skip nextStep for habit tasks"
```

---

### Task 6: GET /api/tasks/[id]/habit-logs

**Goal:** New endpoint returning last 90 days of `HabitLog` records for one habit task, with mood/difficulty from the linked reflection.

**Files:**
- Create: `src/app/api/tasks/[id]/habit-logs/route.ts`
- Create: `src/app/api/tasks/[id]/habit-logs/route.test.ts`

**Acceptance Criteria:**
- [ ] Returns 401 if not authenticated
- [ ] Returns 403 if `task.userId !== session.user.id`
- [ ] Returns `{ logs: [...] }` with logs from last 90 days, `orderBy: date asc`
- [ ] Each log includes `reflection: { mood, difficulty }` when present

**Verify:** `npx vitest run src/app/api/tasks/[id]/habit-logs/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Create src/app/api/tasks/[id]/habit-logs/route.ts**

```ts
import { NextResponse } from "next/server"
import { getUserId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task || task.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 90)
  since.setUTCHours(0, 0, 0, 0)

  const logs = await prisma.habitLog.findMany({
    where: { taskId: id, date: { gte: since } },
    include: {
      reflection: { select: { mood: true, difficulty: true } },
    },
    orderBy: { date: "asc" },
  })

  return NextResponse.json({ logs })
}
```

- [ ] **Step 2: Create src/app/api/tasks/[id]/habit-logs/route.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { GET } from "./route"

vi.mock("@/auth")
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn() },
    habitLog: { findMany: vi.fn() },
  },
}))

const mockAuth = vi.mocked(auth)
const mockTask = vi.mocked(prisma.task)
const mockHabitLog = vi.mocked(prisma.habitLog)

function session(userId = "u1") {
  return { user: { id: userId } }
}

function params(id = "task-1") {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

describe("GET /api/tasks/[id]/habit-logs", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(401)
  })

  it("returns 403 when task belongs to another user", async () => {
    mockAuth.mockResolvedValue(session("u1") as never)
    mockTask.findUnique.mockResolvedValue({ id: "task-1", userId: "u2" } as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(403)
  })

  it("returns 403 when task not found", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findUnique.mockResolvedValue(null as never)
    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(403)
  })

  it("returns logs for last 90 days with reflection data", async () => {
    mockAuth.mockResolvedValue(session() as never)
    mockTask.findUnique.mockResolvedValue({ id: "task-1", userId: "u1" } as never)
    const mockLogs = [
      {
        id: "log-1",
        taskId: "task-1",
        date: new Date("2026-04-01T00:00:00.000Z"),
        reflection: { mood: "energized", difficulty: 1 },
      },
    ]
    mockHabitLog.findMany.mockResolvedValue(mockLogs as never)

    const res = await GET(new Request("http://localhost/api/tasks/task-1/habit-logs"), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.logs).toHaveLength(1)
    expect(body.logs[0].reflection.mood).toBe("energized")
    expect(mockHabitLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ taskId: "task-1" }),
        orderBy: { date: "asc" },
      })
    )
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/app/api/tasks/[id]/habit-logs/route.test.ts
```

Expected: 4 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/[id]/habit-logs/
git commit -m "feat: add GET /api/tasks/[id]/habit-logs endpoint"
```

---

### Task 7: computeHabitStats

**Goal:** Pure function computing streak (daily only), completion rate (with `createdAt` cap), and mood trend from `HabitLog[]`.

**Files:**
- Create: `src/hooks/habitStats.ts`
- Create: `src/hooks/habitStats.test.ts`

**Acceptance Criteria:**
- [ ] Daily streak: counts consecutive UTC days ending today-or-yesterday; missing one day → 0
- [ ] Weekly/monthly have no streak (returns 0)
- [ ] Completion rate denominator is capped by days/periods since `createdAt`
- [ ] Mood trend: last 10 logs with non-null mood, chronological order
- [ ] All tests pass

**Verify:** `npx vitest run src/hooks/habitStats.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Create src/hooks/habitStats.ts**

```ts
import type { HabitLog } from "@/types"

type Mood = "energized" | "neutral" | "tired"

export type HabitStats = {
  streak: number
  completionRate: number
  moodTrend: Mood[]
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function getMondayOf(d: Date): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() - ((r.getUTCDay() || 7) - 1))
  return r
}

export function computeHabitStats(
  logs: HabitLog[],
  recurrence: string,
  createdAt: Date
): HabitStats {
  const now = new Date()
  const today = utcMidnight(now)
  const createdDay = utcMidnight(createdAt)

  // --- Streak (daily only) ---
  let streak = 0
  if (recurrence === "daily") {
    const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
    const cursor = new Date(today)
    // If today not logged yet, allow streak to count from yesterday
    if (!logDates.has(cursor.toISOString().slice(0, 10))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    while (logDates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
  }

  // --- Completion rate ---
  let completionRate = 0

  if (recurrence === "daily") {
    const windowStart = new Date(today)
    windowStart.setUTCDate(windowStart.getUTCDate() - 29) // 30-day window
    const effectiveStart = createdDay > windowStart ? createdDay : windowStart
    const expectedDays =
      Math.round((today.getTime() - effectiveStart.getTime()) / 86_400_000) + 1
    const logged = logs.filter((l) => new Date(l.date) >= effectiveStart).length
    completionRate = expectedDays > 0 ? logged / expectedDays : 0
  } else if (recurrence === "weekly") {
    const thisMonday = getMondayOf(today)
    let completed = 0
    let total = 0
    for (let i = 0; i < 12; i++) {
      const wStart = new Date(thisMonday)
      wStart.setUTCDate(wStart.getUTCDate() - 7 * i)
      if (wStart < createdDay) break
      const wEnd = new Date(wStart)
      wEnd.setUTCDate(wEnd.getUTCDate() + 7)
      total++
      if (logs.some((l) => { const d = new Date(l.date); return d >= wStart && d < wEnd })) {
        completed++
      }
    }
    completionRate = total > 0 ? completed / total : 0
  } else if (recurrence === "monthly") {
    let completed = 0
    let total = 0
    for (let i = 0; i < 12; i++) {
      const mStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1)
      )
      if (mStart < createdDay) break
      const mEnd = new Date(
        Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1)
      )
      total++
      if (logs.some((l) => { const d = new Date(l.date); return d >= mStart && d < mEnd })) {
        completed++
      }
    }
    completionRate = total > 0 ? completed / total : 0
  }

  // --- Mood trend: last 10 logs with non-null mood, chronological ---
  const moodTrend = logs
    .filter((l) => l.reflection?.mood != null)
    .slice(-10)
    .map((l) => l.reflection!.mood as Mood)

  return { streak, completionRate, moodTrend }
}
```

- [ ] **Step 2: Create src/hooks/habitStats.test.ts**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { computeHabitStats } from "./habitStats"
import type { HabitLog } from "@/types"

function makeLog(dateStr: string, mood?: "energized" | "neutral" | "tired"): HabitLog {
  return {
    id: dateStr,
    taskId: "task-1",
    date: `${dateStr}T00:00:00.000Z`,
    reflection: mood ? { mood, difficulty: 1 } : undefined,
  }
}

const CREATED_AT = new Date("2026-01-01T00:00:00.000Z")

describe("computeHabitStats — streak", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z")) // UTC today = 2026-04-30
  })
  afterEach(() => vi.useRealTimers())

  it("returns 0 streak when no logs", () => {
    const { streak } = computeHabitStats([], "daily", CREATED_AT)
    expect(streak).toBe(0)
  })

  it("counts consecutive days ending today", () => {
    const logs = [makeLog("2026-04-28"), makeLog("2026-04-29"), makeLog("2026-04-30")]
    const { streak } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(streak).toBe(3)
  })

  it("counts streak ending yesterday when today has no log", () => {
    const logs = [makeLog("2026-04-28"), makeLog("2026-04-29")]
    const { streak } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(streak).toBe(2)
  })

  it("resets streak if yesterday is missing (gap)", () => {
    const logs = [makeLog("2026-04-27"), makeLog("2026-04-30")]
    const { streak } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(streak).toBe(1) // only today counts
  })

  it("returns 0 streak for weekly habits", () => {
    const logs = [makeLog("2026-04-29")]
    const { streak } = computeHabitStats(logs, "weekly", CREATED_AT)
    expect(streak).toBe(0)
  })
})

describe("computeHabitStats — completion rate", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"))
  })
  afterEach(() => vi.useRealTimers())

  it("caps daily denominator by createdAt", () => {
    const recentCreated = new Date("2026-04-28T00:00:00.000Z") // 3 days ago
    const logs = [makeLog("2026-04-28"), makeLog("2026-04-29"), makeLog("2026-04-30")]
    const { completionRate } = computeHabitStats(logs, "daily", recentCreated)
    expect(completionRate).toBeCloseTo(1.0)
  })

  it("returns < 1.0 rate when some days missed", () => {
    const recentCreated = new Date("2026-04-28T00:00:00.000Z")
    const logs = [makeLog("2026-04-28")]
    const { completionRate } = computeHabitStats(logs, "daily", recentCreated)
    // 1 log out of 3 expected days
    expect(completionRate).toBeCloseTo(1 / 3)
  })

  it("caps weekly denominator by createdAt (less than 12 weeks)", () => {
    const twoWeeksAgo = new Date("2026-04-16T00:00:00.000Z")
    const logs = [makeLog("2026-04-20"), makeLog("2026-04-27")]
    const { completionRate } = computeHabitStats(logs, "weekly", twoWeeksAgo)
    expect(completionRate).toBeCloseTo(1.0) // 2 of 2 weeks
  })

  it("computes monthly rate (1 of 3 months)", () => {
    const threeMonthsAgo = new Date("2026-02-01T00:00:00.000Z")
    const logs = [makeLog("2026-02-15")]
    const { completionRate } = computeHabitStats(logs, "monthly", threeMonthsAgo)
    expect(completionRate).toBeCloseTo(1 / 3)
  })
})

describe("computeHabitStats — moodTrend", () => {
  it("returns last 10 logs with non-null mood in chronological order", () => {
    const logs = [
      makeLog("2026-04-20", "energized"),
      makeLog("2026-04-21"), // no mood
      makeLog("2026-04-22", "neutral"),
      makeLog("2026-04-23", "tired"),
    ]
    const { moodTrend } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(moodTrend).toEqual(["energized", "neutral", "tired"])
  })

  it("returns at most 10 moods", () => {
    const logs = Array.from({ length: 15 }, (_, i) =>
      makeLog(`2026-04-${String(i + 1).padStart(2, "0")}`, "neutral")
    )
    const { moodTrend } = computeHabitStats(logs, "daily", CREATED_AT)
    expect(moodTrend).toHaveLength(10)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/hooks/habitStats.test.ts
```

Expected: all tests pass (9+ tests)

- [ ] **Step 4: Commit**

```bash
git add src/hooks/habitStats.ts src/hooks/habitStats.test.ts
git commit -m "feat: add computeHabitStats (streak, completionRate, moodTrend)"
```

---

### Task 8: useHabits and useHabitLogs hooks

**Goal:** TanStack Query hooks for fetching all habits and per-habit log history.

**Files:**
- Create: `src/hooks/useHabits.ts`
- Create: `src/hooks/useHabitLogs.ts`

**Acceptance Criteria:**
- [ ] `useHabits()` queries `["tasks", { isHabit: true }]` and returns `Task[]`
- [ ] `useHabitLogs(taskId)` queries `["habitLogs", taskId]` and returns `HabitLog[]`
- [ ] Both hooks handle fetch errors by throwing

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Create src/hooks/useHabits.ts**

```ts
import { useQuery } from "@tanstack/react-query"
import { buildTasksUrl, withPriorityScores } from "./taskUtils"
import type { Task } from "@/types"

export function useHabits() {
  return useQuery<Task[]>({
    queryKey: ["tasks", { isHabit: true }],
    queryFn: async () => {
      const res = await fetch(buildTasksUrl({ isHabit: true }))
      if (!res.ok) throw new Error("Failed to fetch habits")
      const tasks: Omit<Task, "priorityScore">[] = await res.json()
      return withPriorityScores(tasks)
    },
  })
}
```

- [ ] **Step 2: Create src/hooks/useHabitLogs.ts**

```ts
import { useQuery } from "@tanstack/react-query"
import type { HabitLog } from "@/types"

export function useHabitLogs(taskId: string) {
  return useQuery<HabitLog[]>({
    queryKey: ["habitLogs", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/habit-logs`)
      if (!res.ok) throw new Error("Failed to fetch habit logs")
      const data = await res.json()
      return data.logs
    },
    enabled: Boolean(taskId),
  })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useHabits.ts src/hooks/useHabitLogs.ts
git commit -m "feat: add useHabits and useHabitLogs TanStack Query hooks"
```

---

### Task 9: AddTaskForm — isHabit toggle

**Goal:** Show an "Is a habit" toggle in `AddTaskForm` only when a recurrence is selected. Auto-reset `isHabit` to `false` if recurrence is cleared.

**Files:**
- Modify: `src/components/tasks/AddTaskForm.tsx`

**Acceptance Criteria:**
- [ ] Toggle is hidden when `recurrence` is empty/null
- [ ] Enabling toggle sets `isHabit: true`; clearing recurrence resets it to `false` (toggle disappears)
- [ ] `isHabit: true` is passed in the submit payload when toggled on

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Add isHabit state to AddTaskForm**

Inside the component, after the existing `recurrence` state declaration, add:

```ts
const [isHabit, setIsHabit] = useState(false)
```

- [ ] **Step 2: Reset isHabit when recurrence is cleared**

Find the recurrence change handler (the `<select>` or dropdown `onChange`). Wrap it to also reset `isHabit`:

```ts
onChange={(e) => {
  const val = e.target.value
  setRecurrence(val)
  if (!val) setIsHabit(false) // habit requires recurrence
}}
```

- [ ] **Step 3: Render the toggle after the recurrence picker**

After the recurrence picker JSX, add:

```tsx
{recurrence && (
  <button
    type="button"
    onClick={() => setIsHabit((prev) => !prev)}
    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${
      isHabit
        ? "border-purple-400 bg-purple-50 text-purple-700"
        : "border-gray-200 text-gray-500 hover:border-gray-300"
    }`}
  >
    <span>{isHabit ? "✓" : ""} Привычка</span>
  </button>
)}
```

- [ ] **Step 4: Include isHabit in the submit payload**

Find the `onSubmit` / `handleSubmit` call that builds the task payload. Add `isHabit` to it:

```ts
// Inside the submit handler, where the payload object is built:
...(isHabit && { isHabit: true }),
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/AddTaskForm.tsx
git commit -m "feat: add isHabit toggle to AddTaskForm (visible only with recurrence)"
```

---

### Task 10: ReflectionModal — isHabit prop

**Goal:** Add optional `isHabit` prop to `ReflectionModal`; hide the "next step" field when it is `true`.

**Files:**
- Modify: `src/components/tasks/ReflectionModal.tsx`

**Acceptance Criteria:**
- [ ] `isHabit` prop accepted (optional, defaults to `false`)
- [ ] Next-step input is not rendered when `isHabit={true}`
- [ ] All existing modal behaviour is unchanged for `isHabit={false}`

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Add isHabit to props type**

Find the props type/interface at the top of `ReflectionModal.tsx`. Change:

```ts
// Before:
{ taskId, onClose }: { taskId: string; onClose: () => void }

// After:
{ taskId, onClose, isHabit = false }: {
  taskId: string
  onClose: () => void
  isHabit?: boolean
}
```

- [ ] **Step 2: Conditionally render the next-step field**

Find the JSX that renders the `nextStepTitle` input (currently around the `nextStepTitle` state variable). Wrap it:

```tsx
{!isHabit && (
  <div>
    {/* existing nextStepTitle input JSX verbatim */}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/ReflectionModal.tsx
git commit -m "feat: hide next-step field in ReflectionModal when isHabit=true"
```

---

### Task 11: HabitSection component

**Goal:** Collapsible section showing today's habits with a checkbox, 7-day mini heatmap, streak badge (daily only), and a "Details" link to `/habits`.

**Files:**
- Create: `src/components/habits/HabitSection.tsx`
- Create: `src/components/habits/HabitSection.test.tsx`

**Acceptance Criteria:**
- [ ] Renders collapsed by default with "Привычки" header and count badge
- [ ] Click header toggles expanded/collapsed state
- [ ] Each habit row: checkbox calls `onToggle(habit)` and `onRequestReflection(habit.id)` (only when `!habit.done`)
- [ ] 7-day mini heatmap shows last 7 UTC days colored by whether a log exists
- [ ] Streak badge shown only for `recurrence === "daily"` habits
- [ ] "Details" link → `/habits`

**Verify:** `npx vitest run src/components/habits/HabitSection.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Create src/components/habits/HabitSection.tsx**

```tsx
"use client"
import { useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, ChevronRight } from "lucide-react"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

type Props = {
  habits: Task[]
  onToggle: (task: Task) => void
  onRequestReflection: (taskId: string) => void
}

function last7UtcDays(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    days.push(d)
  }
  return days
}

function HabitRow({
  habit,
  onToggle,
  onRequestReflection,
}: {
  habit: Task
  onToggle: (task: Task) => void
  onRequestReflection: (taskId: string) => void
}) {
  const { data: logs = [] } = useHabitLogs(habit.id)
  const days = last7UtcDays()
  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))

  return (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={() => {
          onToggle(habit)
          if (!habit.done) onRequestReflection(habit.id)
        }}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          habit.done
            ? "border-purple-500 bg-purple-500"
            : "border-gray-300 hover:border-purple-400"
        }`}
        aria-label={`Отметить привычку: ${habit.title}`}
      >
        {habit.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      <span className="flex-1 text-sm">{habit.title}</span>

      {/* 7-day mini heatmap */}
      <div className="flex gap-0.5" aria-label="Последние 7 дней">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10)
          return (
            <div
              key={key}
              className={`w-3 h-3 rounded-sm ${
                logDates.has(key) ? "bg-purple-400" : "bg-gray-100"
              }`}
            />
          )
        })}
      </div>

      {/* Streak badge (daily only) */}
      {habit.recurrence === "daily" && stats.streak > 0 && (
        <span className="text-xs text-orange-500 font-medium">
          🔥{stats.streak}
        </span>
      )}

      <Link href="/habits" className="text-xs text-gray-400 hover:text-gray-600">
        →
      </Link>
    </div>
  )
}

export function HabitSection({ habits, onToggle, onRequestReflection }: Props) {
  const [open, setOpen] = useState(true)

  if (habits.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
      >
        {open ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>Привычки</span>
        <span className="ml-1 text-xs bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5">
          {habits.length}
        </span>
      </button>

      {open && (
        <div className="pl-2 divide-y divide-gray-50">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              onToggle={onToggle}
              onRequestReflection={onRequestReflection}
            />
          ))}
          <div className="pt-2">
            <Link
              href="/habits"
              className="text-xs text-purple-500 hover:text-purple-700"
            >
              Все привычки →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/habits/HabitSection.test.tsx**

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { HabitSection } from "./HabitSection"

vi.mock("@/hooks/useHabitLogs", () => ({
  useHabitLogs: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const habit = {
  id: "h1",
  title: "Morning run",
  done: false,
  recurrence: "daily",
  isHabit: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  dueDate: null,
  description: null,
  order: 0,
  project: null,
  subtasks: [],
  tags: [],
  priorityScore: 1,
}

beforeEach(() => vi.clearAllMocks())

describe("HabitSection", () => {
  it("renders null when habits list is empty", () => {
    const { container } = render(
      <HabitSection habits={[]} onToggle={vi.fn()} onRequestReflection={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("shows Привычки header with count badge", () => {
    render(
      <HabitSection habits={[habit]} onToggle={vi.fn()} onRequestReflection={vi.fn()} />
    )
    expect(screen.getByText("Привычки")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("toggles collapsed state on header click", () => {
    render(
      <HabitSection habits={[habit]} onToggle={vi.fn()} onRequestReflection={vi.fn()} />
    )
    expect(screen.getByText("Morning run")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Привычки"))
    expect(screen.queryByText("Morning run")).not.toBeInTheDocument()
  })

  it("calls onToggle and onRequestReflection when checkbox clicked on undone habit", () => {
    const onToggle = vi.fn()
    const onRequestReflection = vi.fn()
    render(
      <HabitSection
        habits={[habit]}
        onToggle={onToggle}
        onRequestReflection={onRequestReflection}
      />
    )
    fireEvent.click(screen.getByLabelText("Отметить привычку: Morning run"))
    expect(onToggle).toHaveBeenCalledWith(habit)
    expect(onRequestReflection).toHaveBeenCalledWith("h1")
  })

  it("does not call onRequestReflection when habit is already done", () => {
    const onRequestReflection = vi.fn()
    render(
      <HabitSection
        habits={[{ ...habit, done: true }]}
        onToggle={vi.fn()}
        onRequestReflection={onRequestReflection}
      />
    )
    fireEvent.click(screen.getByLabelText("Отметить привычку: Morning run"))
    expect(onRequestReflection).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/components/habits/HabitSection.test.tsx
```

Expected: 5 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/habits/
git commit -m "feat: add HabitSection component with 7-day heatmap and streak badge"
```

---

### Task 12: TaskList — integrate HabitSection

**Goal:** Render `HabitSection` above the sortable task list; exclude habit tasks from the sortable list; pass `isHabit` to `ReflectionModal`.

**Files:**
- Modify: `src/components/tasks/TaskList.tsx`

**Acceptance Criteria:**
- [ ] `HabitSection` rendered at the top of the task list with habits filtered from `tasks`
- [ ] Habit tasks do not appear in the sortable non-habit list
- [ ] `ReflectionModal` receives `isHabit` looked up from `tasks` by `reflectionTaskId`

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Import HabitSection in TaskList.tsx**

At the top of the file, add:

```ts
import { HabitSection } from "@/components/habits/HabitSection"
```

- [ ] **Step 2: Derive habits and non-habit filtered tasks inside the component**

Inside the component body, after any existing `useMemo`/computed variables, add:

```ts
const habits = tasks.filter((t) => t.isHabit)
const nonHabitFiltered = filteredTasks.filter((t) => !t.isHabit)
```

- [ ] **Step 3: Pass isHabit to ReflectionModal**

Find the `<ReflectionModal ...>` rendering. Update to look up `isHabit` from `tasks`:

```tsx
{reflectionTaskId && (
  <ReflectionModal
    taskId={reflectionTaskId}
    isHabit={tasks.find((t) => t.id === reflectionTaskId)?.isHabit ?? false}
    onClose={() => setReflectionTaskId(null)}
  />
)}
```

- [ ] **Step 4: Render HabitSection before the sortable list**

Immediately before the sortable task list JSX (the `<SortableContext>` or equivalent), add:

```tsx
<HabitSection
  habits={habits}
  onToggle={onToggle}
  onRequestReflection={setReflectionTaskId}
/>
```

- [ ] **Step 5: Use nonHabitFiltered for the sortable list**

Find where `filteredTasks` is mapped/iterated in the sortable list. Replace references to `filteredTasks` with `nonHabitFiltered`.

- [ ] **Step 6: Update SortableContext items prop**

`SortableContext` receives `items={tasks.map((t) => t.id)}` which includes habit IDs. If habit `SortableTask` wrappers are not rendered, `@dnd-kit/sortable` will warn and may misbehave. Update the `items` prop to exclude habits:

```tsx
// Before:
items={tasks.map((t) => t.id)}

// After:
items={tasks.filter((t) => !t.isHabit).map((t) => t.id)}
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/components/tasks/TaskList.tsx
git commit -m "feat: integrate HabitSection into TaskList, exclude habits from sortable list"
```

---

### Task 13: HabitCard, /habits page, and BurgerMenu link

**Goal:** Full stat card (`HabitCard`) for the `/habits` page showing 30-day heatmap, streak/completion rate, and mood trend. Add the page and a BurgerMenu navigation link.

**Files:**
- Create: `src/components/habits/HabitCard.tsx`
- Create: `src/app/habits/page.tsx`
- Modify: `src/components/BurgerMenu.tsx`

**Acceptance Criteria:**
- [ ] `HabitCard` renders habit title, 30-day heatmap, streak (daily) or completion rate (weekly/monthly), and mood trend emoji sequence
- [ ] Logs are fetched lazily via `useHabitLogs` only when the card is expanded
- [ ] `/habits` page lists all habit tasks via `useHabits`, shows `HabitCard` for each
- [ ] BurgerMenu has a "Привычки" link → `/habits` matching the existing link pattern

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [ ] **Step 1: Create src/components/habits/HabitCard.tsx**

```tsx
"use client"
import { useState } from "react"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

const MOOD_EMOJI: Record<string, string> = {
  energized: "⚡",
  neutral: "😐",
  tired: "😴",
}

function last30UtcDays(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    days.push(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    )
  }
  return days
}

function Heatmap({ logDates }: { logDates: Set<string> }) {
  const days = last30UtcDays()
  return (
    <div className="flex flex-wrap gap-0.5" aria-label="30-дневный график">
      {days.map((d) => {
        const key = d.toISOString().slice(0, 10)
        return (
          <div
            key={key}
            title={key}
            className={`w-3 h-3 rounded-sm ${
              logDates.has(key) ? "bg-purple-500" : "bg-gray-100"
            }`}
          />
        )
      })}
    </div>
  )
}

export function HabitCard({ habit }: { habit: Task }) {
  const [expanded, setExpanded] = useState(false)
  const { data: logs = [] } = useHabitLogs(expanded ? habit.id : "")

  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = expanded
    ? computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
    : null

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left flex items-center justify-between"
      >
        <span className="font-medium">{habit.title}</span>
        <span className="text-xs text-gray-400">
          {habit.recurrence === "daily"
            ? "ежедневно"
            : habit.recurrence === "weekly"
            ? "еженедельно"
            : "ежемесячно"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <Heatmap logDates={logDates} />

          <div className="flex items-center gap-4 text-sm">
            {habit.recurrence === "daily" && stats && (
              <span className="text-orange-500">🔥 Серия: {stats.streak} дн.</span>
            )}
            {stats && (
              <span className="text-gray-600">
                Выполнение: {Math.round(stats.completionRate * 100)}%
              </span>
            )}
          </div>

          {stats && stats.moodTrend.length > 0 && (
            <div className="flex gap-1" aria-label="Тренд настроения">
              {stats.moodTrend.map((mood, i) => (
                <span key={i} title={mood}>
                  {MOOD_EMOJI[mood] ?? mood}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create src/app/habits/page.tsx**

```tsx
"use client"
import { useHabits } from "@/hooks/useHabits"
import { HabitCard } from "@/components/habits/HabitCard"

export default function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 text-gray-400">
        Загрузка...
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
        <p>Нет привычек.</p>
        <p className="text-sm">Создайте задачу с повторением и включите «Привычка».</p>
      </div>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <h1 className="text-xl font-semibold mb-4">Привычки</h1>
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} />
      ))}
    </main>
  )
}
```

- [ ] **Step 3: Add Привычки link to BurgerMenu**

In `src/components/BurgerMenu.tsx`, find the section with nav links (e.g., the link to `/archive`). Add a new link immediately before or after it, following the exact same pattern:

```tsx
<Link href="/habits" onClick={close} className="...existing link class...">
  Привычки
</Link>
```

Use the exact same `className` as the existing nav links in BurgerMenu — copy it verbatim from the `/archive` link.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (existing 276 + new tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/habits/HabitCard.tsx src/app/habits/page.tsx src/components/BurgerMenu.tsx
git commit -m "feat: add HabitCard, /habits page, and BurgerMenu navigation link"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by |
|---|---|
| `isHabit` field on Task | Task 0, 1 |
| `HabitLog` model with `@@unique([taskId, date])` | Task 0 |
| `TaskReflection.habitLog` backlink | Task 0 |
| `isHabit` requires `recurrence` validation | Task 3 (PATCH), Task 4 (POST) |
| UTC midnight date for HabitLog | Task 3 (Date.UTC) |
| Idempotent upsert on double-tap | Task 3 (upsert with update: {}) |
| `GET /api/tasks?isHabit=true` | Task 2 |
| `GET /api/tasks/[id]/habit-logs` (90 days) | Task 6 |
| Reflection links to most-recent HabitLog | Task 5 |
| `nextStepTitle` ignored for habit reflections | Task 5 |
| `computeHabitStats` — streak, completionRate, moodTrend | Task 7 |
| `createdAt` cap on completion rate denominator | Task 7 |
| `useHabits`, `useHabitLogs` hooks | Task 8 |
| `AddTaskForm` isHabit toggle (visible only with recurrence) | Task 9 |
| `ReflectionModal` hides next-step for habits | Task 10 |
| `HabitSection` on tasks page (collapsible, 7-day heatmap, streak, details link) | Task 11 |
| Habits excluded from sortable task list | Task 12 |
| `HabitCard` with 30-day heatmap, stats, mood trend | Task 13 |
| `/habits` page | Task 13 |
| BurgerMenu "Привычки" link | Task 13 |

### Type consistency check

- `HabitLog` defined in `src/types/index.ts` (Task 1) — used by `computeHabitStats` (Task 7), `useHabitLogs` (Task 8), `HabitSection` (Task 11), `HabitCard` (Task 13) ✓
- `Task.isHabit: boolean` added in Task 1 — used in Tasks 2–5, 9, 11–13 ✓
- `Task.createdAt: string` added in Task 1 — used in `computeHabitStats` call sites (Tasks 11, 13) ✓
- `HabitStats` type exported from `habitStats.ts` — consumed in Tasks 11, 13 ✓
- `onRequestReflection` prop added to `HabitSection` — passed from `TaskList` (Task 12) ✓
