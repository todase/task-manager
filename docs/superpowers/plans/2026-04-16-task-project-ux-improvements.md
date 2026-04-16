# Task & Project UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать 5 UX-улучшений: перенос заголовка при раскрытии задачи, чип проекта и кнопка переименования в карточке задачи, чип проекта при создании, отмена авто-переключения проекта, карандаш на активном чипе проекта и фикс iOS-зума.

**Architecture:** Все изменения — чистые UI-правки в существующих компонентах без изменения API или хуков. `useTasks.assignProject` уже существует и пробрасывается через TaskList → TaskItem. `ProjectTabs` получает разделённую кнопку вместо `onDoubleClick`.

**Tech Stack:** React 19, Next.js App Router, Tailwind CSS 4, TypeScript, Lucide React, Vitest (node env — component tests не используются)

---

## Карта файлов

| Файл | Что меняется |
|------|-------------|
| `src/components/tasks/TaskItem.tsx` | wrap заголовка; убрать `onDoubleClick`; чип проекта + дропдаун; кнопка «переименовать»; `fontSize: 16` на input переименования |
| `src/components/tasks/TaskList.tsx` | пробросить `projects` и `onAssignProject` в TaskItem |
| `src/components/tasks/AddTaskForm.tsx` | чип «Проект ▾» при `activeProjectId === null`; `fontSize: 16` на inputs |
| `src/components/projects/ProjectTabs.tsx` | убрать `onSelect(project.id)` после создания; разделённая кнопка + карандаш; убрать `onDoubleClick`; `fontSize: 16` на inputs |
| `src/app/tasks/page.tsx` | передать `projects` и `onAssignProject` в TaskList |
| `src/app/layout.tsx` | **Не трогать** — viewport уже корректен (`viewportFit: "cover"`) |

---

## Task 1: Wrap заголовка задачи при раскрытии

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`

- [ ] **Шаг 1: Открыть файл и найти span заголовка**

В `TaskItem.tsx` строка ~186 содержит:
```tsx
<span
  className={`text-sm font-medium flex-1 min-w-0 truncate ${
    task.done ? "line-through text-gray-400" : "text-gray-900"
  }`}
  onDoubleClick={handleTitleDoubleClick}
>
```

- [ ] **Шаг 2: Изменить className span заголовка — убрать onDoubleClick, добавить условный truncate**

```tsx
<span
  className={`text-sm font-medium flex-1 min-w-0 ${
    isOpen ? "break-words" : "truncate"
  } ${task.done ? "line-through text-gray-400" : "text-gray-900"}`}
>
```

Удалить `onDoubleClick={handleTitleDoubleClick}` — переименование будет через кнопку (Task 2).

- [ ] **Шаг 3: Изменить выравнивание collapsed-строки — `items-center` → `items-start` при `isOpen`**

Строка ~142:
```tsx
<div className="flex items-center gap-3 px-3 py-3">
```
Заменить на:
```tsx
<div className={`flex gap-3 px-3 py-3 ${isOpen ? "items-start" : "items-center"}`}>
```

При `isOpen` чекбокс прижмётся к верху, заголовок из нескольких строк не разъедет макет.

- [ ] **Шаг 4: Удалить `handleTitleDoubleClick` (больше не нужен)**

Удалить функцию `handleTitleDoubleClick` (строки ~93–97):
```ts
function handleTitleDoubleClick(e: React.MouseEvent) {
  e.stopPropagation()
  setEditing(true)
  setEditTitle(task.title)
}
```

- [ ] **Шаг 5: Проверить TypeScript**

```bash
npx tsc --noEmit
```
Ожидание: 0 ошибок.

- [ ] **Шаг 6: Commit**

```bash
git add src/components/tasks/TaskItem.tsx
git commit -m "fix: wrap task title when card is expanded, align checkbox to top"
```

---

## Task 2: Чип проекта и кнопка «Переименовать» в развёрнутой карточке

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`

### 2a — Новые props и состояние

- [ ] **Шаг 1: Добавить импорт `Project` и `ChevronDown` (ChevronDown уже импортирован — проверить)**

В `TaskItem.tsx` добавить `Project` в импорт из `@/types`:
```tsx
import type { Task, Subtask, Project } from "@/types"
```

Убедиться, что `ChevronDown` импортирован из `lucide-react` (уже есть).

