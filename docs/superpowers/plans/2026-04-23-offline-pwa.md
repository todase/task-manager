# Offline PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add full offline support via TanStack Query v5 + IndexedDB — tasks readable and writable without a network connection, with automatic background sync on reconnect.

**Architecture:** TanStack Query replaces the custom `useState`/`fetch` hooks. A `PersistQueryClientProvider` serialises the query cache and mutation queue to IndexedDB via `idb-keyval`, so data survives offline sessions and page reloads. The public interface of all hooks stays unchanged so no component refactoring is needed. Offline project/tag mutations are explicitly blocked to avoid temp-ID complexity for those resources.

**Tech Stack:** `@tanstack/react-query` v5, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `idb-keyval`, existing `@ducanh2912/next-pwa`

**Spec:** `docs/superpowers/specs/2026-04-23-offline-pwa-design.md`

---

### Task 1: Install dependencies and create lib files

**Goal:** Add TanStack Query packages, create `queryClient.ts` and `persister.ts`, add env var for cache versioning.

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/lib/queryClient.ts`
- Create: `src/lib/persister.ts`
- Modify: `.env.local` (add `NEXT_PUBLIC_CACHE_VERSION`)
- Modify: `.env.example` (if it exists — add the same var)

**Acceptance Criteria:**
- [x] `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `idb-keyval` present in `node_modules`
- [x] `queryClient.ts` exports a singleton `QueryClient` with `networkMode: 'offlineFirst'`, `staleTime: 30_000`, `gcTime: 86_400_000`
- [x] `persister.ts` exports a `persister` backed by `idb-keyval`
- [x] `NEXT_PUBLIC_CACHE_VERSION=1` in `.env.local`

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [x] **Step 1: Install packages**

```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister idb-keyval
```

- [x] **Step 2: Create `src/lib/queryClient.ts`**

```ts
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 30_000,
      gcTime: 86_400_000,
      retry: 1,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
})
```

- [x] **Step 3: Create `src/lib/persister.ts`**

```ts
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"
import { get, set, del } from "idb-keyval"

export const CACHE_KEY = "rq-task-cache"

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key: string) => get<string>(key).then((v) => v ?? null),
    setItem: (key: string, value: string) => set(key, value),
    removeItem: (key: string) => del(key),
  },
  key: CACHE_KEY,
})
```

- [x] **Step 4: Add env var**

In `.env.local` add:
```
NEXT_PUBLIC_CACHE_VERSION=1
```

If `.env.example` exists, add the same line there.

- [x] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 6: Commit**

```bash
git add src/lib/queryClient.ts src/lib/persister.ts .env.local package.json package-lock.json
git commit -m "feat: add TanStack Query + IndexedDB persister lib"
```

---

### Task 2: Providers setup and SW NetworkOnly config

**Goal:** Wrap the app in `PersistQueryClientProvider` and configure the service worker to pass `/api/*` requests directly to the network (bypassing SW cache).

**Files:**
- Modify: `src/app/providers.tsx`
- Modify: `next.config.ts`

**Acceptance Criteria:**
- [x] `providers.tsx` wraps children in `PersistQueryClientProvider` with the singleton `queryClient` and `persister`
- [x] `next.config.ts` has a `runtimeCaching` rule for `/api/` with handler `'NetworkOnly'`
- [x] `npx tsc --noEmit` passes

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [x] **Step 1: Update `src/app/providers.tsx`**

```tsx
"use client"

import { SessionProvider } from "next-auth/react"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { queryClient } from "@/lib/queryClient"
import { persister } from "@/lib/persister"

const CACHE_BUSTER = process.env.NEXT_PUBLIC_CACHE_VERSION ?? "1"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER }}
    >
      <SessionProvider>{children}</SessionProvider>
    </PersistQueryClientProvider>
  )
}
```

- [x] **Step 2: Update `next.config.ts`**

```ts
import type { NextConfig } from "next"
import withPWA from "@ducanh2912/next-pwa"

const nextConfig: NextConfig = {}

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^\/api\//,
      handler: "NetworkOnly",
    },
  ],
})(nextConfig)
```

- [x] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [x] **Step 4: Commit**

```bash
git add src/app/providers.tsx next.config.ts
git commit -m "feat: wrap app in PersistQueryClientProvider, exclude /api/ from SW cache"
```

---

### Task 3: useOnlineStatus hook

**Goal:** Create a hook that tracks `navigator.onLine` and reacts to `online`/`offline` window events.

**Files:**
- Create: `src/hooks/useOnlineStatus.ts`
- Create: `src/hooks/useOnlineStatus.test.ts`

**Acceptance Criteria:**
- [x] Returns `true` when online, `false` when offline
- [x] Updates reactively when `online`/`offline` events fire
- [x] Handles SSR (no `navigator` available) by defaulting to `true`
- [x] 3 tests pass

**Verify:** `npx vitest run src/hooks/useOnlineStatus.test.ts` → 3 passed

**Steps:**

- [x] **Step 1: Write tests first**

Create `src/hooks/useOnlineStatus.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useOnlineStatus } from "./useOnlineStatus"

describe("useOnlineStatus", () => {
  it("returns true when navigator.onLine is true", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it("updates to false when offline event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
    const { result } = renderHook(() => useOnlineStatus())
    act(() => { window.dispatchEvent(new Event("offline")) })
    expect(result.current).toBe(false)
  })

  it("updates to true when online event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true })
    const { result } = renderHook(() => useOnlineStatus())
    act(() => { window.dispatchEvent(new Event("online")) })
    expect(result.current).toBe(true)
  })
})
```

- [x] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/hooks/useOnlineStatus.test.ts
```

Expected: fails with "Cannot find module './useOnlineStatus'"

- [x] **Step 3: Implement `src/hooks/useOnlineStatus.ts`**

```ts
"use client"

import { useState, useEffect } from "react"

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator !== "undefined" ? navigator.onLine : true)
  )

  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener("online", up)
    window.addEventListener("offline", down)
    return () => {
      window.removeEventListener("online", up)
      window.removeEventListener("offline", down)
    }
  }, [])

  return isOnline
}
```

- [x] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/hooks/useOnlineStatus.test.ts
```

Expected: 3 passed

- [x] **Step 5: Commit**

```bash
git add src/hooks/useOnlineStatus.ts src/hooks/useOnlineStatus.test.ts
git commit -m "feat: add useOnlineStatus hook"
```

---

