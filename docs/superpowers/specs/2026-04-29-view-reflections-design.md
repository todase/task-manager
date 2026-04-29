# View Task Reflections in Archive — Design Spec

**Date:** 2026-04-29
**Status:** Approved

## Overview

Users can now see saved reflections directly in the archive. Tasks with a reflection show a small icon in the list. Clicking a task expands it to reveal only the non-empty reflection fields. Text-based restore/delete buttons are replaced with icon buttons.

---

## Data Layer

### API — `GET /api/tasks?done=true`

When `done=true` is present in the query, include the latest reflection in the Prisma query:

```ts
include: {
  reflections: {
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  // ...existing includes
}
```

Active task requests (`done` not set or `done=false`) do **not** include reflections — the main task list payload stays lean.

### Type — `Task`

Add an optional field to `src/types/index.ts`:

```ts
reflections?: TaskReflection[]
```

Optional so active tasks (which never receive this field) remain type-compatible. `TaskReflection` is already defined in the same file.

No new API endpoint required.

---

## UI

### New component — `ArchiveTaskItem`

**File:** `src/components/tasks/ArchiveTaskItem.tsx`

```ts
interface ArchiveTaskItemProps {
  task: Task
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}
```

#### Collapsed state

- Strikethrough task title
- Tags (same as current)
- If `task.reflections?.length > 0`: small `BookOpen` icon from lucide (subtle gray, `w-4 h-4`) to indicate a reflection exists
- Two icon buttons replacing the current text buttons:
  - `RotateCcw` with `aria-label="Восстановить"`
  - `Trash2` with `aria-label="Удалить"`
- Clicking anywhere on the row (except the icon buttons) toggles expand

#### Expanded state

A "Рефлексия" section rendered below the title. Only non-empty fields are shown:

| Field | Display |
|---|---|
| `notes` | Plain text block |
| `timeMinutes` | "⏱ 42 мин" |
| `difficulty` | Emoji + label: 😊 Легко / 😐 Нормально / 😤 Сложно |
| `mood` | Chip: зарядился / нейтрально / устал |
| `createdAt` | Formatted date via `new Date(r.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })` → "28 апр. 2026 г." |

If `task.reflections` is empty or undefined, the reflection section is not rendered at all.

### Archive page — `src/app/archive/page.tsx`

Replace the existing `<li>` block inside `tasks.map()` with `<ArchiveTaskItem />`. The `restoreTask` and `deleteTask` callbacks from `useTasks` are passed as `onRestore` and `onDelete`.

---

## Testing

**File:** `src/components/tasks/ArchiveTaskItem.test.tsx`

Scenarios:
- Collapsed: reflection icon visible when `reflections` contains an entry
- Collapsed: reflection icon hidden when `reflections` is empty or undefined
- Clicking the row expands the component
- Expanded: only non-empty fields are rendered (test with partial reflection)
- Expanded: reflection section absent when no reflections
- Restore button calls `onRestore` with the task id
- Delete button calls `onDelete` with the task id

Two explicit API tests were added to verify the conditional include: one asserting `reflections` is present when `done=true`, and one asserting it is absent otherwise.

---

## Out of Scope

- Editing past reflections
- Multiple reflections per task shown in archive (only the latest is fetched)
- Reflection viewing outside the archive (active tasks)
- Statistics or aggregates across reflections
