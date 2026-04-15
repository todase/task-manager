# Stage 3: Search + Pagination + Archive — Design Spec

**Date:** 2026-04-15  
**Stage:** 3 of 6  
**Goal:** Make the app usable when task count grows into hundreds. Find any task instantly. Keep the active list clean.

---

## Decisions Made

| Topic | Decision |
|-------|----------|
| Search scope | Title + description only (no subtasks) |
| Search filter interaction | Full reset — all filters cleared when search is active |
| Archive location | Separate page `/archive` |
| Pagination | 200-task limit (Option A) — single request, no cursor |
| Implementation order | Pagination → Archive → Search |

---

## Part 1: Pagination

### API changes — `GET /api/tasks`

New optional query parameters:

| Param | Type | Default | Purpose |
|-------|------|---------|---------|
| `limit` | number | `200` | Max tasks returned |
| `done` | `"true"` \| `"false"` | `"false"` | Filter by completion status |
| `sort` | `"order"` \| `"updatedAt_desc"` | `"order"` | Sort order |
| `q` | string | — | Full-text search (see Part 3) |

Prisma query for active list:
```ts
prisma.task.findMany({
  where: { userId, done: false },
  take: 200,
  orderBy: { order: "asc" },
  include: { subtasks: true, tags: { include: { tag: true } } },
})
```

Active page (`/tasks`) behaviour is **unchanged** — it does not pass `done` or `limit`, gets defaults.

### `useTasks` hook signature

```ts
useTasks(filters?: {
  done?: boolean
  q?: string
  sort?: "order" | "updatedAt_desc"
})
```

All fields optional. Called without arguments on the active page — no breaking change.

### Loading skeletons — `TaskSkeleton.tsx`

New file: `src/components/tasks/TaskSkeleton.tsx`

- 5 gray rounded rectangles, height matches real `TaskItem` (~64px)
- Rendered by `TaskList` while `isLoading === true`
- Also used on `/archive` page
- Prevents layout shift on initial load and filter changes

---

## Part 2: Archive

### Page — `src/app/archive/page.tsx`

Client component. Calls `useTasks({ done: true, sort: "updatedAt_desc" })`.

**Task display:** title, tags, completion date. No drag handle, no edit controls, no subtask panel.

**Per-task actions:**
- **«Восстановить»** — `PATCH /api/tasks/[id] { done: false }`. Task disappears from archive, reappears in active list at bottom (order stays as-is).
- **«Удалить»** — `DELETE /api/tasks/[id]`. Permanent deletion, same endpoint as active list.

**Bulk action:**
- **«Очистить архив»** button at top of page
- Calls new endpoint: `DELETE /api/tasks?done=true`
- Requires confirmation (inline confirmation button, not a modal — "Вы уверены? Удалить всё")
- Deletes all `done: true` tasks for the current user

**Empty state:** «Выполненных задач нет» when archive is empty.

### New API endpoint

`DELETE /api/tasks` with query param `?done=true` — bulk delete all completed tasks for authenticated user:
```ts
await prisma.task.deleteMany({ where: { userId, done: true } })
```

### Navigation

**BottomNav** (`src/components/BottomNav.tsx`) gains a third item:
- Icon: archive box (lucide-react `Archive`)
- Label: «Архив»
- Route: `/archive`

**Desktop:** link in page header, next to the logout button.

### Active list behaviour

`/tasks` now fetches only `done: false` tasks by default (from the API default). When a task is marked done via optimistic update, it disappears from the list immediately — existing behaviour, now backed by the server filter.

---

## Part 3: Search

### Component — `src/components/search/SearchInput.tsx`

- Text input in the page header of `/tasks`, always visible
- Magnifier icon on the left (lucide-react `Search`)
- × clear button on the right, appears only when query is non-empty
- Debounce: 300ms via `useEffect` + `setTimeout` / `clearTimeout`
- Controlled: accepts `value` and `onChange` props — state lives in `page.tsx`

### State in `page.tsx`

New state: `searchQuery: string` (default `""`).

When `searchQuery` changes to non-empty:
1. Reset `activeProjectId` to `null`
2. Reset `dateFilter` to `"all"`
3. Reset `tagFilter` to `[]`
4. Pass `{ q: searchQuery }` to `useTasks`

When `searchQuery` is cleared (× or empty input):
- All filters return to their previous values (stored in state, not lost)

Label shown above results while search is active:
```
Результаты поиска для «{searchQuery}»
```

### API — `GET /api/tasks?q=текст`

```ts
prisma.task.findMany({
  where: {
    userId,
    done: false,
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ],
  },
  // No `take` limit when q is present — matches are few
  orderBy: { order: "asc" },
  include: { subtasks: true, tags: { include: { tag: true } } },
})
```

When `q` is provided, the `limit` param is ignored.

---

## Files Affected

### Modified
| File | Change |
|------|--------|
| `src/app/api/tasks/route.ts` | Add `limit`, `done`, `sort`, `q` params; bulk DELETE handler |
| `src/hooks/useTasks.ts` | Accept `filters` object, pass to API |
| `src/components/BottomNav.tsx` | Add Archive nav item |
| `src/app/tasks/page.tsx` | Add `searchQuery` state, wire `SearchInput`, pass filters to `useTasks` |
| `src/components/tasks/TaskList.tsx` | Render `TaskSkeleton` while loading |

### New
| File | Purpose |
|------|---------|
| `src/app/archive/page.tsx` | Archive page — completed tasks |
| `src/components/tasks/TaskSkeleton.tsx` | Loading skeleton (5 items) |
| `src/components/search/SearchInput.tsx` | Debounced search input |

---

## Implementation Order

1. **Pagination** — API params + `useTasks` filters + `TaskSkeleton`
2. **Archive** — `/archive` page + bulk DELETE endpoint + BottomNav update
3. **Search** — `SearchInput` component + `q` param in API + state in `page.tsx`

Each step is independently shippable.

---

## Out of Scope (Stage 3)

- Search on the archive page (can be added later)
- Search highlighting in results
- Cursor-based pagination (revisit if 200-task limit is hit)
- Keyboard shortcuts for search (Stage 6 territory)