### Task 4: mutationQueue utility (temp ID remapping)

**Goal:** Create `remapMutationQueue(tempId, realId)` — replaces all occurrences of a temp ID in the persisted IndexedDB mutation cache, covering both JSON body fields and URL path segments.

**Files:**
- Create: `src/lib/mutationQueue.ts`
- Create: `src/lib/mutationQueue.test.ts`

**Acceptance Criteria:**
- [x] Replaces all occurrences of `tempId` with `realId` in the cached JSON string
- [x] Is a no-op when cache is empty or doesn't contain `tempId`
- [x] 3 tests pass

**Verify:** `npx vitest run src/lib/mutationQueue.test.ts` → 3 passed

**Steps:**

- [x] **Step 1: Write tests first**

Create `src/lib/mutationQueue.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { remapMutationQueue } from "./mutationQueue"

vi.mock("idb-keyval", () => ({
  get: vi.fn(),
  set: vi.fn(),
}))

import * as idbKeyval from "idb-keyval"

beforeEach(() => vi.clearAllMocks())

describe("remapMutationQueue", () => {
  it("replaces tempId with realId everywhere in the cached JSON", async () => {
    const cache = JSON.stringify({
      clientState: {
        mutations: [
          {
            variables: { id: "tmp_abc-123" },
            url: "/api/tasks/tmp_abc-123/subtasks",
          },
        ],
      },
    })
    vi.mocked(idbKeyval.get).mockResolvedValue(cache)
    vi.mocked(idbKeyval.set).mockResolvedValue(undefined)

    await remapMutationQueue("tmp_abc-123", "real-server-id")

    const written = vi.mocked(idbKeyval.set).mock.calls[0][1] as string
    expect(written).not.toContain("tmp_abc-123")
    expect(written).toContain("real-server-id")
  })

  it("does nothing when cache is empty", async () => {
    vi.mocked(idbKeyval.get).mockResolvedValue(undefined)
    await remapMutationQueue("tmp_abc-123", "real-server-id")
    expect(idbKeyval.set).not.toHaveBeenCalled()
  })

  it("does nothing when tempId is not present in cache", async () => {
    vi.mocked(idbKeyval.get).mockResolvedValue(JSON.stringify({ some: "other data" }))
    await remapMutationQueue("tmp_abc-123", "real-server-id")
    expect(idbKeyval.set).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/mutationQueue.test.ts
```

Expected: fails with "Cannot find module './mutationQueue'"

- [x] **Step 3: Implement `src/lib/mutationQueue.ts`**

```ts
import { get, set } from "idb-keyval"
import { CACHE_KEY } from "./persister"

export async function remapMutationQueue(tempId: string, realId: string): Promise<void> {
  const raw = await get<string>(CACHE_KEY)
  if (!raw) return
  if (!raw.includes(tempId)) return
  await set(CACHE_KEY, raw.replaceAll(tempId, realId))
}
```

- [x] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/mutationQueue.test.ts
```

Expected: 3 passed

- [x] **Step 5: Commit**

```bash
git add src/lib/mutationQueue.ts src/lib/mutationQueue.test.ts
git commit -m "feat: add remapMutationQueue utility for offline temp ID remapping"
```

---

### Task 5: Extract taskUtils and create useTaskQueries

**Goal:** Move pure utilities out of `useTasks.ts` into `src/hooks/taskUtils.ts` to avoid circular imports, then create `useTaskQueries.ts` backed by `useQuery`.

**Files:**
- Create: `src/hooks/taskUtils.ts`
- Create: `src/hooks/useTaskQueries.ts`
- Create: `src/hooks/useTaskQueries.test.ts`

**Acceptance Criteria:**
- [x] `taskUtils.ts` exports `buildTasksUrl`, `withPriorityScores`, `filterTasks`, `TaskFilters`, `CreateTaskInput`
- [x] `useTaskQueries` returns `{ tasks, isLoading, error }` from `useQuery`
- [x] Existing `useTasks.test.ts` still passes (it imports from `useTasks` which will re-export from `taskUtils`)
- [x] 2 new tests pass for `useTaskQueries`

**Verify:** `npx vitest run src/hooks/useTaskQueries.test.ts src/hooks/useTasks.test.ts` → all pass

**Steps:**

- [x] **Step 1: Create `src/hooks/taskUtils.ts`**

Copy these exports verbatim from the current `src/hooks/useTasks.ts`:

```ts
export type TaskFilters = {
  done?: boolean
  q?: string
  sort?: "order" | "createdAt_desc"
}

export type CreateTaskInput = {
  title: string
  dueDate?: string
  recurrence?: string
  projectId?: string
  tagIds?: string[]
}

export function buildTasksUrl(filters: TaskFilters): string {
  const params = new URLSearchParams()
  if (filters.done !== undefined) params.set("done", String(filters.done))
  if (filters.q) params.set("q", filters.q)
  if (filters.sort) params.set("sort", filters.sort)
  const str = params.toString()
  return str ? `/api/tasks?${str}` : "/api/tasks"
}

import type { Task, DateFilter } from "@/types"

export function withPriorityScores(tasks: Omit<Task, "priorityScore">[]): Task[] {
  const n = tasks.length
  return tasks.map((t) => ({
    ...t,
    priorityScore: n <= 1 ? 1 : 1 - t.order / (n - 1),
  }))
}

export function filterTasks(
  tasks: Task[],
  dateFilter: DateFilter,
  activeProjectId: string | null
): Task[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  return tasks.filter((t) => {
    if (activeProjectId && t.project?.id !== activeProjectId) return false
    if (dateFilter === "today") {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    }
    if (dateFilter === "week") {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      d.setHours(0, 0, 0, 0)
      return d.getTime() > today.getTime() && d < weekEnd
    }
    if (dateFilter === "someday") {
      if (!t.dueDate) return true
      return new Date(t.dueDate) >= weekEnd
    }
    return true
  })
}
```

- [x] **Step 2: Write tests for `useTaskQueries`**

Create `src/hooks/useTaskQueries.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTaskQueries } from "./useTaskQueries"
import type { Task } from "@/types"

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1", title: "Test", done: false, dueDate: null, recurrence: null,
    description: null, order: 0, project: null, subtasks: [], tags: [], priorityScore: 1,
    ...overrides,
  }
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return Wrapper
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe("useTaskQueries", () => {
  it("returns tasks from API", async () => {
    const tasks = [makeTask({ id: "1" }), makeTask({ id: "2" })]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(tasks),
    }))
    const { result } = renderHook(() => useTaskQueries(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tasks).toHaveLength(2))
    expect(result.current.error).toBeNull()
  })

  it("returns error string when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const { result } = renderHook(() => useTaskQueries(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.error).toBeTruthy())
  })
})
```

- [x] **Step 3: Run tests — expect FAIL**

```bash
npx vitest run src/hooks/useTaskQueries.test.ts
```

Expected: fails with "Cannot find module './useTaskQueries'"

- [x] **Step 4: Implement `src/hooks/useTaskQueries.ts`**

```ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { buildTasksUrl, withPriorityScores, type TaskFilters } from "./taskUtils"