- [ ] **Шаг 2: Расширить `TaskItemProps`**

После существующих пропсов добавить:
```ts
interface TaskItemProps {
  task: Task
  showProject: boolean
  projects: Project[]
  onAssignProject: (taskId: string, projectId: string | null, project: Project | null) => Promise<void>
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onUpdateDescription: (id: string, description: string) => Promise<void>
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
}
```

- [ ] **Шаг 3: Деструктурировать новые пропсы в сигнатуре функции**

```tsx
export function TaskItem({
  task,
  showProject,
  projects,
  onAssignProject,
  onToggle,
  onDelete,
  onRename,
  // ... остальные без изменений
}: TaskItemProps) {
```

- [ ] **Шаг 4: Добавить состояние для дропдауна проекта**

После `const [editingDesc, setEditingDesc] = useState(false)` добавить:
```tsx
const [showProjectDropdown, setShowProjectDropdown] = useState(false)
```

### 2b — JSX для чипа проекта

- [ ] **Шаг 5: Добавить чип проекта в начало раскрытой секции**

В `{isOpen && (` блоке, сразу после `<div className="border-t border-gray-100 px-3 pb-3 pt-2 flex flex-col gap-2.5">`, добавить перед тегами:

```tsx
{/* Project chip + rename button row */}
<div className="flex items-center gap-2 flex-wrap">
  {/* Project chip */}
  <div className="relative">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setShowProjectDropdown((o) => !o)
      }}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
        task.project
          ? "bg-blue-50 border-blue-300 text-blue-600"
          : "border-gray-200 text-gray-400 hover:border-gray-400"
      }`}
    >
      {task.project ? (
        <>
          <ProjectIcon icon={task.project.icon} className="w-3 h-3" />
          <span>{task.project.title}</span>
        </>
      ) : (
        <span>Без проекта</span>
      )}
      <ChevronDown className="w-3 h-3 ml-0.5" />
    </button>

    {showProjectDropdown && (
      <div
        className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[160px] max-h-48 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            onAssignProject(task.id, null, null)
            setShowProjectDropdown(false)
          }}
          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
            !task.project ? "font-medium text-blue-600" : "text-gray-600"
          }`}
        >
          Без проекта
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onAssignProject(task.id, p.id, p)
              setShowProjectDropdown(false)
            }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
              task.project?.id === p.id ? "font-medium text-blue-600" : "text-gray-600"
            }`}
          >
            <ProjectIcon icon={p.icon} className="w-3 h-3 flex-shrink-0" />
            {p.title}
          </button>
        ))}
      </div>
    )}
  </div>

  {/* Rename button */}
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      setEditing(true)
      setEditTitle(task.title)
    }}
    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-full border border-gray-200 hover:border-gray-400 transition-colors"
  >
    <Pencil className="w-3 h-3" />
    переименовать
  </button>
