# UX2 Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8 UX improvements: project delete moved to edit mode + confirmation dialog, project list click-outside, drag without handle with lift effect, expand animation, always-visible tag filter, tag editing in task detail view, 36 project icons.

**Architecture:** All changes are isolated to UI components. No API or schema changes required. New props (`tags`, `onCreateTag`) thread through `page.tsx → TaskList → TaskItem`. Tasks are sequenced from simplest to most complex.

**Tech Stack:** React 19, Next.js App Router, Tailwind CSS v4, @dnd-kit/sortable, Lucide React, TypeScript

---

## File Map

| File | Change |
|------|--------|
| `src/components/projects/ProjectIconPicker.tsx` | Add 12 Lucide icons (24 → 36) |
| `src/components/SortableTask.tsx` | Remove grip button, move listeners to `<li>`, add lift effect |
| `src/app/globals.css` | Add `@keyframes expand-down` + `.animate-expand` |
| `src/components/tasks/TaskItem.tsx` | Apply animation class, inline tag picker with create |
| `src/components/tasks/TaskList.tsx` | Pass `tags` + `onCreateTag` through to TaskItem |
| `src/app/tasks/page.tsx` | Pass `tagHook.tags` + `tagHook.createTag` to TaskList |
| `src/components/filters/TagFilter.tsx` | Remove early-return, add empty state message |
| `src/components/projects/ProjectTabs.tsx` | Delete→edit mode, confirmation dialog, click-outside, no auto-close on select |

---

### Task 1: Expand project icons from 24 to 36

**Files:**
- Modify: `src/components/projects/ProjectIconPicker.tsx`

- [ ] **Step 1: Replace import block and PROJECT_ICONS**

Open `src/components/projects/ProjectIconPicker.tsx`. Replace the import block and `PROJECT_ICONS` object (lines 1–34) with:

```tsx
import {
  Folder, Briefcase, Book, Home, Star, Heart, Zap, Target,
  Coffee, Music, Camera, Code, Globe, ShoppingCart, Clipboard,
  Flag, Rocket, Sun, GraduationCap, Dumbbell, Car, Plane,
  TreePine, FlaskConical,
  Gamepad2, Palette, Wrench, Utensils, Bike, Tent,
  Microscope, Cpu, Package, MapPin, Newspaper, Coins,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const PROJECT_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  book: Book,
  home: Home,
  star: Star,
  heart: Heart,
  zap: Zap,
  target: Target,
  coffee: Coffee,
  music: Music,
  camera: Camera,
  code: Code,
  globe: Globe,
  "shopping-cart": ShoppingCart,
  clipboard: Clipboard,
  flag: Flag,
  rocket: Rocket,
  sun: Sun,
  "graduation-cap": GraduationCap,
  dumbbell: Dumbbell,
  car: Car,
  plane: Plane,
  "tree-pine": TreePine,
  "flask-conical": FlaskConical,
  gamepad2: Gamepad2,
  palette: Palette,
  wrench: Wrench,
  utensils: Utensils,
  bike: Bike,
  tent: Tent,
  microscope: Microscope,
  cpu: Cpu,
  package: Package,
  "map-pin": MapPin,
  newspaper: Newspaper,
  coins: Coins,
}
```

- [ ] **Step 2: Verify build**

```bash
cd C:/Claude/task-manager && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/ProjectIconPicker.tsx
git commit -m "feat: expand project icons from 24 to 36"
```

---

### Task 2: Remove drag handle — full card drag with lift effect

**Files:**
- Modify: `src/components/SortableTask.tsx`

- [ ] **Step 1: Rewrite SortableTask.tsx**

Replace the entire file content with:

```tsx
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export function SortableTask({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: isDragging
          ? `${CSS.Transform.toString(transform)} scale(1.03)`
          : CSS.Transform.toString(transform),
        transition,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : undefined,
        zIndex: isDragging ? 50 : undefined,
        opacity: 1,
        touchAction: "none",
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </li>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SortableTask.tsx
git commit -m "feat: remove drag handle, full card drag with lift effect on drag start"
```