export function useTaskQueries(filters: TaskFilters = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const res = await fetch(buildTasksUrl(filters))
      if (!res.ok) throw new Error("Не удалось загрузить задачи")
      return withPriorityScores(await res.json())
    },
  })

  return {
    tasks: data ?? [],
    isLoading: isLoading && !data,
    error: error ? (error instanceof Error ? error.message : "Ошибка загрузки задач") : null,
  }
}
```

- [x] **Step 5: Run all relevant tests — expect PASS**

```bash
npx vitest run src/hooks/useTaskQueries.test.ts src/hooks/useTasks.test.ts
```

Note: `useTasks.test.ts` imports `filterTasks`, `buildTasksUrl`, `withPriorityScores` from `./useTasks` — those still live in `useTasks.ts` for now and won't break until Task 7.

Expected: all pass

- [x] **Step 6: Commit**

```bash
git add src/hooks/taskUtils.ts src/hooks/useTaskQueries.ts src/hooks/useTaskQueries.test.ts
git commit -m "feat: extract taskUtils, add useTaskQueries backed by TanStack Query"
```

---

### Task 6: useTaskMutations

**Goal:** Create `useTaskMutations.ts` with all 14 task mutation functions, optimistic updates, rollback on error, and temp ID handling for `createTask`.

**Files:**
- Create: `src/hooks/useTaskMutations.ts`
- Create: `src/hooks/useTaskMutations.test.ts`

**Acceptance Criteria:**
- [x] All 14 mutation functions exist with correct signatures matching current `useTasks` return
- [x] `createTask` generates a temp ID, applies optimistic update, calls `remapMutationQueue` on success
- [x] `toggleTask` applies optimistic toggle, rolls back on error
- [x] `reorderTasks` applies optimistic reorder, rolls back on error
- [x] 4 tests pass

**Verify:** `npx vitest run src/hooks/useTaskMutations.test.ts` → 4 passed

**Steps:**

- [x] **Step 1: Write tests**

Create `src/hooks/useTaskMutations.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTaskMutations } from "./useTaskMutations"
import type { Task } from "@/types"

vi.mock("@/lib/mutationQueue", () => ({ remapMutationQueue: vi.fn() }))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1", title: "Test", done: false, dueDate: null, recurrence: null,
    description: null, order: 0, project: null, subtasks: [], tags: [], priorityScore: 1,
    ...overrides,
  }
}

function makeWrapper(initialTasks: Task[] = []) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  qc.setQueryData(["tasks", {}], initialTasks)
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, Wrapper }
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe("useTaskMutations — createTask", () => {
  it("adds a temp task optimistically before server responds", async () => {
    const serverTask = makeTask({ id: "server-1", title: "New" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(serverTask) }))
    const { qc, Wrapper } = makeWrapper([])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    act(() => { result.current.createTask({ title: "New" }, []) })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks.some((t) => t.title === "New")).toBe(true)
    })
  })
})

describe("useTaskMutations — toggleTask", () => {
  it("optimistically flips done and rolls back on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const task = makeTask({ done: false })
    const { qc, Wrapper } = makeWrapper([task])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    await act(async () => {
      try { await result.current.toggleTask(task) } catch { /* expected */ }
    })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks.find((t) => t.id === "t1")?.done).toBe(false)
    })
  })
})

describe("useTaskMutations — deleteTask", () => {
  it("removes task from cache on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
    const task = makeTask()
    const { qc, Wrapper } = makeWrapper([task])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    await act(async () => { await result.current.deleteTask("t1") })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks).toHaveLength(0)
    })
  })
})

describe("useTaskMutations — reorderTasks", () => {
  it("applies new order optimistically and rolls back on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const t1 = makeTask({ id: "t1", order: 0 })
    const t2 = makeTask({ id: "t2", order: 1 })
    const { qc, Wrapper } = makeWrapper([t1, t2])
    const { result } = renderHook(() => useTaskMutations({}), { wrapper: Wrapper })

    await act(async () => {
      try { await result.current.reorderTasks([t2, t1]) } catch { /* expected */ }
    })

    await waitFor(() => {
      const tasks = qc.getQueryData<Task[]>(["tasks", {}]) ?? []
      expect(tasks[0].id).toBe("t1")
    })
  })
})
```

- [x] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/hooks/useTaskMutations.test.ts
```

Expected: fails with "Cannot find module './useTaskMutations'"

- [x] **Step 3: Implement `src/hooks/useTaskMutations.ts`**