</div>
```

- [ ] **Шаг 6: Закрывать дропдаун при клике вне него**

Добавить `useRef` и `useEffect` для закрытия дропдауна при клике вне:

```tsx
const projectDropdownRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!showProjectDropdown) return
  function handleClickOutside(e: MouseEvent) {
    if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
      setShowProjectDropdown(false)
    }
  }
  document.addEventListener("mousedown", handleClickOutside)
  return () => document.removeEventListener("mousedown", handleClickOutside)
}, [showProjectDropdown])
```

Оборачиваем `<div className="relative">` ссылкой: `<div className="relative" ref={projectDropdownRef}>`.

Импорт `useRef` в шапке компонента уже есть в файле? Нет — добавить `useRef` в `import { useState } from "react"` → `import { useState, useRef, useEffect } from "react"`.

- [ ] **Шаг 7: Проверить TypeScript**

```bash
npx tsc --noEmit
```
Ожидание: 0 ошибок.

- [ ] **Шаг 8: Commit**

```bash
git add src/components/tasks/TaskItem.tsx
git commit -m "feat: project chip with dropdown and rename button in expanded task card"
```

---

## Task 3: Пробросить props через TaskList → page.tsx

**Files:**
- Modify: `src/components/tasks/TaskList.tsx`
- Modify: `src/app/tasks/page.tsx`

- [ ] **Шаг 1: Добавить `projects` и `onAssignProject` в `TaskListProps`**

В `TaskList.tsx` добавить в интерфейс:
```ts
interface TaskListProps {
  tasks: Task[]
  filteredTasks: Task[]
  activeProjectId: string | null
  dateFilter: DateFilter
  projects: Project[]
  onAssignProject: (taskId: string, projectId: string | null, project: Project | null) => Promise<void>
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onUpdateDescription: (id: string, description: string) => Promise<void>
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
}
```

Добавить импорт `Project` из `@/types`:
```tsx
import type { Task, Subtask, DateFilter, Project } from "@/types"
```

- [ ] **Шаг 2: Деструктурировать новые props и пробросить в `TaskItem`**

В `TaskList.tsx` добавить `projects` и `onAssignProject` в деструктуризацию и передать в `<TaskItem`:

```tsx
export function TaskList({
  tasks,
  filteredTasks,
  activeProjectId,
  dateFilter,
  projects,
  onAssignProject,
  onToggle,
  // ... остальные
}: TaskListProps) {
```

В рендере:
```tsx
<TaskItem
  task={task}
  showProject={!activeProjectId}
  projects={projects}
  onAssignProject={onAssignProject}
  onToggle={onToggle}
  // ... остальные пропсы без изменений
/>
```

- [ ] **Шаг 3: Передать props из `page.tsx` в `TaskList`**

В `src/app/tasks/page.tsx` найти `<TaskList ...>` и добавить:
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
  onAddSubtask={taskHook.addSubtask}
  onToggleSubtask={taskHook.toggleSubtask}
  onDeleteSubtask={taskHook.deleteSubtask}
/>
```

- [ ] **Шаг 4: Проверить TypeScript**

```bash
npx tsc --noEmit
```
Ожидание: 0 ошибок.

- [ ] **Шаг 5: Запустить тесты**

```bash
npx vitest run
```
Ожидание: `useTasks` тесты проходят.

- [ ] **Шаг 6: Commit**

```bash
git add src/components/tasks/TaskList.tsx src/app/tasks/page.tsx
git commit -m "feat: wire projects and onAssignProject through TaskList to TaskItem"
```

---

## Task 4: Чип «Проект» в форме AddTaskForm

**Files:**
- Modify: `src/components/tasks/AddTaskForm.tsx`

- [ ] **Шаг 1: Добавить состояние выбранного проекта**

После `const [error, setError] = useState<string | null>(null)` добавить:
```tsx
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
const [showProjectDropdown, setShowProjectDropdown] = useState(false)
```

- [ ] **Шаг 2: Добавить импорт иконки папки и `ProjectIcon`**

В начало файла добавить в импорты из `lucide-react` иконку `Folder`:
```tsx
import {
  Plus,
  X,
  CalendarDays,
  RefreshCw,
  Tag as TagIcon,
  Folder,
} from "lucide-react"
```

Добавить импорт `ProjectIcon`:
```tsx
import { ProjectIcon } from "@/components/projects/ProjectIconPicker"
```

- [ ] **Шаг 3: Сбрасывать `selectedProjectId` при закрытии формы**

В функции `closeModal` добавить:
```ts
setSelectedProjectId(null)
setShowProjectDropdown(false)
```

- [ ] **Шаг 4: Передавать `selectedProjectId` при сабмите**

В `handleSubmit`, строку:
```ts
...(activeProjectId && { projectId: activeProjectId }),
```
Заменить на:
```ts
...(activeProjectId
  ? { projectId: activeProjectId }
  : selectedProjectId
  ? { projectId: selectedProjectId }
  : {}),
```

- [ ] **Шаг 5: Добавить чип «Проект ▾» в ряд кнопок**

В блоке `{/* Icon buttons row */}` после кнопки `"tags"` добавить условный рендер:
```tsx
{activeProjectId === null && (
  <div className="relative">
    <button
      type="button"
      onClick={() => setShowProjectDropdown((o) => !o)}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
        selectedProjectId
          ? "bg-blue-50 border-blue-300 text-blue-600"
          : "border-gray-200 text-gray-500 hover:border-gray-400"
      }`}
    >
      {selectedProjectId ? (
        <>
          <ProjectIcon
            icon={projects.find((p) => p.id === selectedProjectId)?.icon ?? "folder"}
            className="w-3.5 h-3.5"
          />
          {projects.find((p) => p.id === selectedProjectId)?.title}
        </>
      ) : (
        <>
          <Folder className="w-3.5 h-3.5" />
          Проект
        </>
      )}
    </button>

    {showProjectDropdown && (
      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-20 min-w-[160px] max-h-48 overflow-y-auto">
        <button
          type="button"
          onMouseDown={() => {
            setSelectedProjectId(null)
            setShowProjectDropdown(false)
          }}
          className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
            !selectedProjectId ? "font-medium text-blue-600" : "text-gray-600"
          }`}
        >
          Без проекта
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onMouseDown={() => {
              setSelectedProjectId(p.id)
              setShowProjectDropdown(false)
            }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
              selectedProjectId === p.id ? "font-medium text-blue-600" : "text-gray-600"
            }`}
          >
            <ProjectIcon icon={p.icon} className="w-3 h-3 flex-shrink-0" />
            {p.title}
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