---

### Task 3: Expand animation for task detail

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/tasks/TaskItem.tsx`

- [ ] **Step 1: Add keyframe and utility class to globals.css**

Open `src/app/globals.css`. Append at the end of the file:

```css
@keyframes expand-down {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@layer utilities {
  .animate-expand {
    animation: expand-down 0.18s ease-out;
  }
}
```

- [ ] **Step 2: Apply class in TaskItem expanded section**

Open `src/components/tasks/TaskItem.tsx`. Find the expanded section (around line 236):

```tsx
{isOpen && (
  <div className="border-t border-gray-100 px-3 pb-3 pt-2 flex flex-col gap-2.5">
```

Change `flex flex-col gap-2.5` to `flex flex-col gap-2.5 animate-expand`:

```tsx
{isOpen && (
  <div className="border-t border-gray-100 px-3 pb-3 pt-2 flex flex-col gap-2.5 animate-expand">
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/tasks/TaskItem.tsx
git commit -m "feat: smooth expand animation on task detail open"
```

---

### Task 4: TagFilter always visible

**Files:**
- Modify: `src/components/filters/TagFilter.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client"

import { useState } from "react"
import { Tag, ChevronDown, ChevronUp } from "lucide-react"
import type { Tag as TagType } from "@/types"

interface TagFilterProps {
  tags: TagType[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function TagFilter({ tags, selectedIds, onChange }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    )
  }

  const badgeCount = selectedIds.length > 0 ? selectedIds.length : tags.length

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
      >
        <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 flex-1">Метки</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            selectedIds.length > 0
              ? "bg-blue-100 text-blue-600"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {badgeCount}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Теги появятся здесь после создания
            </p>
          ) : (
            <>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggle(tag.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    selectedIds.includes(tag.id)
                      ? "text-white border-transparent"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                  }`}
                  style={
                    selectedIds.includes(tag.id)
                      ? { backgroundColor: tag.color, borderColor: tag.color }
                      : {}
                  }
                >
                  {tag.name}
                </button>
              ))}
              {selectedIds.length > 0 && (
                <button
                  onClick={() => onChange([])}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Сбросить
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/filters/TagFilter.tsx
git commit -m "feat: show TagFilter even when no tags exist yet"
```

---

### Task 5: Tag editing in expanded task view

Wire `tags` and `onCreateTag` through the component tree, then add inline tag picker in `TaskItem`.

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`
- Modify: `src/components/tasks/TaskList.tsx`
- Modify: `src/app/tasks/page.tsx`

#### Step 5a — Update TaskItem

- [ ] **Step 1: Fix imports in TaskItem (naming conflict)**

`Tag` is imported from lucide-react as an icon, but we also need `Tag` as a data type from `@/types`. Rename the lucide icon and add the type.

Open `src/components/tasks/TaskItem.tsx`.

Replace the lucide import:

```tsx
import {
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  CalendarDays,
  Tag,
  Pencil,
} from "lucide-react"
```

With:

```tsx
import {
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  RefreshCw,
  CalendarDays,
  Tag as TagIcon,
  Pencil,
} from "lucide-react"
```

Replace the `@/types` import:

```tsx
import type { Task, Subtask, Project } from "@/types"
```

With:

```tsx
import type { Task, Subtask, Project, Tag } from "@/types"
```

Then rename the existing usage of the lucide icon in the collapsed tags block (around line 323):

```tsx
                    <TagIcon className="w-2.5 h-2.5" />
```

(already updated — this is the result after rename)

- [ ] **Step 2: Add new props to TaskItemProps interface**

Find the `interface TaskItemProps` block. After `onUpdateTags`:

```tsx
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
```

Add two new props:

```tsx
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag>
```

The full interface now ends with:

```tsx
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
```

- [ ] **Step 3: Destructure new props in function signature**

Find:

```tsx
export function TaskItem({
  task,
  showProject,
  projects,
  onAssignProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
```

Replace with:

```tsx
export function TaskItem({
  task,
  showProject,
  projects,
  onAssignProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  tags,
  onCreateTag,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskItemProps) {
```

- [ ] **Step 4: Add new state variables after existing state**

After `const [showProjectDropdown, setShowProjectDropdown] = useState(false)`, add:

```tsx
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const tagPickerRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 5: Add click-outside effect for tag picker**

After the existing `useEffect` for project dropdown click-outside, add:

```tsx
  useEffect(() => {
    if (!showTagPicker) return
    function handleClickOutside(e: MouseEvent) {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) {
        setShowTagPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showTagPicker])
```

- [ ] **Step 6: Add tag helper functions**

After the `saveDescription` function, add:

```tsx
  const assignedTagIds = task.tags.map((t) => t.id)

  function toggleTag(tagId: string) {
    const newIds = assignedTagIds.includes(tagId)
      ? assignedTagIds.filter((id) => id !== tagId)
      : [...assignedTagIds, tagId]
    onUpdateTags(task.id, newIds)
  }

  async function handleCreateTag() {
    if (!tagInput.trim()) return
    try {
      const tag = await onCreateTag(tagInput.trim())
      setTagInput("")
      setShowTagPicker(false)
      await onUpdateTags(task.id, [...assignedTagIds, tag.id])
    } catch {
      // silently fail
    }
  }
```

- [ ] **Step 7: Replace the tags block in expanded section**

Find the existing tags block (around line 317):

```tsx
            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                    style={{ backgroundColor: tag.color }}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
```

Replace with:

```tsx
            {/* Tags */}
            <div className="relative" ref={tagPickerRef}>
              <div className="flex flex-wrap gap-1 items-center">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                    style={{ backgroundColor: tag.color }}
                  >
                    <TagIcon className="w-2.5 h-2.5" />
                    {tag.name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTag(tag.id)
                      }}
                      className="hover:opacity-70 ml-0.5 leading-none"
                      aria-label={`Снять метку ${tag.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTagPicker((o) => !o)
                    setTagInput("")
                  }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded-full border border-dashed border-gray-300 hover:border-gray-400"
                >
                  <TagIcon className="w-2.5 h-2.5" />
                  + тег
                </button>
              </div>

              {showTagPicker && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[180px] max-h-48 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tags.filter((t) => !assignedTagIds.includes(t.id)).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onMouseDown={() => {
                        toggleTag(tag.id)
                        setShowTagPicker(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  ))}
                  {tags.filter((t) => !assignedTagIds.includes(t.id)).length === 0 &&
                    !tagInput && (
                      <p className="px-3 py-2 text-xs text-gray-400">
                        Все метки уже назначены
                      </p>
                    )}
                  <div className="border-t border-gray-100 p-2">
                    <input
                      type="text"
                      placeholder="Новая метка..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          await handleCreateTag()
                        }
                        if (e.key === "Escape") setShowTagPicker(false)
                      }}
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400"
                      style={{ fontSize: "16px" }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    {tagInput.trim() &&
                      !tags.some(
                        (t) =>
                          t.name.toLowerCase() === tagInput.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onMouseDown={handleCreateTag}
                          className="mt-1 w-full text-left text-xs text-blue-600 px-1 hover:underline"
                        >
                          + Создать «{tagInput.trim()}»
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
```

- [ ] **Step 8: Verify build**

```bash
npx tsc --noEmit
```

Expected: errors about `tags` and `onCreateTag` not passed in TaskList — that's expected, fix in next step.

#### Step 5b — Update TaskList

- [ ] **Step 9: Add new props to TaskList**

Open `src/components/tasks/TaskList.tsx`. In `interface TaskListProps`, after `onUpdateTags`:

```tsx
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
```

Add:

```tsx
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag>
```

Also add `Tag` to the type import at the top (it's already there: `import type { Task, Subtask, DateFilter, Project } from "@/types"`). Change to:

```tsx
import type { Task, Subtask, DateFilter, Project, Tag } from "@/types"
```

- [ ] **Step 10: Destructure and pass new props in TaskList**

In the function signature, add `tags` and `onCreateTag` to destructuring:

```tsx
export function TaskList({
  tasks,
  filteredTasks,
  activeProjectId,
  dateFilter,
  projects,
  onAssignProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  tags,
  onCreateTag,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskListProps) {
```

In the `<TaskItem>` render, add the two new props:

```tsx
                <TaskItem
                  task={task}
                  showProject={!activeProjectId}
                  projects={projects}
                  onAssignProject={onAssignProject}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onRename={onRename}
                  onUpdateDueDate={onUpdateDueDate}
                  onUpdateDescription={onUpdateDescription}
                  onUpdateTags={onUpdateTags}
                  tags={tags}
                  onCreateTag={onCreateTag}
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                />
```

#### Step 5c — Update page.tsx

- [ ] **Step 11: Pass tags and onCreateTag to TaskList**

Open `src/app/tasks/page.tsx`. Find the `<TaskList` block. Add two new props:

```tsx
        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
          activeProjectId={activeProjectId}
          dateFilter={dateFilter}
          projects={projectHook.projects}
          onAssignProject={taskHook.assignProject}
          onToggle={taskHook.toggleTask}
          onDelete={taskHook.deleteTask}
          onRename={taskHook.renameTask}
          onUpdateDueDate={taskHook.updateDueDate}
          onUpdateDescription={taskHook.updateDescription}
          onUpdateTags={taskHook.updateTags}
          tags={tagHook.tags}
          onCreateTag={tagHook.createTag}
          onAddSubtask={taskHook.addSubtask}
          onToggleSubtask={taskHook.toggleSubtask}
          onDeleteSubtask={taskHook.deleteSubtask}
        />
```

- [ ] **Step 12: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add src/components/tasks/TaskItem.tsx src/components/tasks/TaskList.tsx src/app/tasks/page.tsx
git commit -m "feat: add inline tag picker with create in expanded task view"
```

---

### Task 6: ProjectTabs — delete in edit mode, confirmation dialog, click-outside

**Files:**
- Modify: `src/components/projects/ProjectTabs.tsx`

This task rewrites several sections of ProjectTabs. Apply changes one step at a time.

- [ ] **Step 1: Add new imports**

The current imports line is:

```tsx
import { useState } from "react"
```

Replace with:

```tsx
import { useState, useRef, useEffect } from "react"
```

- [ ] **Step 2: Add new state variables**

After the existing state declarations (after `const [error, setError] = useState<string | null>(null)`), add:

```tsx
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 3: Add click-outside effect**

After the state declarations, add:

```tsx
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
```

- [ ] **Step 4: Remove setIsOpen(false) from handleSelectProject**

Find:

```tsx
  function handleSelectProject(id: string | null) {
    onSelect(id)
    setIsOpen(false)
  }
```

Replace with:

```tsx
  function handleSelectProject(id: string | null) {
    onSelect(id)
  }
```

- [ ] **Step 5: Add ref to root div**

Find the root element:

```tsx
    <div className="mb-3">
```

Replace with:

```tsx
    <div className="mb-3" ref={containerRef}>
```

- [ ] **Step 6: Remove ✕ button from active project pill**

Find the active pill section (around line 179–195). The current code:

```tsx
                      {activeProjectId === project.id && (
                        <>
                          <button
                            onClick={() => startEditing(project)}
                            className="flex items-center justify-center w-8 min-h-[36px] bg-blue-500 text-white border border-l-0 border-blue-500 rounded-r-full hover:bg-blue-600 transition-colors"
                            aria-label="Редактировать проект"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDelete(project.id)}
                            className="text-xs text-red-400 hover:text-red-600 ml-1"
                          >
                            ✕
                          </button>
                        </>
                      )}
```

Replace with (remove the ✕ button entirely):

```tsx
                      {activeProjectId === project.id && (
                        <button
                          onClick={() => startEditing(project)}
                          className="flex items-center justify-center w-8 min-h-[36px] bg-blue-500 text-white border border-l-0 border-blue-500 rounded-r-full hover:bg-blue-600 transition-colors"
                          aria-label="Редактировать проект"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
```

- [ ] **Step 7: Add delete button and confirmation to edit mode**

Find the edit mode form block. Current code (lines ~129–165):

```tsx
                  {editingId === project.id ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setShowEditIconPicker((o) => !o)}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
                        >
                          <ProjectIcon icon={editingIcon} className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleUpdate(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(project.id)
                            if (e.key === "Escape") {
                              setEditingId(null)
                              setShowEditIconPicker(false)
                            }
                          }}
                          className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                          style={{ fontSize: "16px" }}
                          autoFocus
                        />
                      </div>
                      {showEditIconPicker && (
                        <ProjectIconPicker
                          selected={editingIcon}
                          onChange={(icon) => {
                            setEditingIcon(icon)
                            setShowEditIconPicker(false)
                          }}
                        />
                      )}
                    </div>
```

Replace with:

```tsx
                  {editingId === project.id ? (
                    deletingId === project.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <p className="text-xs text-gray-600">
                          Удалить проект? Выполненные задачи попадут в архив, незавершённые открепятся.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDelete(project.id)
                              setDeletingId(null)
                              setEditingId(null)
                            }}
                            className="text-xs px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setShowEditIconPicker((o) => !o)}
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
                        >
                          <ProjectIcon icon={editingIcon} className="w-4 h-4" />
                        </button>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={() => handleUpdate(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(project.id)
                            if (e.key === "Escape") {
                              setEditingId(null)
                              setShowEditIconPicker(false)
                            }
                          }}
                          className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                          style={{ fontSize: "16px" }}
                          autoFocus
                        />
                      </div>
                      {showEditIconPicker && (
                        <ProjectIconPicker
                          selected={editingIcon}
                          onChange={(icon) => {
                            setEditingIcon(icon)
                            setShowEditIconPicker(false)
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setDeletingId(project.id)}
                        className="text-xs text-red-400 hover:text-red-600 self-start"
                      >
                        Удалить проект
                      </button>
                    </div>
                    )
```

Note: the existing closing `) : (` for the normal pill view comes right after — make sure the JSX nesting stays correct. The full ternary structure is now:
```
editingId === project.id
  ? (deletingId === project.id ? <confirmation> : <edit form>)
  : <normal pill>
```

- [ ] **Step 8: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/projects/ProjectTabs.tsx
git commit -m "feat: move project delete to edit mode, add confirmation dialog, click-outside to close list"
```

---

## Final verification

- [ ] **Build check**

```bash
npx tsc --noEmit && npx next build
```

Expected: build completes without errors.

- [ ] **Manual browser checks**

1. Open project icon picker — verify 36 icons are shown in a grid
2. Drag a task — no grip icon visible, full card drag, card lifts on drag start
3. Expand a task — smooth fade+slide animation on open
4. Open TagFilter accordion with no tags — placeholder text shown
5. Open TagFilter with tags — tags shown, filter works
6. Expand a task, click "+ тег" — picker opens, can assign existing tags and create new
7. Click a project in list — list stays open, project becomes active
8. Click outside the project accordion — list closes
9. Click pencil on active project → edit mode — "Удалить проект" button visible
10. Click "Удалить проект" — confirmation text + buttons appear
11. Confirm delete — project deleted, state resets
12. Cancel delete — returns to edit form