```ts
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { withPriorityScores, type CreateTaskInput, type TaskFilters } from "./taskUtils"
import { remapMutationQueue } from "@/lib/mutationQueue"
import type { Task, Subtask, Project } from "@/types"

import type { QueryKey, QueryClient } from "@tanstack/react-query"
type Snapshot = [QueryKey, Task[] | undefined][]

function snapshot(qc: QueryClient): Snapshot {
  return qc.getQueriesData<Task[]>({ queryKey: ["tasks"] })
}

function restore(qc: QueryClient, snap: Snapshot) {
  snap.forEach(([key, data]) => qc.setQueryData(key, data))
}

export function useTaskMutations(_filters: TaskFilters = {}) {
  const qc = useQueryClient()

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] })

  // ─── createTask ───────────────────────────────────────────────
  const { mutateAsync: createTask } = useMutation({
    mutationKey: ["createTask"],
    mutationFn: async ({ input }: { input: CreateTaskInput; projects: Project[] }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error("Не удалось создать задачу")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ input, projects }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      const tempId = `tmp_${crypto.randomUUID()}`
      const project = input.projectId
        ? (projects.find((p) => p.id === input.projectId) ?? null)
        : null
      const tempTask: Task = {
        id: tempId, title: input.title, done: false,
        dueDate: input.dueDate ?? null, recurrence: input.recurrence ?? null,
        description: null, order: 0, project, subtasks: [], tags: [], priorityScore: 1,
      }
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => {
        if (!old) return [tempTask]
        return withPriorityScores([tempTask, ...old.map((t) => ({ ...t, order: t.order + 1 }))])
      })
      return { snap, tempId }
    },
    onSuccess: async (serverTask, _, ctx) => {
      if (!ctx) return
      await remapMutationQueue(ctx.tempId, serverTask.id)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === ctx.tempId
            ? { ...serverTask, subtasks: [], tags: serverTask.tags ?? [], priorityScore: t.priorityScore }
            : t
        )
      )
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── toggleTask ───────────────────────────────────────────────
  const { mutateAsync: toggleTask } = useMutation({
    mutationFn: async (task: Task) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      })
      if (!res.ok) throw new Error("Не удалось изменить статус задачи")
      return res.json() as Promise<Task>
    },
    onMutate: async (task) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── deleteTask ───────────────────────────────────────────────
  const { mutateAsync: deleteTask } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить задачу")
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        withPriorityScores(old?.filter((t) => t.id !== id) ?? [])
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── renameTask ───────────────────────────────────────────────
  const { mutateAsync: renameTask } = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Не удалось переименовать задачу")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, title } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── updateDueDate ────────────────────────────────────────────
  const { mutateAsync: updateDueDate } = useMutation({
    mutationFn: async ({ taskId, value }: { taskId: string; value: string }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: value ? new Date(value).toISOString() : null }),
      })
      if (!res.ok) throw new Error("Не удалось обновить дату задачи")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ taskId, value }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId ? { ...t, dueDate: value ? new Date(value).toISOString() : null } : t
        )
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── reorderTasks ─────────────────────────────────────────────
  const { mutateAsync: reorderTasks } = useMutation({
    mutationFn: async (newTasks: Task[]) => {
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTasks.map((t, i) => ({ id: t.id, order: i }))),
      })
      if (!res.ok) throw new Error("Не удалось изменить порядок задач")
    },
    onMutate: async (newTasks) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, () =>
        withPriorityScores(newTasks.map((t, i) => ({ ...t, order: i })))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── assignProject ────────────────────────────────────────────
  const { mutateAsync: assignProject } = useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: string; projectId: string | null; newProject: { id: string; title: string; icon: string } | null }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      if (!res.ok) throw new Error("Не удалось назначить проект")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ taskId, newProject }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, project: newProject } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── updateDescription ────────────────────────────────────────
  const { mutateAsync: updateDescription } = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      })
      if (!res.ok) throw new Error("Не удалось обновить описание")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ id, description }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, description } : t))
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── updateTags ───────────────────────────────────────────────
  const { mutateAsync: updateTagsMutation } = useMutation({
    mutationFn: async ({ id, tagIds }: { id: string; tagIds: string[] }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      })
      if (!res.ok) throw new Error("Не удалось обновить метки")
      return res.json() as Promise<Task>
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      return { snap, id }
    },
    onSuccess: (updated, { id }) => {
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, tags: updated.tags } : t))
      )
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── restoreTask ──────────────────────────────────────────────
  const { mutateAsync: restoreTask } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: false }),
      })
      if (!res.ok) throw new Error("Не удалось восстановить задачу")
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.filter((t) => t.id !== id)
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── clearArchive ─────────────────────────────────────────────
  const { mutateAsync: clearArchive } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tasks?done=true", { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось очистить архив")
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, () => [])
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── addSubtask ───────────────────────────────────────────────
  const { mutateAsync: addSubtask } = useMutation({
    mutationKey: ["addSubtask"],
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (!res.ok) throw new Error("Не удалось добавить подзадачу")
      return res.json() as Promise<Subtask>
    },
    onSuccess: (subtask, { taskId }) => {
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t
        )
      )
    },
    onSettled: invalidate,
  })

  // ─── toggleSubtask ────────────────────────────────────────────
  const { mutateAsync: toggleSubtask } = useMutation({
    mutationFn: async ({ taskId, subtask }: { taskId: string; subtask: Subtask }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !subtask.done }),
      })
      if (!res.ok) throw new Error("Не удалось изменить статус подзадачи")
      return res.json() as Promise<Subtask>
    },
    onMutate: async ({ taskId, subtask }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtask.id ? { ...s, done: !s.done } : s)) }
            : t
        )
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── deleteSubtask ────────────────────────────────────────────
  const { mutateAsync: deleteSubtask } = useMutation({
    mutationFn: async ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить подзадачу")
    },
    onMutate: async ({ taskId, subtaskId }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] })
      const snap = snapshot(qc)
      qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
        old?.map((t) =>
          t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
        )
      )
      return { snap }
    },
    onError: (_, __, ctx) => { if (ctx) restore(qc, ctx.snap) },
    onSettled: invalidate,
  })

  // ─── helpers (no-op wrappers kept for interface compat) ───────
  const removeProjectTasks = (projectId: string) => {
    qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
      old?.filter((t) => t.project?.id !== projectId)
    )
  }

  const syncProjectRename = (updated: { id: string; title: string; icon: string }) => {
    qc.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) =>
      old?.map((t) => (t.project?.id === updated.id ? { ...t, project: updated } : t))
    )
  }

  return {
    createTask: (input: CreateTaskInput, projects: Project[]) =>
      createTask({ input, projects }),
    toggleTask: (task: Task) => toggleTask(task),
    deleteTask: (id: string) => deleteTask(id),
    renameTask: (id: string, title: string) => renameTask({ id, title }),
    updateDueDate: (taskId: string, value: string) => updateDueDate({ taskId, value }),
    reorderTasks: (newTasks: Task[]) => reorderTasks(newTasks),
    assignProject: (
      taskId: string,
      projectId: string | null,
      newProject: { id: string; title: string; icon: string } | null
    ) => assignProject({ taskId, projectId, newProject }),
    updateDescription: (id: string, description: string) => updateDescription({ id, description }),
    updateTags: (id: string, tagIds: string[]) => updateTagsMutation({ id, tagIds }),
    restoreTask: (id: string) => restoreTask(id),
    clearArchive: () => clearArchive(),
    addSubtask: (taskId: string, title: string) => addSubtask({ taskId, title }),
    toggleSubtask: (taskId: string, subtask: Subtask) => toggleSubtask({ taskId, subtask }),
    deleteSubtask: (taskId: string, subtaskId: string) => deleteSubtask({ taskId, subtaskId }),
    removeProjectTasks,
    syncProjectRename,
  }
}
```