Используется `onMouseDown` вместо `onClick` — чтобы сработало до `onBlur` родительского input и не закрылся дропдаун раньше выбора.

- [ ] **Шаг 6: Проверить TypeScript**

```bash
npx tsc --noEmit
```
Ожидание: 0 ошибок.

- [ ] **Шаг 7: Commit**

```bash
git add src/components/tasks/AddTaskForm.tsx
git commit -m "feat: project chip in AddTaskForm for 'All tasks' view"
```

---

## Task 5: Без авто-переключения при создании + карандаш на активном чипе ProjectTabs

**Files:**
- Modify: `src/components/projects/ProjectTabs.tsx`

### 5a — Убрать авто-переключение

- [ ] **Шаг 1: Убрать `onSelect(project.id)` из `handleCreate`**

В `ProjectTabs.tsx` найти `handleCreate` (строки ~37–51):
```ts
async function handleCreate(e: React.FormEvent) {
  e.preventDefault()
  if (!newTitle.trim()) return
  setError(null)
  try {
    const project = await onCreate(newTitle.trim(), newIcon)
    setNewTitle("")
    setNewIcon("folder")
    setShowNew(false)
    setShowNewIconPicker(false)
    onSelect(project.id)   // ← УДАЛИТЬ ЭТУ СТРОКУ
    setIsOpen(false)
  } catch {
    setError("Не удалось создать проект. Попробуйте ещё раз.")
  }
}
```

Удалить строку `onSelect(project.id)`.

### 5b — Разделённая кнопка с карандашом

- [ ] **Шаг 2: Добавить импорт иконки `Pencil` из lucide-react**

Найти строку импортов:
```tsx
import { FolderOpen, ChevronDown, ChevronUp } from "lucide-react"
```
Заменить на:
```tsx
import { FolderOpen, ChevronDown, ChevronUp, Pencil } from "lucide-react"
```

- [ ] **Шаг 3: Убрать `onDoubleClick` и добавить кнопку-карандаш на активном чипе**

Найти кнопку проекта в обычном (не редактируемом) состоянии (строки ~167–179):
```tsx
<button
  onClick={() => handleSelectProject(project.id)}
  onDoubleClick={() => startEditing(project)}
  className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border min-h-[36px] transition-colors ${
    activeProjectId === project.id
      ? "bg-blue-500 text-white border-blue-500"
      : "text-gray-500 border-gray-200 hover:border-gray-400"
  }`}
>
  <ProjectIcon icon={project.icon} className="w-3.5 h-3.5" />
  {project.title}
