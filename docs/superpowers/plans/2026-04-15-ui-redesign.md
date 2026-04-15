# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать визуальный дизайн приложения — белые карточки на тёплом фоне, иконки Lucide вместо текстовых кнопок, сегментированный контрол фильтров, аккордеоны для проектов и тегов, FAB + модальное окно вместо inline-формы.

**Architecture:** Итеративный рефакторинг — компоненты меняются по одному без изменения структуры данных и API. Логика drag-and-drop и SwipeableRow сохраняется. Хуки useTasks/useProjects/useTags не меняются.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, lucide-react (устанавливается в этом плане), @dnd-kit (без изменений)

**Testing strategy:** Vitest настроен на `environment: "node"` без jsdom, компонентные тесты не поддерживаются. После каждого таска: `npm test` (регрессия хук-тестов) + `npm run build` (TypeScript). Визуальная проверка — в браузере вручную.

---

## File Map

| Файл | Действие | Что меняется |
|------|----------|--------------|
| `package.json` | Modify | Добавить `lucide-react` |
| `src/app/globals.css` | Modify | Фон страницы `#f0f4ff`, CSS-токены |
| `src/components/SortableTask.tsx` | Modify | `⠿` → `GripVertical` из lucide |
| `src/components/filters/DateFilters.tsx` | Modify | Кнопки → iOS-сегментированный контрол |
| `src/components/tasks/TaskItem.tsx` | Modify | Полный редизайн: collapsed/expanded, иконки |
| `src/components/tasks/SubtaskPanel.tsx` | Modify | Стиль внутри expanded: × вместо «Удалить» |
| `src/components/projects/ProjectTabs.tsx` | Modify | Аккордеон с иконкой папки |
| `src/components/filters/TagFilter.tsx` | Modify | Аккордеон с иконкой тега |
| `src/components/tasks/AddTaskForm.tsx` | Modify | FAB + модальное окно, убрать prop `inputRef` |
| `src/components/BottomNav.tsx` | Delete | Компонент удаляется |
| `src/app/tasks/page.tsx` | Modify | Убрать BottomNav + titleInputRef, иконка выхода |

---

## Task 1: Установить lucide-react

**Files:**
- Modify: `package.json` (автоматически через npm)

- [ ] **Step 1: Установить пакет**

```bash
npm install lucide-react
```

- [ ] **Step 2: Проверить, что импорт работает**

```bash
node -e "require('lucide-react'); console.log('ok')"
```

Ожидаемый вывод: `ok`

- [ ] **Step 3: Запустить тесты для проверки отсутствия регрессий**

```bash
npm test
```

Ожидаемый вывод: все тесты PASS (useTasks тесты).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install lucide-react"
```

---

## Task 2: Обновить globals.css — фон и токены

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Заменить содержимое globals.css**

```css
@import "tailwindcss";