- [x] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/hooks/useTaskMutations.test.ts
```

Expected: 4 passed

- [x] **Step 5: Commit**

```bash
git add src/hooks/useTaskMutations.ts src/hooks/useTaskMutations.test.ts
git commit -m "feat: add useTaskMutations with optimistic updates and offline temp ID handling"
```

---

### Task 7: Rewrite useTasks wrapper and update pages

**Goal:** Replace `useTasks.ts` internals with a thin wrapper over `useTaskQueries` + `useTaskMutations`. Update `tasks/page.tsx` and `archive/page.tsx` to remove manual `fetchTasks()` calls (TQ now auto-fetches).

**Files:**
- Modify: `src/hooks/useTasks.ts`
- Modify: `src/app/tasks/page.tsx`
- Modify: `src/app/archive/page.tsx`

**Acceptance Criteria:**
- [x] `useTasks.ts` is ≤ 30 lines, re-exports utilities from `taskUtils.ts`
- [x] `tasks/page.tsx` has no `fetchTasks()`, `fetchProjects()`, `fetchTags()` calls
- [x] `archive/page.tsx` has no `fetchTasks()` call
- [x] `npx vitest run src/hooks/useTasks.test.ts` → all pass (pure function tests unchanged)

**Verify:** `npx vitest run src/hooks/useTasks.test.ts` → all pass; `npx tsc --noEmit` → no errors

**Steps:**

- [x] **Step 1: Rewrite `src/hooks/useTasks.ts`**

Replace the entire file content:

```ts
"use client"

export type { TaskFilters, CreateTaskInput } from "./taskUtils"
export { buildTasksUrl, withPriorityScores, filterTasks } from "./taskUtils"

import { useTaskQueries } from "./useTaskQueries"
import { useTaskMutations } from "./useTaskMutations"
import type { TaskFilters } from "./taskUtils"

export function useTasks(baseFilters: TaskFilters = {}) {
  return {
    ...useTaskQueries(baseFilters),
    ...useTaskMutations(baseFilters),
    // fetchTasks is no-op for backward compat — TQ auto-fetches
    fetchTasks: () => {},
    error: useTaskQueries(baseFilters).error,
  }
}
```

Wait — calling `useTaskQueries` twice causes a double hook call. Fix:

```ts
"use client"

export type { TaskFilters, CreateTaskInput } from "./taskUtils"
export { buildTasksUrl, withPriorityScores, filterTasks } from "./taskUtils"

import { useTaskQueries } from "./useTaskQueries"
import { useTaskMutations } from "./useTaskMutations"
import type { TaskFilters } from "./taskUtils"

export function useTasks(baseFilters: TaskFilters = {}) {
  const queries = useTaskQueries(baseFilters)
  const mutations = useTaskMutations(baseFilters)
  return {
    ...queries,
    ...mutations,
    fetchTasks: () => {},
  }
}
```

- [x] **Step 2: Run useTasks tests — expect PASS**

```bash
npx vitest run src/hooks/useTasks.test.ts
```

Expected: all pass (they only test pure functions imported from the module)

- [x] **Step 3: Update `src/app/tasks/page.tsx`**

Remove the three `useEffect` blocks that call `fetchTasks`, `fetchProjects`, `fetchTags` explicitly. TQ handles fetching automatically when the query mounts. Keep only the auth redirect effect.

Remove these lines:
```ts
// DELETE this entire useEffect:
useEffect(() => {
  if (status === "authenticated") {
    taskHook.fetchTasks()
    projectHook.fetchProjects()
    tagHook.fetchTags()
  }
}, [status, taskHook.fetchTasks, projectHook.fetchProjects, tagHook.fetchTags])

// DELETE this entire useEffect:
useEffect(() => {
  if (!searchMode || status !== "authenticated") return
  const timer = setTimeout(() => {
    taskHook.fetchTasks({ q: searchQuery || undefined })
  }, 300)
  return () => clearTimeout(timer)
}, [searchQuery, searchMode, status, taskHook.fetchTasks])

// In exitSearch(), REMOVE the fetchTasks() call:
// BEFORE:
function exitSearch() {
  setSearchMode(false)
  setSearchQuery("")
  taskHook.fetchTasks()
}
// AFTER:
function exitSearch() {
  setSearchMode(false)
  setSearchQuery("")
}
```

Search is now handled by changing the `filters` passed to `useTasks`. Add a debounced query state so TQ doesn't fire on every keystroke, then pass it into the filters:

```ts
// Add near the top of TasksPage, alongside existing useState declarations:
const [debouncedQuery, setDebouncedQuery] = useState("")

useEffect(() => {
  if (!searchMode) return
  const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
  return () => clearTimeout(timer)
}, [searchQuery, searchMode])

// Change the useTasks call:
// BEFORE:
const taskHook = useTasks({ done: false })
// AFTER:
const taskHook = useTasks({ done: false, q: searchMode && debouncedQuery ? debouncedQuery : undefined })
```

When `exitSearch()` is called, reset `debouncedQuery` back to `""` alongside `setSearchQuery("")`.

- [x] **Step 4: Update `src/app/archive/page.tsx`**

Remove the manual `fetchTasks()` call:

```ts
// DELETE this useEffect:
useEffect(() => {
  if (status === "authenticated") fetchTasks()
}, [status]) // eslint-disable-line react-hooks/exhaustive-deps
```

Also remove `fetchTasks` from the destructured return of `useTasks` (it's no longer needed):

```ts
// BEFORE:
const { tasks, isLoading, error, fetchTasks, deleteTask, restoreTask, clearArchive } = ...
// AFTER:
const { tasks, isLoading, error, deleteTask, restoreTask, clearArchive } = ...
```

- [x] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [x] **Step 6: Commit**

```bash
git add src/hooks/useTasks.ts src/app/tasks/page.tsx src/app/archive/page.tsx
git commit -m "refactor: useTasks → thin wrapper over useTaskQueries + useTaskMutations; remove manual fetch calls from pages"
```

---

### Task 8: Refactor useProjects with TanStack Query

**Goal:** Replace `useProjects.ts` internals with `useQuery` + `useMutation`. Project/tag mutations use `networkMode: 'online'` to prevent offline queuing.

**Files:**
- Modify: `src/hooks/useProjects.ts`
- Modify: `src/hooks/useProjects.test.ts`

**Acceptance Criteria:**
- [x] `fetchProjects` is a no-op (kept for backward compat)
- [x] `createProject`, `deleteProject`, `updateProject` use `networkMode: 'online'`
- [x] Projects are read from `useQuery(['projects'])`
- [x] Existing test assertions still pass with updated test setup (QueryClientProvider wrapper)

**Verify:** `npx vitest run src/hooks/useProjects.test.ts` → all pass

**Steps:**

- [x] **Step 1: Rewrite `src/hooks/useProjects.ts`**

```ts
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Project } from "@/types"

