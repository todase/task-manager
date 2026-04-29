# Task Reflection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After marking a task done, show a compact modal for recording a short retrospective (notes, time, difficulty, mood, optional next step); save to a new `TaskReflection` model; skip is always available with no server call.

**Architecture:** New `TaskReflection` Prisma model linked to `Task` one-to-many (preserves history across recurring completions). `POST /api/tasks/[id]/reflection` creates the reflection and optionally a follow-up task in a single Prisma transaction. `ReflectionModal` is a self-contained client component managing its own form state and invalidating the TanStack Query cache on save. `TaskItem` controls modal visibility via `showReflection` local state — set to `true` only when toggling an incomplete task to done.

**Tech Stack:** Prisma (PostgreSQL), Next.js App Router API routes, React (useState), TanStack Query v5, Tailwind CSS, Vitest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `TaskReflection` model; add `reflections` relation on `Task` |
| Modify | `src/types/index.ts` | Add `TaskReflection` type |
| Create | `src/app/api/tasks/[id]/reflection/route.ts` | `POST` handler: verify ownership, create reflection + optional next task in one transaction |
| Create | `src/app/api/tasks/[id]/reflection/route.test.ts` | API unit tests |
| Create | `src/components/tasks/ReflectionModal.tsx` | Full-screen modal: all form fields, save/skip, query invalidation |
| Create | `src/components/tasks/ReflectionModal.test.tsx` | Component tests |
| Modify | `src/components/tasks/TaskItem.tsx` | Add `showReflection` state; render modal when task toggles to done |
| Modify | `src/components/tasks/TaskItem.test.tsx` | Tests for modal trigger / close |

---

### Task 1: Schema — TaskReflection model

**Goal:** Add `TaskReflection` Prisma model and apply the migration.

**Files:**
- Modify: `prisma/schema.prisma`

**Acceptance Criteria:**
- [ ] `TaskReflection` model exists with all spec fields (`notes`, `timeMinutes`, `difficulty`, `mood`, `createdAt`, cascading delete)
- [ ] `Task` model has `reflections TaskReflection[]`
- [ ] Migration applied; `npx prisma generate` exits 0

**Verify:** `npx prisma migrate status` → shows the new migration as applied

**Steps:**

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

  Add after the closing brace of the `Task` model:

  ```prisma
  model TaskReflection {
    id          String   @id @default(cuid())
    taskId      String
    task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
    notes       String?
    timeMinutes Int?
    difficulty  Int?
    mood        String?
    createdAt   DateTime @default(now())
  }
  ```

  And inside the `Task` model, add the relation field after `createdAt`:

  ```prisma
    createdAt   DateTime  @default(now())
    reflections TaskReflection[]
  ```

- [ ] **Step 2: Run migration**

  ```bash
  npx prisma migrate dev --name add_task_reflection
  ```

  Expected: `The following migration(s) have been created and applied from your Prisma schema: .../add_task_reflection`

- [ ] **Step 3: Verify Prisma client generated**

  ```bash
  npx prisma generate
  ```

  Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations/
  git commit -m "feat: add TaskReflection model to schema"
  ```

---

### Task 2: API route — POST /api/tasks/[id]/reflection

**Goal:** Implement the POST endpoint that creates a reflection and optionally a follow-up task in one transaction.

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/app/api/tasks/[id]/reflection/route.ts`
- Create: `src/app/api/tasks/[id]/reflection/route.test.ts`

**Acceptance Criteria:**
- [ ] Returns 401 for unauthenticated requests
- [ ] Returns 404 if task not found or belongs to another user
- [ ] Creates `TaskReflection` row (all fields optional, empty body valid)
- [ ] Creates follow-up `Task` in same project when `nextStepTitle` is non-empty/non-blank
- [ ] Both writes happen in a single Prisma transaction
- [ ] All tests pass

**Verify:** `npx vitest run src/app/api/tasks/\\[id\\]/reflection/route.test.ts` → all tests pass

**Steps:**

- [ ] **Step 1: Add `TaskReflection` type to `src/types/index.ts`**

  Append to the end of the file:

  ```ts
  export type TaskReflection = {
    id: string
    taskId: string
    notes: string | null
    timeMinutes: number | null
    difficulty: 1 | 2 | 3 | null
    mood: "energized" | "neutral" | "tired" | null
    createdAt: string
  }
  ```

