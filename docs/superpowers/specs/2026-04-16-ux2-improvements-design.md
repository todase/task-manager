# UX2 Improvements — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

8 UX improvements across project management, drag-and-drop, animations, and tag functionality.

---

## 1. Delete button moved to edit mode (`ProjectTabs.tsx`)

The `✕` delete button is removed from the active project pill in normal view.  
It is added inside the edit form (`editingId === project.id`) as a "Удалить проект" button at the bottom.

No changes to API or data layer.

---

## 2. Delete confirmation dialog (`ProjectTabs.tsx`)

New state: `deletingId: string | null`.

When "Удалить проект" is clicked in edit mode, an inline confirmation block appears within the accordion (no browser `confirm()`):

> «Удалить проект? Выполненные задачи попадут в архив, незавершённые открепятся от проекта.»

Two buttons: **Отмена** (sets `deletingId = null`) and **Удалить** (calls `onDelete`, then resets state).

Existing delete behavior (SET NULL) is unchanged — completed tasks become archived, open tasks become unassigned.

---

## 3. Project list stays open on selection (`ProjectTabs.tsx`)

`setIsOpen(false)` is removed from `handleSelectProject`.

Click-outside is added: `containerRef` on the root `<div>` + `document.addEventListener('mousedown', ...)` in a `useEffect`. List closes on any click outside the component. Pattern is identical to the project dropdown in `TaskItem`.

The edit pencil button remains visible on the active project pill as before.

---

## 4. Drag without handle (`SortableTask.tsx`)

The `<button>` with `GripVertical` is removed entirely.  
`listeners` and `attributes` move from the button to the `<li>` element.  
The inner `<div className="flex-1">` wrapper is removed — `children` renders directly inside `<li>`.

When `isDragging`:
- `transform`: `CSS.Transform.toString(transform) + ' scale(1.03)'`
- `boxShadow`: `'0 8px 24px rgba(0,0,0,0.12)'`
- `zIndex`: `50`
- `opacity`: `1` (task "floats up" rather than fading)

`PointerSensor` with `distance: 8` already configured in `page.tsx` — normal taps won't accidentally trigger drag.

---

## 5. Expand animation (`globals.css` + `TaskItem.tsx`)

Add to `globals.css`:

```css
@keyframes expand-down {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Add to `@layer utilities`:

```css
.animate-expand {
  animation: expand-down 0.18s ease-out;
}
```

Apply `animate-expand` class to the expanded section `<div>` in `TaskItem.tsx`:
```tsx
{isOpen && (
  <div className="border-t border-gray-100 px-3 pb-3 pt-2 flex flex-col gap-2.5 animate-expand">
```

---

## 6. Tag filter always visible (`TagFilter.tsx`)

Remove `if (tags.length === 0) return null`.

When `tags.length === 0` and accordion is open, show placeholder text:
> «Теги появятся здесь после создания»

Tag creation happens from AddTaskForm or from the task detail view (see §7).

---

## 7. Tag editing in task detail view (`TaskItem.tsx`, `TaskList.tsx`, `page.tsx`)

### New prop
`tags: Tag[]` (all user tags) added to `TaskItemProps`. Propagated: `page.tsx` → `TaskList` → `TaskItem`.

### Expanded section changes
Existing tag display block is replaced with an interactive version:

- Assigned tags shown as colored chips with `×` button to unassign (calls `onUpdateTags`)
- `+ тег` button opens an inline dropdown below:
  - List of all user tags as toggleable chips (checked = assigned)
  - Input field at bottom: type name + Enter to create new tag (calls a new `onCreateTag` prop)
  - Click outside closes dropdown

### New prop on TaskItem
`onCreateTag: (name: string) => Promise<Tag>` — passed from `page.tsx` via `tagHook.createTag`.

### Propagation
`TaskList` receives and passes through both `tags` and `onCreateTag`. No logic in `TaskList`.

---

## 8. Expanded project icon set (`ProjectIconPicker.tsx`)

12 new Lucide icons added to `PROJECT_ICONS`, bringing total from 24 to 36:

`Gamepad2`, `Palette`, `Wrench`, `Utensils`, `Bike`, `Tent`, `Microscope`, `Cpu`, `Package`, `MapPin`, `Newspaper`, `Coins`

No structural changes needed — `flex-wrap` grid adapts automatically.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/projects/ProjectTabs.tsx` | §1, §2, §3 |
| `src/components/SortableTask.tsx` | §4 |
| `src/app/globals.css` | §5 |
| `src/components/tasks/TaskItem.tsx` | §5, §7 |
| `src/components/tasks/TaskList.tsx` | §7 (prop passthrough) |
| `src/app/tasks/page.tsx` | §7 (prop passthrough) |
| `src/components/filters/TagFilter.tsx` | §6 |
| `src/components/projects/ProjectIconPicker.tsx` | §8 |