export function useProjects() {
  const qc = useQueryClient()

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) throw new Error("Не удалось загрузить проекты")
      return res.json()
    },
  })

  const { mutateAsync: createProject } = useMutation({
    networkMode: "online",
    mutationFn: async ({ title, icon }: { title: string; icon: string }) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, icon }),
      })
      if (!res.ok) throw new Error("Не удалось создать проект")
      return res.json() as Promise<Project>
    },
    onSuccess: (project) => {
      qc.setQueryData<Project[]>(["projects"], (old) => [...(old ?? []), project])
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  })

  const { mutateAsync: deleteProject } = useMutation({
    networkMode: "online",
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить проект")
    },
    onSuccess: (_, id) => {
      qc.setQueryData<Project[]>(["projects"], (old) => old?.filter((p) => p.id !== id))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  })

  const { mutateAsync: updateProject } = useMutation({
    networkMode: "online",
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; icon?: string } }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Не удалось сохранить проект")
      return res.json() as Promise<Project>
    },
    onSuccess: (updated) => {
      qc.setQueryData<Project[]>(["projects"], (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p))
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  })

  return {
    projects,
    fetchProjects: () => {},
    createProject: (title: string, icon = "folder") => createProject({ title, icon }),
    deleteProject: (id: string) => deleteProject(id),
    updateProject: (id: string, updates: { title?: string; icon?: string }) =>
      updateProject({ id, updates }),
  }
}
```

- [x] **Step 2: Update `src/hooks/useProjects.test.ts`**

Add a `QueryClientProvider` wrapper to every `renderHook` call. The assertions stay the same.

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useProjects } from "./useProjects"
import type { Project } from "@/types"

function makeProject(overrides: Partial<Project> = {}): Project {
  return { id: "p1", title: "Alpha", icon: "folder", ...overrides }
}

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(data) })
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, Wrapper }
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe("useProjects — loads projects", () => {
  it("fetches and returns project list", async () => {
    const projects = [makeProject({ id: "p1" }), makeProject({ id: "p2" })]
    vi.stubGlobal("fetch", mockFetch(projects))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.projects).toHaveLength(2))
  })
})

describe("useProjects — createProject", () => {
  it("POSTs and adds new project", async () => {
    const project = makeProject({ id: "p2", title: "Beta" })
    vi.stubGlobal("fetch", mockFetch(project))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })

    let returned: Project | undefined
    await act(async () => { returned = await result.current.createProject("Beta", "star") })

    expect(fetch).toHaveBeenCalledWith("/api/projects", expect.objectContaining({ method: "POST" }))
    expect(returned).toEqual(project)
  })

  it("uses 'folder' as default icon", async () => {
    vi.stubGlobal("fetch", mockFetch(makeProject()))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await act(async () => { await result.current.createProject("Alpha") })
    expect(fetch).toHaveBeenCalledWith("/api/projects", expect.objectContaining({
      body: JSON.stringify({ title: "Alpha", icon: "folder" }),
    }))
  })
})

describe("useProjects — deleteProject", () => {
  it("calls DELETE endpoint", async () => {
    vi.stubGlobal("fetch", mockFetch(null))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    await act(async () => { await result.current.deleteProject("p1") })
    expect(fetch).toHaveBeenCalledWith("/api/projects/p1", expect.objectContaining({ method: "DELETE" }))
  })
})

describe("useProjects — updateProject", () => {
  it("PATCHes and returns updated project", async () => {
    const updated = makeProject({ title: "Updated" })
    vi.stubGlobal("fetch", mockFetch(updated))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useProjects(), { wrapper: Wrapper })
    let returned: Project | undefined
    await act(async () => { returned = await result.current.updateProject("p1", { title: "Updated" }) })
    expect(returned).toEqual(updated)
  })
})
```

- [x] **Step 3: Run tests — expect PASS**

```bash
npx vitest run src/hooks/useProjects.test.ts
```

Expected: all pass

- [x] **Step 4: Commit**

```bash
git add src/hooks/useProjects.ts src/hooks/useProjects.test.ts
git commit -m "refactor: useProjects → TanStack Query; project mutations use networkMode: online"
```

---

### Task 9: Refactor useTags with TanStack Query

**Goal:** Same pattern as Task 8 for tags.

**Files:**
- Modify: `src/hooks/useTags.ts`
- Modify: `src/hooks/useTags.test.ts`

**Acceptance Criteria:**
- [x] `fetchTags` is a no-op
- [x] All tag mutations use `networkMode: 'online'`
- [x] Tags read from `useQuery(['tags'])`
- [x] Tests pass

**Verify:** `npx vitest run src/hooks/useTags.test.ts` → all pass

**Steps:**

- [x] **Step 1: Rewrite `src/hooks/useTags.ts`**

```ts
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Tag } from "@/types"

const TAG_COLORS = [
  "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#2dd4bf",
  "#4ade80", "#fb7185", "#22d3ee", "#c084fc", "#94a3b8",
]

function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

export function useTags() {
  const qc = useQueryClient()

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags")
      if (!res.ok) throw new Error("Не удалось загрузить метки")
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { mutateAsync: createTag } = useMutation({
    networkMode: "online",
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) throw new Error("Не удалось создать метку")
      return res.json() as Promise<Tag>
    },
    onSuccess: (tag) => {
      qc.setQueryData<Tag[]>(["tags"], (old) =>
        [...(old ?? []), tag].sort((a, b) => a.name.localeCompare(b.name))
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  })

  const { mutateAsync: updateTag } = useMutation({
    networkMode: "online",
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; color?: string } }) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Не удалось обновить метку")
      return res.json() as Promise<Tag>
    },
    onSuccess: (tag) => {
      qc.setQueryData<Tag[]>(["tags"], (old) =>
        old?.map((t) => (t.id === tag.id ? tag : t))
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  })

  const { mutateAsync: deleteTag } = useMutation({
    networkMode: "online",
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Не удалось удалить метку")
    },
    onSuccess: (_, id) => {
      qc.setQueryData<Tag[]>(["tags"], (old) => old?.filter((t) => t.id !== id))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  })

  return {
    tags,
    fetchTags: () => {},
    createTag: (name: string, color?: string) => createTag({ name, color: color ?? randomTagColor() }),
    updateTag: (id: string, updates: { name?: string; color?: string }) => updateTag({ id, updates }),
    deleteTag: (id: string) => deleteTag(id),
  }
}
```