</button>
```

Заменить **весь блок** `<div key={project.id} className="flex items-center gap-1">` ... `</div>` (включая кнопку удаления) на:

```tsx
<div key={project.id} className="flex items-center">
  <DroppableProject id={project.id}>
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
    ) : (
      <div className="flex items-center">
        <button
          onClick={() => handleSelectProject(project.id)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1 min-h-[36px] transition-colors border ${
            activeProjectId === project.id
              ? "bg-blue-500 text-white border-blue-500 rounded-l-full"
              : "text-gray-500 border-gray-200 hover:border-gray-400 rounded-full"
          }`}
        >
          <ProjectIcon icon={project.icon} className="w-3.5 h-3.5" />
          {project.title}
        </button>
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
      </div>
    )}
  </DroppableProject>
</div>
```

- [ ] **Шаг 4: Проверить TypeScript**

```bash
npx tsc --noEmit
```
Ожидание: 0 ошибок.

- [ ] **Шаг 5: Commit**

```bash
git add src/components/projects/ProjectTabs.tsx
git commit -m "feat: split edit/select button on active project chip, remove auto-switch on create"
```

---

## Task 6: iOS-зум — font-size 16px на всех inputs

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`
- Modify: `src/components/tasks/AddTaskForm.tsx`
- Modify: `src/components/projects/ProjectTabs.tsx`

> **Контекст:** iOS Safari зумирует страницу при фокусе на input с font-size < 16px. `layout.tsx` уже имеет `viewportFit: "cover"` — трогать не нужно.

### TaskItem.tsx

- [ ] **Шаг 1: Добавить `style={{ fontSize: "16px" }}` на input переименования задачи**

В `TaskItem.tsx` найти inline input переименования (строка ~171):
```tsx
<input
  type="text"
  value={editTitle}
  onChange={(e) => setEditTitle(e.target.value)}
  onBlur={commitRename}
  onKeyDown={(e) => {
    if (e.key === "Enter") commitRename()
    if (e.key === "Escape") setEditing(false)
  }}
  className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
  autoFocus
  onClick={(e) => e.stopPropagation()}
/>
```

Добавить `style={{ fontSize: "16px" }}` как атрибут.

### AddTaskForm.tsx

- [ ] **Шаг 2: Добавить `style={{ fontSize: "16px" }}` на title input**

Строка ~166:
```tsx
<input
  ref={titleInputRef}
  type="text"
  placeholder={placeholder}
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400"
/>
```
Добавить `style={{ fontSize: "16px" }}`.

- [ ] **Шаг 3: Добавить `style={{ fontSize: "16px" }}` на tag input**

Строка ~251:
```tsx
<input
  type="text"
  placeholder="Добавить метку..."
  value={tagInput}
  onChange={(e) => setTagInput(e.target.value)}
  onFocus={() => setShowTagMenu(true)}
  onBlur={() => setTimeout(() => setShowTagMenu(false), 150)}
  className="border border-gray-200 rounded-lg p-2 text-sm w-full outline-none focus:border-blue-400"
/>
```
Добавить `style={{ fontSize: "16px" }}`.

### ProjectTabs.tsx

- [ ] **Шаг 4: Добавить `style={{ fontSize: "16px" }}` на input нового проекта**

Строка ~204:
```tsx
<input
  type="text"
  placeholder="Название проекта..."
  value={newTitle}
  onChange={(e) => setNewTitle(e.target.value)}
  className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
  autoFocus
  onBlur={() => { ... }}
/>
```
Добавить `style={{ fontSize: "16px" }}`.

Примечание: input редактирования проекта (`editingTitle`) уже добавлен в Task 5 шаг 3 с `style={{ fontSize: "16px" }}`.

- [ ] **Шаг 5: Проверить TypeScript**

```bash
npx tsc --noEmit
```
Ожидание: 0 ошибок.

- [ ] **Шаг 6: Запустить тесты**

```bash
npx vitest run
```
Ожидание: тесты проходят.

- [ ] **Шаг 7: Commit**

```bash
git add src/components/tasks/TaskItem.tsx src/components/tasks/AddTaskForm.tsx src/components/projects/ProjectTabs.tsx
git commit -m "fix: add font-size 16px to all inputs to prevent iOS Safari zoom"
```

---

## Проверка покрытия спека

| Требование спека | Задача |
|-----------------|--------|
| 1. Заголовок с `break-words` при `isOpen`, `truncate` при закрытии | Task 1 |
| 1. `items-start` в header-row при `isOpen` | Task 1 |
| 2a. Чип проекта с дропдауном в раскрытой карточке | Task 2 |
| 2a. Новые пропсы `projects` и `onAssignProject` | Task 2 + Task 3 |
| 2b. Кнопка «переименовать» вместо `onDoubleClick` | Task 2 |
| 3a. Чип «Проект ▾» в `AddTaskForm` при `activeProjectId === null` | Task 4 |
| 3a. `selectedProjectId` передаётся при сабмите | Task 4 |
| 3b. Убрать авто-переключение после создания проекта | Task 5 |
| 4. `font-size: 16px` на inputs в TaskItem, AddTaskForm, ProjectTabs | Task 6 |
| 4. viewport `viewportFit: cover` | Уже выполнено (layout.tsx) |
| 5. Разделённая кнопка с карандашом на активном чипе | Task 5 |
| 5. Убрать `onDoubleClick` с чипа проекта | Task 5 |