- [ ] **Step 2: Write failing tests**

  Create `src/app/api/tasks/[id]/reflection/route.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from "vitest"
  import { auth } from "@/auth"
  import { prisma } from "@/lib/prisma"
  import { POST } from "./route"

  vi.mock("@/auth")
  vi.mock("@/lib/prisma", () => ({
    prisma: {
      task: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    },
  }))

  const mockAuth = vi.mocked(auth)
  const mockFindUnique = vi.mocked(prisma.task.findUnique)
  const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>

  function session(userId = "u1") {
    return { user: { id: userId } }
  }

  function jsonReq(body: unknown) {
    return new Request("http://localhost/api/tasks/task-1/reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  function params(id = "task-1") {
    return { params: Promise.resolve({ id }) }
  }

  const mockReflection = {
    id: "ref-1",
    taskId: "task-1",
    notes: "Went well",
    timeMinutes: 30,
    difficulty: 2,
    mood: "neutral",
    createdAt: new Date(),
  }

  beforeEach(() => vi.clearAllMocks())

  describe("POST /api/tasks/[id]/reflection", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null as never)
      const res = await POST(jsonReq({}), params())
      expect(res.status).toBe(401)
    })

    it("returns 404 when task not found", async () => {
      mockAuth.mockResolvedValue(session() as never)
      mockFindUnique.mockResolvedValue(null as never)
      const res = await POST(jsonReq({}), params())
      expect(res.status).toBe(404)
    })

    it("returns 404 when task belongs to another user", async () => {
      mockAuth.mockResolvedValue(session("u1") as never)
      mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u2", projectId: null } as never)
      const res = await POST(jsonReq({}), params())
      expect(res.status).toBe(404)
    })

    it("creates reflection without next step", async () => {
      mockAuth.mockResolvedValue(session() as never)
      mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u1", projectId: "p1" } as never)

      const reflectionCreate = vi.fn().mockResolvedValue(mockReflection)
      const taskCreate = vi.fn()
      mockTransaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({ taskReflection: { create: reflectionCreate }, task: { create: taskCreate } })
      )

      const res = await POST(
        jsonReq({ notes: "Went well", timeMinutes: 30, difficulty: 2, mood: "neutral" }),
        params()
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.reflection).toMatchObject({ id: "ref-1" })
      expect(body.nextTask).toBeUndefined()
      expect(taskCreate).not.toHaveBeenCalled()
      expect(reflectionCreate).toHaveBeenCalledWith({
        data: { taskId: "task-1", notes: "Went well", timeMinutes: 30, difficulty: 2, mood: "neutral" },
      })
    })

    it("creates reflection and next task when nextStepTitle provided", async () => {
      mockAuth.mockResolvedValue(session() as never)
      mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u1", projectId: "p1" } as never)

      const nextTask = { id: "task-2", title: "Follow up", userId: "u1", projectId: "p1", done: false }
      const reflectionCreate = vi.fn().mockResolvedValue(mockReflection)
      const taskCreate = vi.fn().mockResolvedValue(nextTask)
      mockTransaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({ taskReflection: { create: reflectionCreate }, task: { create: taskCreate } })
      )

      const res = await POST(jsonReq({ nextStepTitle: "Follow up" }), params())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.nextTask).toMatchObject({ title: "Follow up" })
      expect(taskCreate).toHaveBeenCalledWith({
        data: { title: "Follow up", userId: "u1", projectId: "p1", done: false },
      })
    })

    it("ignores blank nextStepTitle", async () => {
      mockAuth.mockResolvedValue(session() as never)
      mockFindUnique.mockResolvedValue({ id: "task-1", userId: "u1", projectId: null } as never)

      const reflectionCreate = vi.fn().mockResolvedValue(mockReflection)
      const taskCreate = vi.fn()
      mockTransaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({ taskReflection: { create: reflectionCreate }, task: { create: taskCreate } })
      )

      const res = await POST(jsonReq({ nextStepTitle: "   " }), params())
      expect(res.status).toBe(200)
      expect(taskCreate).not.toHaveBeenCalled()
    })
  })
  ```

- [ ] **Step 3: Run tests to confirm they fail**

  ```bash
  npx vitest run src/app/api/tasks/\\[id\\]/reflection/route.test.ts
  ```

  Expected: FAIL — route file does not exist

