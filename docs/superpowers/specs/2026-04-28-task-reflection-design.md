# Task Reflection — Design Spec

**Date:** 2026-04-28
**Status:** Approved

## Overview

After marking a task as done, a compact modal appears where the user can record a short retrospective: how the task went, time spent, difficulty, mood, and an optional next step that creates a new task. The modal is mandatory (always appears) but instantly skippable.

---

## Data Model

New model in `prisma/schema.prisma`:

```prisma
model TaskReflection {
  id          String   @id @default(cuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  notes       String?
  timeMinutes Int?
  difficulty  Int?     // 1 = easy, 2 = medium, 3 = hard
  mood        String?  // "energized" | "neutral" | "tired"
  createdAt   DateTime @default(now())
}
```

Add to `Task` model:
```prisma
reflections TaskReflection[]
```

Rationale for a separate model (not fields on Task): the app has recurring tasks; a separate model preserves reflection history across multiple completions of the same task.

The `nextStep` input is not stored in `TaskReflection` — it creates a new `Task` directly, so it lives as a first-class task, not an embedded string.

---

## API

**`POST /api/tasks/[id]/reflection`**

Auth: session required; verify task belongs to current user.

Request body (all fields optional):
```ts
{
  notes?: string
  timeMinutes?: number
  difficulty?: 1 | 2 | 3
  mood?: "energized" | "neutral" | "tired"
  nextStepTitle?: string
}
```

Behaviour (single Prisma transaction):
1. Create `TaskReflection` linked to the task.
2. If `nextStepTitle` is non-empty: create a new `Task` with the same `projectId` as the completed task, `userId` of the current user, and `done: false`.

Response:
```ts
{ reflection: TaskReflection, nextTask?: Task }
```

If the user clicks "Пропустить", no request is sent — the modal simply closes.

---

## UI

### ReflectionModal component

`src/components/tasks/ReflectionModal.tsx`

- Fixed full-screen overlay (backdrop-blur or semi-transparent dark bg)
- Closes on: "Пропустить" button, "Сохранить рефлексию" button, click on overlay
- All fields optional; submitting an empty form is valid (saves an empty reflection)

Fields in compact layout (single screen, no scroll on mobile):
| Field | Control |
|---|---|
| Notes | `<textarea>` 3 rows, placeholder "Что узнал, что удивило, что пошло не так..." |
| Time | `<input type="number">` + "мин" label |
| Difficulty | 3 emoji buttons: 😊 😐 😤 (toggle selection) |
| Mood | 3 chip buttons: зарядился / нейтрально / устал |
| Next step | `<input type="text">` with hint "Появится в том же проекте" |

### Trigger in TaskItem

In `TaskItem.tsx`, the `onToggle` prop currently calls `onToggle(task)` directly. The toggle checkpoint changes:

1. `onToggle(task)` fires as before (task is marked done immediately — optimistic).
2. If the task transitions to `done: true`, set local state `showReflection: true`.
3. `ReflectionModal` renders when `showReflection` is true.
4. On modal close (skip or save), set `showReflection: false`.

Toggling a done task back to undone does **not** open the modal.

### State management

- `ReflectionModal` manages its own form state locally (no global store needed).
- On save: calls `POST /api/tasks/[id]/reflection`, then invalidates the tasks query (TanStack Query) so the new next-step task appears in the list.

---

## Out of scope

- Viewing/editing past reflections (can be added later via task detail panel)
- Statistics/aggregates across reflections
- Reflection on subtask completion