- [x] **Step 2: Update `src/hooks/useTags.test.ts`**

Replace the file. Tests that previously called `fetchTags()` explicitly now verify the hook auto-fetches via TQ. The `fetchTags()` no-op is tested implicitly (it's present, does nothing). Core mutation assertions are preserved.

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useTags } from "./useTags"
import type { Tag } from "@/types"

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return { id: "t1", name: "bug", color: "#60a5fa", ...overrides }
}

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(data) })
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

beforeEach(() => { vi.stubGlobal("fetch", vi.fn()) })
afterEach(() => { vi.unstubAllGlobals() })

describe("useTags — loads tags", () => {
  it("fetches and returns tag list", async () => {
    const tags = [makeTag({ id: "t1" }), makeTag({ id: "t2", name: "feat" })]
    vi.stubGlobal("fetch", mockFetch(tags))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tags).toHaveLength(2))
  })

  it("returns empty array when response is not an array", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "bad" }))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.tags).toEqual([]))
  })
})

describe("useTags — createTag", () => {
  it("POSTs with provided color", async () => {
    const created = makeTag({ id: "t2", name: "alpha", color: "#fff" })
    vi.stubGlobal("fetch", mockFetch(created))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    let returned: Tag | undefined
    await act(async () => { returned = await result.current.createTag("alpha", "#fff") })
    expect(fetch).toHaveBeenCalledWith("/api/tags", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "alpha", color: "#fff" }),
    }))
    expect(returned).toEqual(created)
  })

  it("picks a random color from the palette when none provided", async () => {
    const TAG_COLORS = ["#60a5fa","#a78bfa","#f472b6","#fb923c","#2dd4bf","#4ade80","#fb7185","#22d3ee","#c084fc","#94a3b8"]
    const created = makeTag({ color: "#60a5fa" })
    vi.stubGlobal("fetch", mockFetch(created))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await act(async () => { await result.current.createTag("new-tag") })
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(TAG_COLORS).toContain(body.color)
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await expect(act(() => result.current.createTag("fail"))).rejects.toThrow("Не удалось создать метку")
  })
})

describe("useTags — updateTag", () => {
  it("PATCHes tag", async () => {
    const updated = makeTag({ name: "new" })
    vi.stubGlobal("fetch", mockFetch(updated))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    let returned: Tag | undefined
    await act(async () => { returned = await result.current.updateTag("t1", { name: "new" }) })
    expect(fetch).toHaveBeenCalledWith("/api/tags/t1", expect.objectContaining({ method: "PATCH" }))
    expect(returned).toEqual(updated)
  })
})

describe("useTags — deleteTag", () => {
  it("DELETEs tag", async () => {
    vi.stubGlobal("fetch", mockFetch(null))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await act(async () => { await result.current.deleteTag("t1") })
    expect(fetch).toHaveBeenCalledWith("/api/tags/t1", { method: "DELETE" })
  })

  it("throws when API returns not-ok", async () => {
    vi.stubGlobal("fetch", mockFetch(null, false))
    const { result } = renderHook(() => useTags(), { wrapper: makeWrapper() })
    await expect(act(() => result.current.deleteTag("t1"))).rejects.toThrow("Не удалось удалить метку")
  })
})
```

- [x] **Step 3: Run tests — expect PASS**

```bash
npx vitest run src/hooks/useTags.test.ts
```

Expected: all pass

- [x] **Step 4: Commit**

```bash
git add src/hooks/useTags.ts src/hooks/useTags.test.ts
git commit -m "refactor: useTags → TanStack Query; tag mutations use networkMode: online"
```

---

### Task 10: OfflineBanner component and layout integration

**Goal:** Create a slim banner that appears when the device is offline, showing the count of queued mutations. Add it to the root layout.

**Files:**
- Create: `src/components/OfflineBanner.tsx`
- Create: `src/components/OfflineBanner.test.tsx`
- Modify: `src/app/layout.tsx`

**Acceptance Criteria:**
- [x] Banner renders when `useOnlineStatus()` returns false
- [x] Banner shows count of `isPaused` mutations from `useMutationState`
- [x] Banner is absent when online
- [x] 2 tests pass

**Verify:** `npx vitest run src/components/OfflineBanner.test.tsx` → 2 passed

**Steps:**

- [x] **Step 1: Write tests**

Create `src/components/OfflineBanner.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { OfflineBanner } from "./OfflineBanner"

function makeWrapper(qc = new QueryClient()) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("OfflineBanner", () => {
  it("renders nothing when online", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
    const { container } = render(<OfflineBanner />, { wrapper: makeWrapper() })
    expect(container.firstChild).toBeNull()
  })

  it("renders offline message when offline event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
    render(<OfflineBanner />, { wrapper: makeWrapper() })
    act(() => { window.dispatchEvent(new Event("offline")) })
    expect(screen.getByText(/Офлайн/)).toBeInTheDocument()
  })
})
```

- [x] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/components/OfflineBanner.test.tsx
```

Expected: fails with "Cannot find module './OfflineBanner'"

- [x] **Step 3: Implement `src/components/OfflineBanner.tsx`**

```tsx
"use client"

import { useMutationState } from "@tanstack/react-query"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const pendingCount = useMutationState({
    filters: { status: "pending" },
    select: (m) => m.state.isPaused,
  }).filter(Boolean).length

  if (isOnline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-sm text-center py-1.5 px-4">
      Офлайн
      {pendingCount > 0 && ` — ${pendingCount} ${pendingCount === 1 ? "изменение ожидает" : "изменений ожидают"} синхронизации`}
    </div>
  )
}
```

- [x] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/components/OfflineBanner.test.tsx
```

Expected: 2 passed

- [x] **Step 5: Add to layout**

In `src/app/layout.tsx`, import and render `OfflineBanner` inside `<Providers>` before `{children}`:

```tsx
import { OfflineBanner } from "@/components/OfflineBanner"