- [ ] **Step 4: Implement the route**

  Create `src/app/api/tasks/[id]/reflection/route.ts`:

  ```ts
  import { NextResponse } from "next/server"
  import { getUserId } from "@/lib/api-auth"
  import { prisma } from "@/lib/prisma"

  export async function POST(
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
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { notes, timeMinutes, difficulty, mood, nextStepTitle } = await req.json()

    const result = await prisma.$transaction(async (tx) => {
      const reflection = await tx.taskReflection.create({
        data: {
          taskId: id,
          notes: notes ?? null,
          timeMinutes: timeMinutes ?? null,
          difficulty: difficulty ?? null,
          mood: mood ?? null,
        },
      })

      let nextTask: Awaited<ReturnType<typeof tx.task.create>> | undefined
      if (nextStepTitle?.trim()) {
        nextTask = await tx.task.create({
          data: {
            title: nextStepTitle.trim(),
            userId,
            projectId: task.projectId,
            done: false,
          },
        })
      }

      return { reflection, nextTask }
    })

    return NextResponse.json(result)
  }
  ```

- [ ] **Step 5: Run tests to confirm they pass**

  ```bash
  npx vitest run src/app/api/tasks/\\[id\\]/reflection/route.test.ts
  ```

  Expected: all 6 tests pass

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/api/tasks/\\[id\\]/reflection/ src/types/index.ts
  git commit -m "feat: add POST /api/tasks/[id]/reflection endpoint"
  ```

---

### Task 3: ReflectionModal component

**Goal:** Build the compact full-screen modal with all form fields; POST on save, close without POST on skip/overlay click, invalidate tasks query after save.

**Files:**
- Create: `src/components/tasks/ReflectionModal.tsx`
- Create: `src/components/tasks/ReflectionModal.test.tsx`

**Acceptance Criteria:**
- [ ] Renders all 5 field controls: notes textarea, time input, 3 difficulty emoji buttons, 3 mood chips, next step text input
- [ ] Skip button and overlay click both close without POST
- [ ] Save POSTs to `/api/tasks/{taskId}/reflection`, invalidates `["tasks"]` query, calls `onClose`
- [ ] Form values are serialized correctly in the POST body
- [ ] All tests pass

**Verify:** `npx vitest run src/components/tasks/ReflectionModal.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Write failing tests**

  Create `src/components/tasks/ReflectionModal.test.tsx`:

  ```tsx
  // @vitest-environment jsdom
  import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
  import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
  import { ReflectionModal } from "./ReflectionModal"
  import { apiFetch } from "@/lib/apiFetch"
  import { useQueryClient } from "@tanstack/react-query"

  vi.mock("@/lib/apiFetch")
  vi.mock("@tanstack/react-query", () => ({
    useQueryClient: vi.fn(),
  }))

  const mockApiFetch = vi.mocked(apiFetch)
  const mockUseQueryClient = vi.mocked(useQueryClient)

  afterEach(cleanup)

  describe("ReflectionModal", () => {
    const onClose = vi.fn()
    const invalidateQueries = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
      mockApiFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response)
      mockUseQueryClient.mockReturnValue({ invalidateQueries } as never)
    })

    it("renders all form fields", () => {
      render(<ReflectionModal taskId="task-1" onClose={onClose} />)
      expect(screen.getByPlaceholderText(/Что узнал/)).toBeInTheDocument()
      expect(screen.getByLabelText("мин")).toBeInTheDocument()
      expect(screen.getByText("😊")).toBeInTheDocument()
      expect(screen.getByText("😐")).toBeInTheDocument()
      expect(screen.getByText("😤")).toBeInTheDocument()
      expect(screen.getByText("зарядился")).toBeInTheDocument()
      expect(screen.getByText("нейтрально")).toBeInTheDocument()
      expect(screen.getByText("устал")).toBeInTheDocument()
    })

    it("calls onClose without POST when Пропустить is clicked", () => {
      render(<ReflectionModal taskId="task-1" onClose={onClose} />)
      fireEvent.click(screen.getByText("Пропустить"))
      expect(onClose).toHaveBeenCalled()
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it("calls onClose without POST when overlay is clicked", () => {
      render(<ReflectionModal taskId="task-1" onClose={onClose} />)
      fireEvent.click(screen.getByTestId("reflection-overlay"))
      expect(onClose).toHaveBeenCalled()
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it("POSTs, invalidates tasks query, and closes on save", async () => {
      render(<ReflectionModal taskId="task-1" onClose={onClose} />)
      fireEvent.click(screen.getByText("Сохранить рефлексию"))

      await waitFor(() =>
        expect(mockApiFetch).toHaveBeenCalledWith(
          "/api/tasks/task-1/reflection",
          expect.objectContaining({ method: "POST" })
        )
      )
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] })
      expect(onClose).toHaveBeenCalled()
    })

    it("sends form values in POST body", async () => {
      render(<ReflectionModal taskId="task-1" onClose={onClose} />)

      fireEvent.change(screen.getByPlaceholderText(/Что узнал/), {
        target: { value: "Learned a lot" },
      })
      fireEvent.change(screen.getByLabelText("мин"), { target: { value: "45" } })
      fireEvent.click(screen.getByText("😊"))
      fireEvent.click(screen.getByText("зарядился"))
      fireEvent.click(screen.getByText("Сохранить рефлексию"))

      await waitFor(() => expect(mockApiFetch).toHaveBeenCalled())
      const [, init] = mockApiFetch.mock.calls[0]
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body.notes).toBe("Learned a lot")
      expect(body.timeMinutes).toBe(45)
      expect(body.difficulty).toBe(1)
      expect(body.mood).toBe("energized")
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/components/tasks/ReflectionModal.test.tsx
  ```

  Expected: FAIL — component file does not exist

