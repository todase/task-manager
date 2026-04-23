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

3. **Hooks (useTasks, useProjects, useTags)** — internals replaced with `useQuery` + `useMutation`; public interface (returned functions and values) stays identical so no component changes are needed.

### New files

| File | Purpose |
|------|---------|
| `src/lib/queryClient.ts` | Creates and exports the singleton QueryClient with offline config |
| `src/lib/persister.ts` | Creates the idb-keyval-backed async storage persister |
| `src/hooks/useOnlineStatus.ts` | `navigator.onLine` + `online`/`offline` events → boolean |

### Modified files

| File | Change |
|------|--------|
| `src/app/providers.tsx` | Add `PersistQueryClient` wrapper + `QueryClientProvider` |
| `src/hooks/useTasks.ts` | Replace useState/fetch internals with useQuery + useMutation |
| `src/hooks/useProjects.ts` | Replace useState/fetch internals with useQuery + useMutation |
| `src/hooks/useTags.ts` | Replace useState/fetch internals with useQuery + useMutation |

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

- Existing unit tests for `useTasks`, `useProjects`, `useTags` need to be updated to mock `useQuery`/`useMutation` instead of `fetch`
- Manual testing: load app → go offline → create/toggle/delete tasks → reconnect → verify server state matches