// Inside the JSX, after <Providers>:
<Providers>
  <OfflineBanner />
  {children}
</Providers>
```

- [x] **Step 6: Commit**

```bash
git add src/components/OfflineBanner.tsx src/components/OfflineBanner.test.tsx src/app/layout.tsx
git commit -m "feat: add OfflineBanner — shows offline state and pending mutation count"
```

---

### Task 11: Disable project/tag UI when offline

**Goal:** Pass `isOnline` into the project and tag mutation call-sites in `tasks/page.tsx` so that create/edit/delete buttons are disabled with a tooltip when offline.

**Files:**
- Modify: `src/app/tasks/page.tsx`
- Modify any components that render project/tag create/edit/delete buttons (found by grep)

**Acceptance Criteria:**
- [x] All project create/edit/delete buttons are `disabled` when offline
- [x] All tag create/edit/delete buttons are `disabled` when offline
- [x] A `title` tooltip attribute explains why (e.g. `"Недоступно без подключения"`)
- [x] `npx tsc --noEmit` → no errors

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [x] **Step 1: Find all project/tag mutation call-sites**

```bash
grep -rn "createProject\|deleteProject\|updateProject\|createTag\|deleteTag\|updateTag" src/ --include="*.tsx"
```

Note every file and line number that calls a mutation.

- [x] **Step 2: Add `useOnlineStatus` to `tasks/page.tsx`**

```ts
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
// inside component:
const isOnline = useOnlineStatus()
```

Pass `isOnline` as a prop to any child components that render the buttons, or consume `useOnlineStatus` directly inside those components.

- [x] **Step 3: Disable buttons**

For every button that calls a project or tag mutation, add:
```tsx
<button
  disabled={!isOnline}
  title={!isOnline ? "Недоступно без подключения" : undefined}
  onClick={...}
>
```

Apply this to: create project button, delete project button, edit project button (icon/title), create tag button, delete tag button, edit tag button.

- [x] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add src/app/tasks/page.tsx
git commit -m "feat: disable project/tag mutation buttons when offline"
```

---

### Task 12: Logout cache clear and session expiry handling

**Goal:** Clear the IndexedDB cache and QueryClient state on logout. Add a global `401` handler in QueryClient that clears the mutation queue and shows a re-login prompt.

**Files:**
- Modify: `src/components/BurgerMenu.tsx`
- Modify: `src/lib/queryClient.ts`
- Modify: `src/app/providers.tsx`

**Acceptance Criteria:**
- [x] Clicking sign out calls `queryClient.clear()` before `signOut()`
- [x] A `401` on any mutation error triggers a `session-expired` custom event
- [x] `providers.tsx` listens for `session-expired` and shows a modal prompting re-login
- [x] `npx tsc --noEmit` → no errors

**Verify:** `npx tsc --noEmit` → no errors

**Steps:**

- [x] **Step 1: Update `src/components/BurgerMenu.tsx` to clear cache on logout**

```ts
import { queryClient } from "@/lib/queryClient"
import { persister } from "@/lib/persister"

// Replace the onClick handler:
onClick={async () => {
  queryClient.clear()
  await persister.removeClient()
  signOut({ callbackUrl: "/login" })
}}
```

- [x] **Step 2: Add global mutation error handler to `src/lib/queryClient.ts`**

```ts
import { QueryClient, MutationCache } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof Error && error.message.includes("401")) {
        window.dispatchEvent(new Event("session-expired"))
      }
    },
  }),
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 30_000,
      gcTime: 86_400_000,
      retry: 1,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
})
```

Note: the API routes return non-`ok` responses; update the `mutationFn` error throws to include the status code, or read the response status. Alternatively, add a helper that wraps `fetch` and throws with `"401"` in the message when the status is 401:

```ts
// src/lib/apiFetch.ts
export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401) throw new Error("401 Unauthorized")
  return res
}
```

Then replace `fetch(` with `apiFetch(` inside `useTaskMutations`, `useProjects`, and `useTags`.

- [x] **Step 3: Add session-expired modal to `src/app/providers.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { signOut } from "next-auth/react"
import { queryClient } from "@/lib/queryClient"
import { persister } from "@/lib/persister"

const CACHE_BUSTER = process.env.NEXT_PUBLIC_CACHE_VERSION ?? "1"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const handler = () => setSessionExpired(true)
    window.addEventListener("session-expired", handler)
    return () => window.removeEventListener("session-expired", handler)
  }, [])

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER }}
    >
      <SessionProvider>
        {children}
        {sessionExpired && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl text-center">
              <p className="text-gray-800 font-medium mb-4">
                Сессия истекла. Несохранённые изменения будут потеряны.
              </p>
              <button
                onClick={() => {
                  queryClient.clear()
                  signOut({ callbackUrl: "/login" })
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Войти снова
              </button>
            </div>
          </div>
        )}
      </SessionProvider>
    </PersistQueryClientProvider>
  )
}
```

- [x] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [x] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all pass

- [x] **Step 6: Commit**

```bash
git add src/components/BurgerMenu.tsx src/lib/queryClient.ts src/app/providers.tsx src/lib/apiFetch.ts
git commit -m "feat: clear IndexedDB on logout, show re-login modal on session expiry"
```

---

## Post-merge review fixes (2026-04-23)

After the feature landed, a code review identified 6 issues — all fixed and merged to `main`.

| # | File | Fix |
|---|------|-----|
| 1 | `useTaskQueries.ts` | Used raw `fetch` — switched to `apiFetch` so 401 triggers `session-expired` |
| 1b | `queryClient.ts` | Added `QueryCache` with 401 handler alongside `MutationCache`; extracted `dispatch401()` |
| 2 | `providers.tsx` | Session-expired modal didn't clear IndexedDB — added `persister.removeClient()` before `signOut` |
| 3 | `mutationQueue.ts` | `includes(tempId)` check and `replaceAll` now both use quoted form `"tempId"` to avoid false matches |
| 4 | `useTaskMutations.ts` | `clearArchive` optimistic update scoped to `["tasks", { done: true }]` only (was wiping all task queries) |
| 5 | `useTaskMutations.ts` + `TaskTagPicker.tsx` + `TaskItem.tsx` + `TaskList.tsx` | `updateTags` signature changed to `Tag[]` — enables proper optimistic update in `onMutate`; non-null assertion replaced with safe find |
| 6 | `useTasks.ts` | Removed dead `fetchTasks: () => {}` stub |