- [ ] **Step 3: Implement the component**

  Create `src/components/tasks/ReflectionModal.tsx`:

  ```tsx
  "use client"

  import { useState } from "react"
  import { useQueryClient } from "@tanstack/react-query"
  import { apiFetch } from "@/lib/apiFetch"

  interface ReflectionModalProps {
    taskId: string
    onClose: () => void
  }

  const DIFFICULTY_OPTIONS: [1 | 2 | 3, string][] = [
    [1, "😊"],
    [2, "😐"],
    [3, "😤"],
  ]

  const MOOD_OPTIONS: ["energized" | "neutral" | "tired", string][] = [
    ["energized", "зарядился"],
    ["neutral", "нейтрально"],
    ["tired", "устал"],
  ]

  export function ReflectionModal({ taskId, onClose }: ReflectionModalProps) {
    const [notes, setNotes] = useState("")
    const [timeMinutes, setTimeMinutes] = useState("")
    const [difficulty, setDifficulty] = useState<1 | 2 | 3 | null>(null)
    const [mood, setMood] = useState<"energized" | "neutral" | "tired" | null>(null)
    const [nextStepTitle, setNextStepTitle] = useState("")
    const [saving, setSaving] = useState(false)
    const queryClient = useQueryClient()

    async function handleSave() {
      setSaving(true)
      try {
        await apiFetch(`/api/tasks/${taskId}/reflection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: notes || undefined,
            timeMinutes: timeMinutes ? Number(timeMinutes) : undefined,
            difficulty: difficulty ?? undefined,
            mood: mood ?? undefined,
            nextStepTitle: nextStepTitle || undefined,
          }),
        })
        await queryClient.invalidateQueries({ queryKey: ["tasks"] })
      } finally {
        setSaving(false)
        onClose()
      }
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        data-testid="reflection-overlay"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm mx-4 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-base font-semibold text-gray-800">Рефлексия</h2>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Что узнал, что удивило, что пошло не так..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-700 resize-none outline-none focus:border-blue-400"
          />

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(e.target.value)}
              placeholder="0"
              min={0}
              aria-label="мин"
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
            />
            <span className="text-sm text-gray-500">мин</span>
          </div>

          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(([val, emoji]) => (
              <button
                key={val}
                type="button"
                onClick={() => setDifficulty(difficulty === val ? null : val)}
                className={`text-xl px-3 py-1.5 rounded-lg border transition-colors ${
                  difficulty === val
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {MOOD_OPTIONS.map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setMood(mood === val ? null : val)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  mood === val
                    ? "border-blue-400 bg-blue-50 text-blue-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={nextStepTitle}
              onChange={(e) => setNextStepTitle(e.target.value)}
              placeholder="Следующий шаг..."
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
            />
            <p className="text-xs text-gray-400">Появится в том же проекте</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-blue-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-600 disabled:opacity-60"
            >
              Сохранить рефлексию
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:border-gray-400"
            >
              Пропустить
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run tests**

  ```bash
  npx vitest run src/components/tasks/ReflectionModal.test.tsx
  ```

  Expected: all 5 tests pass

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/tasks/ReflectionModal.tsx src/components/tasks/ReflectionModal.test.tsx
  git commit -m "feat: add ReflectionModal component"
  ```

---

### Task 4: Wire TaskItem — show modal on task completion

**Goal:** Make `TaskItem` show `ReflectionModal` when a task is toggled from undone to done.

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`
- Modify: `src/components/tasks/TaskItem.test.tsx`

**Acceptance Criteria:**
- [ ] Toggling an incomplete task to done renders `ReflectionModal`
- [ ] Toggling a done task to undone does NOT render `ReflectionModal`
- [ ] Calling `onClose` on the modal removes it from the DOM
- [ ] All existing tests still pass

**Verify:** `npx vitest run src/components/tasks/TaskItem.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Add mock for ReflectionModal in the test file**

  In `src/components/tasks/TaskItem.test.tsx`, add this alongside the other `vi.mock(...)` calls near the top of the file:

  ```tsx
  vi.mock("@/components/tasks/ReflectionModal", () => ({
    ReflectionModal: ({ onClose }: { taskId: string; onClose: () => void }) => (
      <div data-testid="reflection-modal">
        <button onClick={onClose}>close-modal</button>
      </div>
    ),
  }))
  ```

- [ ] **Step 2: Write failing tests**

  Append this `describe` block to the bottom of `src/components/tasks/TaskItem.test.tsx`:

  ```tsx
  describe("ReflectionModal trigger", () => {
    it("shows ReflectionModal when toggling incomplete task to done", async () => {
      render(<TaskItem {...defaultProps} task={makeTask({ done: false })} />)
      fireEvent.click(screen.getByLabelText("Отметить выполненной"))
      await waitFor(() =>
        expect(screen.getByTestId("reflection-modal")).toBeInTheDocument()
      )
    })

    it("does not show ReflectionModal when toggling done task to undone", () => {
      render(<TaskItem {...defaultProps} task={makeTask({ done: true })} />)
      fireEvent.click(screen.getByLabelText("Отметить невыполненной"))
      expect(screen.queryByTestId("reflection-modal")).not.toBeInTheDocument()
    })

    it("closes ReflectionModal when onClose is called", async () => {
      render(<TaskItem {...defaultProps} task={makeTask({ done: false })} />)
      fireEvent.click(screen.getByLabelText("Отметить выполненной"))
      await waitFor(() =>
        expect(screen.getByTestId("reflection-modal")).toBeInTheDocument()
      )
      fireEvent.click(screen.getByText("close-modal"))
      expect(screen.queryByTestId("reflection-modal")).not.toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 3: Run tests to confirm new tests fail**

  ```bash
  npx vitest run src/components/tasks/TaskItem.test.tsx
  ```

  Expected: 3 new tests FAIL — modal not yet wired in

- [ ] **Step 4: Modify `src/components/tasks/TaskItem.tsx`**

  **Add import** alongside the existing imports at the top of the file:

  ```tsx
  import { ReflectionModal } from "@/components/tasks/ReflectionModal"
  ```

  **Add state** inside the component function, alongside the existing `useState` calls:

  ```tsx
  const [showReflection, setShowReflection] = useState(false)
  ```

  **Update the toggle button's `onClick`** (the button with `aria-label={task.done ? "Отметить невыполненной" : "Отметить выполненной"}`):

  ```tsx
  onClick={(e) => {
    e.stopPropagation()
    onToggle(task)
    if (!task.done) setShowReflection(true)
  }}
  ```

  **Add modal render** at the end of the returned fragment, just before the closing `</>`:

  ```tsx
      </div>
      {showReflection && (
        <ReflectionModal
          taskId={task.id}
          onClose={() => setShowReflection(false)}
        />
      )}
    </>
  ```

- [ ] **Step 5: Run TaskItem tests**

  ```bash
  npx vitest run src/components/tasks/TaskItem.test.tsx
  ```

  Expected: all tests pass (existing + 3 new)

- [ ] **Step 6: Run full test suite**

  ```bash
  npx vitest run
  ```

  Expected: all tests pass, no regressions

- [ ] **Step 7: Commit**

  ```bash
  git add src/components/tasks/TaskItem.tsx src/components/tasks/TaskItem.test.tsx
  git commit -m "feat: show ReflectionModal after marking task as done"
  ```
