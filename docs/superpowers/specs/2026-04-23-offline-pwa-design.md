# Offline PWA — Design Spec

**Date:** 2026-04-23  
**Status:** Approved

## Problem

The app requires an internet connection at all times: no network means a blank screen, and every interaction has noticeable latency. The goal is full offline support on mobile — tasks readable and writable without a connection, with automatic sync when the connection returns.

## Scope

- **In scope:** offline read + write for tasks (including subtasks); offline read for projects and tags; automatic background sync on reconnect; offline UI indicator
- **Out of scope:** offline create/edit for projects and tags (rarely done on mobile without connectivity)
- **Component changes:** components that explicitly call `fetchTasks()` today will need a one-line change to `queryClient.invalidateQueries(['tasks'])` instead; all other component code is untouched

## Conflict Resolution

Last-write-wins by replay order. Queued mutations are replayed in the original order when the device comes back online; the server accepts all of them unconditionally. This is appropriate for a single-user personal task manager.

## Architecture

Three layers:

1. **QueryClient** — TanStack Query v5 central cache, configured with `networkMode: 'offlineFirst'` globally (queries and mutations execute even without network) and `gcTime: 86_400_000` (24 h, keeps data alive for full offline sessions)

2. **IndexedDB persister** — `@tanstack/react-query-persist-client` + `idb-keyval` persist both the query cache and the mutation queue to IndexedDB. On next app open, data loads instantly from IndexedDB without waiting for the server; queued mutations that survived a page reload are replayed automatically.

3. **Hooks** — `useTasks` is split into `useTaskQueries` (read) and `useTaskMutations` (write); `useProjects` and `useProjectMutations` likewise; `useTags` similarly. All internals use `useQuery` + `useMutation`. A thin `useTasks` wrapper re-exports the combined interface so existing component call-sites are unchanged.

### New files

| File | Purpose |
|------|---------|
| `src/lib/queryClient.ts` | Creates and exports the singleton QueryClient with offline config |
| `src/lib/persister.ts` | Creates the idb-keyval-backed async storage persister |
| `src/hooks/useOnlineStatus.ts` | `navigator.onLine` + `online`/`offline` events → boolean |
| `src/hooks/useTaskQueries.ts` | `useQuery` hooks for reading tasks |
| `src/hooks/useTaskMutations.ts` | `useMutation` hooks for all task writes |

### Modified files

| File | Change |
|------|--------|
| `src/app/providers.tsx` | Add `PersistQueryClient` wrapper + `QueryClientProvider`; call `queryClient.clear()` + `persister.removeClient()` on logout |
| `src/hooks/useTasks.ts` | Thin wrapper combining useTaskQueries + useTaskMutations |
| `src/hooks/useProjects.ts` | Replace useState/fetch internals with useQuery + useMutation |
| `src/hooks/useTags.ts` | Replace useState/fetch internals with useQuery + useMutation |
| `next.config.ts` | Add `NetworkOnly` runtime cache rule for `/api/*` routes |

### New dependencies

```
@tanstack/react-query
@tanstack/react-query-persist-client
idb-keyval
```

## Data Fetching

Each resource maps to a stable query key:

```
['tasks', { done, sort, q }]   — active task list (per filter combination)
['tasks', 'archive']           — done tasks
['projects']                   — project list
['tags']                       — tag list
```

Settings:
- `staleTime: 30_000` — data is fresh for 30 s; after that a background refetch runs silently while stale data is shown immediately
- `gcTime: 86_400_000` — 24 h in-memory retention, mirrored to IndexedDB by persister

`fetchTasks()` as an explicit call disappears. Components that currently call it manually switch to `queryClient.invalidateQueries(['tasks'])`. The cross-hook helpers `removeProjectTasks` and `syncProjectRename` are replaced by `queryClient.setQueryData` — direct cache updates with no extra requests.

## Mutations & Offline Queue

Every write operation uses `useMutation` with `networkMode: 'offlineFirst'`:

```
onMutate  → cancel in-flight queries → snapshot previous state → apply optimistic update
onError   → roll back to snapshot
onSettled → invalidate affected queries (triggers background refetch)
```

When offline:
- The mutation executes and the optimistic update is applied immediately
- TQ pauses the actual network call (status: `isPaused`) instead of failing
- The mutation queue is persisted to IndexedDB — it survives page reload
- On reconnect, TQ automatically resumes all paused mutations in order, then refetches

Operations with existing rollback logic (`reorderTasks`, `clearArchive`) map cleanly to the `onMutate`/`onError` pattern.

### Temporary ID remapping

When a task is created offline it receives a client-generated temporary ID (`tmp_<uuid>`). Subsequent offline mutations on that task (toggle, rename, delete, add subtask, toggle subtask, delete subtask) reference this temp ID — both in the request body and in the URL path (e.g. `/api/tasks/tmp_xxx/subtasks`). On reconnect:

1. The `createTask` mutation fires first and receives the real server ID in its response.
2. `onSuccess` of `createTask` calls a `remapMutationQueue(tempId, realId)` utility that iterates the persisted mutation queue and rewrites any matching IDs — in request bodies, query keys, and URL path segments — before TQ replays them.
3. Tasks with a temp ID are displayed with a subtle "syncing" indicator; toggle, delete, and subtask actions are disabled until the real ID arrives.

`remapMutationQueue` is a utility in `src/lib/mutationQueue.ts` that reads the persisted mutation cache from IndexedDB, rewrites IDs in-place (covering both body fields and URL paths via regex replacement of the temp ID string), and writes it back before TQ resumes.

## Cache Invalidation on Logout

When the user signs out, the IndexedDB cache must be cleared to prevent another user on the same device from seeing stale data. The sign-out flow (currently handled by NextAuth `signOut()`) is extended to:

1. Call `queryClient.clear()` — removes all in-memory query and mutation cache.
2. Call `persister.removeClient()` — wipes the IndexedDB store entirely.
3. Proceed with `signOut()` redirect.

This guarantees a clean slate for the next login session.

## Cache Versioning (Schema Buster)

When the Prisma schema changes (new fields, renamed fields), old IndexedDB-cached data may have a different shape and cause runtime errors on the next app load. The `persistQueryClient` `buster` option handles this: when the buster string changes, the persister silently discards the old cache and starts fresh.

The buster is set to a `NEXT_PUBLIC_CACHE_VERSION` env var (e.g. `"1"`). It is incremented manually after any migration that changes the shape of cached data. A mismatch causes a cold start — the app fetches fresh data from the server on first load, with no error shown to the user.

## Service Worker + TanStack Query Interaction

The existing `next-pwa` service worker is configured to cache front-end navigation. Without additional config it may also intercept and cache `/api/*` responses, causing TQ to receive stale SW-cached data instead of making real network requests.

To prevent this, `next.config.ts` is updated to add an explicit SW runtime cache rule that excludes all `/api/` routes:

```ts
runtimeCaching: [
  { urlPattern: /^\/api\//, handler: 'NetworkOnly' },
  // existing rules follow...
]
```

`NetworkOnly` tells the SW to always pass API requests through to the network, handing full caching responsibility to TQ + IndexedDB. The SW continues to cache the app shell (HTML, JS, CSS) for fast load.

## Session Expiry Handling

If the auth session expires while the device is offline, replayed mutations will receive a `401` response. The `QueryClient` global `onError` handler inspects every mutation error:

- If `status === 401`: mark the entire pending queue as failed, clear it from IndexedDB, and dispatch a global `session-expired` event.
- A top-level listener catches `session-expired` and shows a modal: "Сессия истекла. Войдите снова — несохранённые изменения будут потеряны."
- After re-login, TQ starts fresh (no stale queue to replay, which is safe since the server state is authoritative).

This is the safe fallback: data loss is surfaced clearly rather than silently ignored.

## Hook Split: useTasks → useTaskQueries + useTaskMutations

The current `useTasks` is ~400 lines with 20+ functions mixing read and write concerns. It is split into:

- **`useTaskQueries`** — owns `useQuery` for the task list, exposes `tasks`, `isLoading`, `error`. Also exposes `filterTasks` and `withPriorityScores` as pure helpers (unchanged).
- **`useTaskMutations`** — owns all `useMutation` calls: `createTask`, `toggleTask`, `deleteTask`, `renameTask`, `updateDueDate`, `reorderTasks`, `assignProject`, `addSubtask`, `toggleSubtask`, `deleteSubtask`, `updateDescription`, `updateTags`, `restoreTask`, `clearArchive`.
- **`useTasks`** — thin re-export wrapper: `return { ...useTaskQueries(filters), ...useTaskMutations(filters) }`. Existing component imports are unchanged.

`useProjects` and `useTags` are smaller and each split into a query hook + mutation hook in the same pattern, without a wrapper (they have fewer call-sites).

## Offline Indicator

A slim banner shown when `navigator.onLine === false`:

```
⚠ Офлайн — N изменений ожидают синхронизации
```

- `useOnlineStatus` hook listens to `window` `online`/`offline` events
- `useMutationState` from TQ counts mutations with `status === 'pending'` and `isPaused === true`
- Banner disappears automatically once online and the queue drains

Banner is placed at the top of the main layout, visible on all pages.

## Testing

- Unit tests for `useTaskQueries` and `useTaskMutations` written separately; mock `useQuery`/`useMutation` via `@tanstack/react-query` test utilities
- `useTasks` wrapper tested as integration of the two
- `remapMutationQueue` utility unit-tested independently (pure IndexedDB read-modify-write)
- Manual testing: load app → go offline → create task → toggle it done → rename it → reconnect → verify server state matches expected sequence
- Manual testing: logout → login as different user → verify no previous user's data is visible
- Manual testing: bump `NEXT_PUBLIC_CACHE_VERSION` → reload → verify stale cache is discarded and fresh data loads