:root {
  --background: #f0f4ff;
  --foreground: #111827;
  --card: #ffffff;
  --accent: #3b82f6;
  --muted: #6b7280;
  --surface: #f3f4f6;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 2: Запустить dev-сервер и проверить фон**

```bash
npm run dev
```

Открыть `http://localhost:3000/tasks`. Фон страницы должен быть голубовато-серым (#f0f4ff), а не белым.

- [ ] **Step 3: Остановить dev-сервер, запустить тесты**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: update page background and CSS tokens"
```

---

## Task 3: SortableTask — иконка GripVertical

**Files:**
- Modify: `src/components/SortableTask.tsx`

- [ ] **Step 1: Заменить ⠿ на иконку GripVertical**

Полное содержимое файла:

```tsx
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

export function SortableTask({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="flex items-start gap-1"
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing mt-3.5 px-0.5 select-none"
        style={{ touchAction: "none" }}
        tabIndex={-1}
        aria-label="Перетащить задачу"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1">{children}</div>
    </li>
  )
}
```

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SortableTask.tsx
git commit -m "style: replace drag handle text with GripVertical icon"
```

---

## Task 4: DateFilters — сегментированный контрол

**Files:**
- Modify: `src/components/filters/DateFilters.tsx`

Лейблы из спека: `today → "Сегодня"`, `week → "Неделя"`, `all → "Все"`, `someday → "Потом"`.
Стиль: внешний контейнер `bg-gray-200 rounded-lg p-1`, активный сегмент `bg-white shadow-sm rounded-md`.

- [ ] **Step 1: Переписать компонент**

```tsx
"use client"

import type { DateFilter } from "@/types"

interface DateFiltersProps {
  value: DateFilter
  onChange: (filter: DateFilter) => void
}

const LABELS: Record<DateFilter, string> = {
  today: "Сегодня",
  week: "Неделя",
  all: "Все",
  someday: "Потом",
}

const FILTERS: DateFilter[] = ["today", "week", "all", "someday"]

export function DateFilters({ value, onChange }: DateFiltersProps) {
  return (
    <div className="flex bg-gray-200 rounded-lg p-1 mb-4">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${
            value === filter
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {LABELS[filter]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/components/filters/DateFilters.tsx
git commit -m "style: DateFilters → iOS segmented control"
```

---

## Task 5: TaskItem — полный редизайн

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx`

Логика:
- Клик по строке (не по интерактивным элементам) → toggle isOpen
- Двойной клик по тексту заголовка → режим переименования
- Collapsed: round checkbox + title + badge даты + chevron
- Expanded: синяя левая граница, теги, повторение, дата с иконкой, описание (italic), SubtaskPanel, кнопка удаления
- Приоритетная граница: в свёрнутом — interpolated color; в раскрытом — синяя (#3b82f6)
- SwipeableRow сохраняется

- [ ] **Step 1: Написать новый TaskItem**

```tsx
"use client"

import { useState } from "react"
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
import type { Task, Subtask } from "@/types"
import { SwipeableRow } from "@/components/SwipeableRow"
import { SubtaskPanel } from "@/components/tasks/SubtaskPanel"

function priorityColor(score: number): string {
  const r = Math.round(59 + (229 - 59) * (1 - score))
  const g = Math.round(130 + (231 - 130) * (1 - score))
  const b = Math.round(246 + (235 - 246) * (1 - score))
  return `rgb(${r}, ${g}, ${b})`
}

function dateBadgeClasses(task: Task): string {
  if (!task.dueDate) return ""
  if (task.done) return "bg-gray-100 text-gray-400"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.dueDate)
  due.setHours(0, 0, 0, 0)
  if (due < today) return "bg-red-50 text-red-600"
  if (due.getTime() === today.getTime()) return "bg-green-50 text-green-700"
  return "bg-blue-50 text-blue-700"
}

const RECURRENCE_LABEL: Record<string, string> = {
  daily: "ежедневно",
  weekly: "еженедельно",
  monthly: "ежемесячно",
}

interface TaskItemProps {
  task: Task
  showProject: boolean
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

export function TaskItem({
  task,
  showProject,
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
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [descValue, setDescValue] = useState(task.description ?? "")

  function handleRowClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (
      target.tagName === "INPUT" ||
      target.tagName === "BUTTON" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "LABEL" ||
      target.closest("button") !== null ||
      target.closest("label") !== null ||
      target.closest("input") !== null ||
      target.closest("textarea") !== null
    )
      return
    setIsOpen((o) => !o)
  }

  function handleTitleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    setEditing(true)
    setEditTitle(task.title)
  }

  async function commitRename() {
    if (!editTitle.trim() || editTitle === task.title) {
      setEditing(false)
      return
    }
    await onRename(task.id, editTitle.trim())
    setEditing(false)
  }

  async function saveDescription() {
    const current = task.description ?? ""
    if (descValue === current) {
      setEditingDesc(false)
      return
    }
    await onUpdateDescription(task.id, descValue)
    setEditingDesc(false)
  }

  const borderColor = isOpen ? "#3b82f6" : priorityColor(task.priorityScore)
  const dateInputId = `date-${task.id}`

  return (
    <SwipeableRow
      onSubtasks={() => setIsOpen((o) => !o)}
      onDelete={() => onDelete(task.id)}
      subtasksLabel={isOpen ? "Свернуть" : "Подзадачи"}
    >
      {/* Hidden native date picker */}
      <input
        type="date"
        id={dateInputId}
        value={
          task.dueDate
            ? new Date(task.dueDate).toISOString().split("T")[0]
            : ""
        }
        onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
        className="sr-only"
      />

      <div
        className="bg-white rounded-xl shadow-sm cursor-pointer select-none overflow-hidden"
        style={{ borderLeft: `3px solid ${borderColor}` }}
        onClick={handleRowClick}
      >
        {/* ─── Collapsed row ─── */}
        <div className="flex items-center gap-3 px-3 py-3">
          {/* Round checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(task)
            }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              task.done
                ? "border-blue-500 bg-blue-500"
                : "border-gray-300 hover:border-blue-400"
            }`}
            aria-label={task.done ? "Отметить невыполненной" : "Отметить выполненной"}
          >
            {task.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>

          {/* Project badge (when showing all projects) */}
          {showProject && task.project && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
              {task.project.title}
            </span>
          )}

          {/* Title */}
          {editing ? (
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
          ) : (
            <span
              className={`text-sm font-medium flex-1 min-w-0 truncate ${
                task.done ? "line-through text-gray-400" : "text-gray-900"
              }`}
              onDoubleClick={handleTitleDoubleClick}
            >
              {task.title}
            </span>
          )}

          {/* Date badge (only in collapsed) */}
          {task.dueDate && !isOpen && (
            <label
              htmlFor={dateInputId}
              className={`text-xs px-2 py-0.5 rounded-full cursor-pointer flex-shrink-0 ${dateBadgeClasses(task)}`}
              onClick={(e) => e.stopPropagation()}
            >
              {new Date(task.dueDate).toLocaleDateString("ru-RU")}
            </label>
          )}

          {/* Chevron toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen((o) => !o)
            }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label={isOpen ? "Свернуть" : "Развернуть"}
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ─── Expanded section ─── */}
        {isOpen && (
          <div className="border-t border-gray-100 px-3 pb-3 pt-2 flex flex-col gap-2.5">
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

            {/* Recurrence */}
            {task.recurrence && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <RefreshCw className="w-3 h-3" />
                <span>{RECURRENCE_LABEL[task.recurrence] ?? task.recurrence}</span>
              </div>
            )}

            {/* Date with icon + clear button */}
            <div className="flex items-center gap-2">
              <label
                htmlFor={dateInputId}
                className={`flex items-center gap-1 text-xs cursor-pointer ${
                  task.dueDate
                    ? `${dateBadgeClasses(task)} px-2 py-0.5 rounded-full`
                    : "text-gray-400 hover:text-gray-600"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <CalendarDays className="w-3 h-3" />
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("ru-RU")
                  : "Добавить дату"}
              </label>
              {task.dueDate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdateDueDate(task.id, "")
                  }}
                  className="text-gray-300 hover:text-gray-500 leading-none"
                  tabIndex={-1}
                  aria-label="Сбросить дату"
                >
                  ×
                </button>
              )}
            </div>

            {/* Description */}
            {editingDesc ? (
              <textarea
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onBlur={saveDescription}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) saveDescription()
                  if (e.key === "Escape") {
                    setDescValue(task.description ?? "")
                    setEditingDesc(false)
                  }
                }}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-600 resize-none outline-none focus:border-blue-400"
                rows={3}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingDesc(true)
                  setDescValue(task.description ?? "")
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 text-left italic"
              >
                <Pencil className="w-3 h-3 flex-shrink-0" />
                {task.description
                  ? task.description.slice(0, 100) +
                    (task.description.length > 100 ? "…" : "")
                  : "Добавить описание..."}
              </button>
            )}

            {/* Subtask panel */}
            <SubtaskPanel
              taskId={task.id}
              subtasks={task.subtasks}
              onAdd={onAddSubtask}
              onToggle={onToggleSubtask}
              onDelete={onDeleteSubtask}
            />

            {/* Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 self-start mt-1"
            >
              <Trash2 className="w-4 h-4" />
              Удалить задачу
            </button>
          </div>
        )}
      </div>
    </SwipeableRow>
  )
}
```

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

- [ ] **Step 3: Build-проверка TypeScript**

```bash
npm run build
```

Ожидаемый вывод: успешная сборка без ошибок типов.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/TaskItem.tsx
git commit -m "style: TaskItem — collapsed/expanded redesign with Lucide icons"
```

---

## Task 6: SubtaskPanel — новый стиль

**Files:**
- Modify: `src/components/tasks/SubtaskPanel.tsx`

Изменения: × вместо «Удалить», подчёркнутый input без рамки, кнопка + в виде текста.

- [ ] **Step 1: Переписать компонент**

```tsx
"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { Subtask } from "@/types"

interface SubtaskPanelProps {
  taskId: string
  subtasks: Subtask[]
  onAdd: (taskId: string, title: string) => Promise<void>
  onToggle: (taskId: string, subtask: Subtask) => Promise<void>
  onDelete: (taskId: string, subtaskId: string) => Promise<void>
}

export function SubtaskPanel({
  taskId,
  subtasks,
  onAdd,
  onToggle,
  onDelete,
}: SubtaskPanelProps) {
  const [input, setInput] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    await onAdd(taskId, input.trim())
    setInput("")
  }

  const doneCount = subtasks.filter((s) => s.done).length

  return (
    <div className="flex flex-col gap-1.5">
      {subtasks.length > 0 && (
        <p className="text-xs text-gray-400 font-medium">
          Подзадачи {doneCount}/{subtasks.length}
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {subtasks.map((subtask) => (
          <li key={subtask.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={subtask.done}
              onChange={() => onToggle(taskId, subtask)}
              className="w-3.5 h-3.5 rounded accent-blue-500 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <span
              className={`text-sm flex-1 ${
                subtask.done ? "line-through text-gray-400" : "text-gray-700"
              }`}
            >
              {subtask.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(taskId, subtask.id)
              }}
              className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              aria-label="Удалить подзадачу"
            >
              <X className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Добавить подзадачу..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="text-sm flex-1 border-b border-gray-200 py-0.5 outline-none focus:border-blue-400 bg-transparent text-gray-700 placeholder:text-gray-300"
        />
        <button
          type="submit"
          className="text-blue-400 hover:text-blue-600 text-sm font-medium flex-shrink-0"
        >
          +
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/SubtaskPanel.tsx
git commit -m "style: SubtaskPanel — clean style with X icon, underline input"
```

---

## Task 7: ProjectTabs — аккордеон

**Files:**
- Modify: `src/components/projects/ProjectTabs.tsx`

Логика: свёрнутая строка с иконкой папки + «Проекты» + счётчик. Раскрывается при клике. Клик на проект → выбирает его и закрывает аккордеон. DroppableProject сохраняется.

- [ ] **Step 1: Переписать компонент**

```tsx
"use client"

import { useState } from "react"
import { FolderOpen, ChevronDown, ChevronUp } from "lucide-react"
import { DroppableProject } from "@/components/DroppableProject"
import type { Project } from "@/types"

interface ProjectTabsProps {
  projects: Project[]
  activeProjectId: string | null
  onSelect: (id: string | null) => void
  onCreate: (title: string) => Promise<Project>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
}

export function ProjectTabs({
  projects,
  activeProjectId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: ProjectTabsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setError(null)
    try {
      const project = await onCreate(newTitle.trim())
      setNewTitle("")
      setShowNew(false)
      onSelect(project.id)
      setIsOpen(false)
    } catch {
      setError("Не удалось создать проект. Попробуйте ещё раз.")
    }
  }

  async function handleRename(id: string) {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }
    await onRename(id, editingTitle.trim())
    setEditingId(null)
  }

  function handleSelectProject(id: string | null) {
    onSelect(id)
    setIsOpen(false)
  }

  const activeLabel =
    activeProjectId === null
      ? "Все задачи"
      : (projects.find((p) => p.id === activeProjectId)?.title ?? "Проект")

  return (
    <div className="mb-3">
      {/* Accordion header */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
      >
        <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 flex-1">
          Проекты
          {activeProjectId !== null && (
            <span className="ml-1 text-blue-500">· {activeLabel}</span>
          )}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {projects.length}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-col gap-2">
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {/* All tasks */}
            <DroppableProject id="all">
              <button
                onClick={() => handleSelectProject(null)}
                className={`text-sm px-3 py-1 rounded-full border min-h-[36px] transition-colors ${
                  activeProjectId === null
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                Все задачи
              </button>
            </DroppableProject>

            {/* Project pills */}
            {projects.map((project) => (
              <div key={project.id} className="flex items-center gap-1">
                <DroppableProject id={project.id}>
                  {editingId === project.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleRename(project.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(project.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      className="border p-1 rounded text-sm w-32 outline-none focus:border-blue-400"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => handleSelectProject(project.id)}
                      onDoubleClick={() => {
                        setEditingId(project.id)
                        setEditingTitle(project.title)
                      }}
                      className={`text-sm px-3 py-1 rounded-full border min-h-[36px] transition-colors ${
                        activeProjectId === project.id
                          ? "bg-blue-500 text-white border-blue-500"
                          : "text-gray-500 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {project.title}
                    </button>
                  )}
                  {activeProjectId === project.id && editingId !== project.id && (
                    <button
                      onClick={() => onDelete(project.id)}
                      className="text-xs text-red-400 hover:text-red-600 ml-1"
                    >
                      ✕
                    </button>
                  )}
                </DroppableProject>
              </div>
            ))}
          </div>

          {/* New project form */}
          {showNew ? (
            <form onSubmit={handleCreate} className="flex gap-1">
              <input
                type="text"
                placeholder="Название проекта..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="border p-1 rounded text-sm flex-1 outline-none focus:border-blue-400"
                autoFocus
                onBlur={() => {
                  if (!newTitle) setShowNew(false)
                }}
              />
              <button
                type="submit"
                className="text-sm bg-blue-500 text-white px-3 rounded hover:bg-blue-600"
              >
                +
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="text-sm px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 self-start"
            >
              + проект
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/ProjectTabs.tsx
git commit -m "style: ProjectTabs → accordion with folder icon"
```

---

## Task 8: TagFilter — аккордеон

**Files:**
- Modify: `src/components/filters/TagFilter.tsx`

Логика: свёрнутая строка с иконкой тега + «Метки» + счётчик (активных или всего). Клик на тег — мультивыбор, аккордеон не закрывается.

- [ ] **Step 1: Переписать компонент**

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

  if (tags.length === 0) return null

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
      {/* Accordion header */}
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

      {/* Expanded content */}
      {isOpen && (
        <div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2">
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
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/components/filters/TagFilter.tsx
git commit -m "style: TagFilter → accordion with tag icon"
```

---

## Task 9: AddTaskForm — FAB + модальное окно

**Files:**
- Modify: `src/components/tasks/AddTaskForm.tsx`

Изменения:
- Убрать prop `inputRef` из интерфейса
- Добавить `isModalOpen` state
- FAB: `position: fixed`, `bottom-6 right-6`, синий круг 48×48
- Модал: backdrop + bottom sheet (мобиль) / центрированный (desktop)
- Три иконки-кнопки внутри модала: CalendarDays · RefreshCw · Tag
- Автофокус на поле названия при открытии
- Закрытие: крестик, клик на backdrop, Escape

- [ ] **Step 1: Написать новый AddTaskForm**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import {
  Plus,
  X,
  CalendarDays,
  RefreshCw,
  Tag as TagIcon,
} from "lucide-react"
import type { CreateTaskInput } from "@/hooks/useTasks"
import type { Project, Tag } from "@/types"

interface AddTaskFormProps {
  activeProjectId: string | null
  projects: Project[]
  tags: Tag[]
  onSubmit: (input: CreateTaskInput) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
}

export function AddTaskForm({
  activeProjectId,
  projects,
  tags,
  onSubmit,
  onCreateTag,
}: AddTaskFormProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [recurrence, setRecurrence] = useState("")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [activeField, setActiveField] = useState<"date" | "recurrence" | "tags" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isModalOpen) {
      // Auto-focus title input when modal opens
      setTimeout(() => titleInputRef.current?.focus(), 50)
    }
  }, [isModalOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isModalOpen) closeModal()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function closeModal() {
    setIsModalOpen(false)
    setTitle("")
    setDueDate("")
    setRecurrence("")
    setSelectedTagIds([])
    setTagInput("")
    setShowTagMenu(false)
    setActiveField(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        ...(dueDate && { dueDate }),
        ...(recurrence && { recurrence }),
        ...(activeProjectId && { projectId: activeProjectId }),
        ...(selectedTagIds.length > 0 && { tagIds: selectedTagIds }),
      })
      closeModal()
    } catch {
      setError("Не удалось создать задачу. Попробуйте ещё раз.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const placeholder = activeProjectId
    ? `Задача в «${projects.find((p) => p.id === activeProjectId)?.title}»...`
    : "Новая задача..."

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTagIds.includes(t.id)
  )

  async function handleSelectTag(id: string) {
    setSelectedTagIds((prev) => [...prev, id])
    setTagInput("")
    setShowTagMenu(false)
  }

  async function handleCreateTag() {
    if (!tagInput.trim()) return
    const tag = await onCreateTag(tagInput.trim())
    setSelectedTagIds((prev) => [...prev, tag.id])
    setTagInput("")
    setShowTagMenu(false)
  }

  function toggleField(field: "date" | "recurrence" | "tags") {
    setActiveField((prev) => (prev === field ? null : field))
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center transition-colors z-30"
        aria-label="Добавить задачу"
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Panel — bottom sheet on mobile, centered on desktop */}
          <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-50 pointer-events-none">
            <div className="bg-white rounded-t-2xl md:rounded-2xl md:max-w-md md:w-full md:mx-4 shadow-xl pointer-events-auto">
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Modal header */}
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-base font-semibold text-gray-900">
                  Новая задача
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-4 pb-6 flex flex-col gap-3">
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                {/* Title input */}
                <input
                  ref={titleInputRef}
                  type="text"
                  placeholder={placeholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400"
                />

                {/* Icon buttons row */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleField("date")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      dueDate || activeField === "date"
                        ? "bg-blue-50 border-blue-300 text-blue-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    {dueDate
                      ? new Date(dueDate).toLocaleDateString("ru-RU")
                      : "Дата"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleField("recurrence")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      recurrence || activeField === "recurrence"
                        ? "bg-blue-50 border-blue-300 text-blue-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {recurrence ? { daily: "День", weekly: "Неделя", monthly: "Месяц" }[recurrence] : "Повтор"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleField("tags")}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedTagIds.length > 0 || activeField === "tags"
                        ? "bg-blue-50 border-blue-300 text-blue-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    <TagIcon className="w-3.5 h-3.5" />
                    {selectedTagIds.length > 0 ? `Метки (${selectedTagIds.length})` : "Метки"}
                  </button>
                </div>

                {/* Date picker */}
                {activeField === "date" && (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2 text-sm text-gray-600 outline-none focus:border-blue-400"
                  />
                )}

                {/* Recurrence picker */}
                {activeField === "recurrence" && (
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2 text-sm text-gray-600 outline-none focus:border-blue-400"
                  >
                    <option value="">Не повторять</option>
                    <option value="daily">Каждый день</option>
                    <option value="weekly">Каждую неделю</option>
                    <option value="monthly">Каждый месяц</option>
                  </select>
                )}

                {/* Tag selector */}
                {activeField === "tags" && (
                  <div className="flex flex-col gap-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Добавить метку..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onFocus={() => setShowTagMenu(true)}
                        onBlur={() => setTimeout(() => setShowTagMenu(false), 150)}
                        className="border border-gray-200 rounded-lg p-2 text-sm w-full outline-none focus:border-blue-400"
                      />
                      {showTagMenu && (filteredTags.length > 0 || tagInput.trim()) && (
                        <div className="absolute top-full left-0 bg-white border rounded-lg shadow-md z-10 w-full max-h-40 overflow-y-auto mt-1">
                          {filteredTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onMouseDown={() => handleSelectTag(tag.id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm flex items-center gap-2"
                            >
                              <span
                                className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                                style={{ backgroundColor: tag.color }}
                              />
                              {tag.name}
                            </button>
                          ))}
                          {tagInput.trim() &&
                            !tags.some(
                              (t) =>
                                t.name.toLowerCase() === tagInput.trim().toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onMouseDown={handleCreateTag}
                                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-sm text-blue-600"
                              >
                                + Создать «{tagInput.trim()}»
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                    {selectedTagIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedTagIds.map((id) => {
                          const tag = tags.find((t) => t.id === id)
                          if (!tag) return null
                          return (
                            <span
                              key={id}
                              className="text-xs px-2 py-0.5 rounded-full text-white flex items-center gap-1"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedTagIds((prev) => prev.filter((s) => s !== id))
                                }
                                className="hover:opacity-70"
                              >
                                ×
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {isSubmitting ? "Создаём..." : "Создать задачу"}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/AddTaskForm.tsx
git commit -m "feat: AddTaskForm → FAB + modal with icon field selectors"
```

---

## Task 10: page.tsx — убрать BottomNav, обновить шапку

**Files:**
- Modify: `src/app/tasks/page.tsx`
- Delete: `src/components/BottomNav.tsx`

Изменения:
1. Убрать `import { BottomNav }` и его JSX
2. Убрать `const titleInputRef = useRef<HTMLInputElement>(null!)`
3. Убрать prop `inputRef={titleInputRef}` из `<AddTaskForm />`
4. Убрать `pb-24 md:pb-8` (отступ под BottomNav) → `pb-20` (отступ под FAB)
5. Добавить `LogOut` из lucide к кнопке выхода
6. Добавить `gap-3` к заголовку страницы

- [ ] **Step 1: Обновить page.tsx**

Полное содержимое файла:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut } from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useTasks, filterTasks } from "@/hooks/useTasks"
import { useProjects } from "@/hooks/useProjects"
import { useTags } from "@/hooks/useTags"
import { TaskList } from "@/components/tasks/TaskList"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { ProjectTabs } from "@/components/projects/ProjectTabs"
import { DateFilters } from "@/components/filters/DateFilters"
import { TagFilter } from "@/components/filters/TagFilter"
import type { DateFilter } from "@/types"

export default function TasksPage() {
  const { status } = useSession()
  const router = useRouter()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const taskHook = useTasks()
  const projectHook = useProjects()
  const tagHook = useTags()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      taskHook.fetchTasks()
      projectHook.fetchProjects()
      tagHook.fetchTags()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragStart(_event: DragStartEvent) {}

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const projectTabIds = ["all", ...projectHook.projects.map((p) => p.id)]

    if (projectTabIds.includes(over.id as string)) {
      const projectId = over.id === "all" ? null : (over.id as string)
      const task = taskHook.tasks.find((t) => t.id === taskId)
      if (!task || task.project?.id === projectId) return
      const newProject = projectId
        ? (projectHook.projects.find((p) => p.id === projectId) ?? null)
        : null
      await taskHook.assignProject(taskId, projectId, newProject)
      return
    }

    if (active.id !== over.id) {
      const oldIndex = taskHook.tasks.findIndex((t) => t.id === active.id)
      const newIndex = taskHook.tasks.findIndex((t) => t.id === over.id)
      const newTasks = arrayMove(taskHook.tasks, oldIndex, newIndex)
      await taskHook.reorderTasks(newTasks)
    }
  }

  const filtered = filterTasks(taskHook.tasks, dateFilter, activeProjectId).filter(
    (t) =>
      selectedTagIds.length === 0 ||
      selectedTagIds.some((id) => t.tags.some((tag) => tag.id === id))
  )

  if (status === "loading" || taskHook.isLoading) {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Мои задачи</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>

        <ProjectTabs
          projects={projectHook.projects}
          activeProjectId={activeProjectId}
          onSelect={setActiveProjectId}
          onCreate={projectHook.createProject}
          onDelete={async (id) => {
            await projectHook.deleteProject(id)
            taskHook.removeProjectTasks(id)
            if (activeProjectId === id) setActiveProjectId(null)
          }}
          onRename={async (id, title) => {
            const updated = await projectHook.renameProject(id, title)
            taskHook.syncProjectRename(updated)
          }}
        />

        <DateFilters value={dateFilter} onChange={setDateFilter} />

        <TagFilter
          tags={tagHook.tags}
          selectedIds={selectedTagIds}
          onChange={setSelectedTagIds}
        />

        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
          activeProjectId={activeProjectId}
          dateFilter={dateFilter}
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

        <AddTaskForm
          activeProjectId={activeProjectId}
          projects={projectHook.projects}
          tags={tagHook.tags}
          onSubmit={(input) => taskHook.createTask(input, projectHook.projects)}
          onCreateTag={tagHook.createTag}
        />
      </main>
    </DndContext>
  )
}
```

- [ ] **Step 2: Удалить BottomNav.tsx**

```bash
rm src/components/BottomNav.tsx
```

- [ ] **Step 3: Запустить тесты**

```bash
npm test
```

- [ ] **Step 4: Build-проверка TypeScript**

```bash
npm run build
```

Ожидаемый вывод: успешная сборка без ошибок типов.

- [ ] **Step 5: Запустить dev-сервер и проверить вручную**

```bash
npm run dev
```

Проверить в браузере:
- Фон страницы голубовато-серый
- Кнопка выхода показывает иконку LogOut
- BottomNav не отображается
- FAB (синий +) виден в правом нижнем углу
- Клик на FAB открывает модальное окно
- Аккордеоны проектов и тегов работают
- Сегментированный контрол фильтров выглядит как iOS-переключатель
- Клик на задачу раскрывает её (не inline-кнопки)
- В раскрытой задаче видны теги, дата, описание, подзадачи и кнопка удаления

- [ ] **Step 6: Commit**

```bash
git add src/app/tasks/page.tsx
git rm src/components/BottomNav.tsx
git commit -m "feat: remove BottomNav, wire AddTaskForm FAB, add LogOut icon"
```
