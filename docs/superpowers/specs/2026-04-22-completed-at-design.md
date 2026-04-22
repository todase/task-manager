# Design: completedAt field for Tasks

**Date:** 2026-04-22
**Status:** Approved

## Overview

Add a `completedAt DateTime?` field to the `Task` model. Set it when a task is marked done, clear it when unchecked. Use it to sort the archive (done=true) by completion time descending.

## Schema

Add to `Task` in `prisma/schema.prisma`:

```prisma
completedAt DateTime?
```

## API Changes

### PATCH `/api/tasks/[id]`

- `done = true` → set `completedAt = new Date()`
- `done = false` → set `completedAt = null`
- Recurring task path (shifts dueDate, does not set done=true) → `completedAt` untouched

### GET `/api/tasks?done=true`

- Sort changes from `order asc` to `completedAt desc nulls last`
- All other query params (`limit`, `q`, `done=false`, etc.) are unaffected

## Out of Scope

- No frontend changes required
- No changes to the archive UI
- `completedAt` is not exposed as a filter or sort param — the archive always sorts by it

## Testing

- `src/app/api/tasks/[id]/route.test.ts`: verify `completedAt` is set on done=true, cleared on done=false, untouched on recurring path
- `src/app/api/tasks/route.test.ts`: verify archive returns tasks sorted by `completedAt desc`
