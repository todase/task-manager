# UX3 — Полировка интерфейса: 6 улучшений

**Дата:** 2026-04-16  
**Статус:** утверждён

---

## Контекст

Шестой набор UX-улучшений после завершения UX2. Все изменения — косметические или поведенческие, без изменений схемы БД и API.

---

## 1. Случайные цвета тегов при создании

**Файл:** `src/hooks/useTags.ts`

При вызове `createTag(name)` без явного цвета — выбирать случайный цвет из фиксированной палитры Tailwind 400. Цвет передаётся в тело POST `/api/tags`.

**Палитра (10 цветов, Tailwind 400):**
```
#60a5fa  blue-400
#a78bfa  violet-400
#f472b6  pink-400
#fb923c  orange-400
#2dd4bf  teal-400
#4ade80  green-400
#fb7185  rose-400
#22d3ee  cyan-400
#c084fc  purple-400
#94a3b8  slate-400
```

Выбор: `PALETTE[Math.floor(Math.random() * PALETTE.length)]`

Бэкенд (`/api/tags` POST) уже принимает `color` — изменений не требует.

---

## 2. Фильтр по дате — позиция и порядок

**Файлы:** `src/components/filters/DateFilters.tsx`, `src/app/tasks/page.tsx`

### Новый порядок табов
`["today", "week", "someday", "all"]` — было `["today", "week", "all", "someday"]`

Метки без изменений: Сегодня / Неделя / Потом / Все.

### Новая позиция
В `page.tsx` компонент `<DateFilters>` перемещается **выше** `<ProjectTabs>` — становится первым фильтром под заголовком страницы.

---

## 3. Высота и плотность списка задач

**Файлы:** `src/components/tasks/TaskItem.tsx`, `src/components/tasks/TaskList.tsx`

| Место | Было | Стало |
|-------|------|-------|
| collapsed-строка TaskItem | `py-3` | `py-4` |
| gap между задачами в TaskList | `gap-2` | `gap-1` |

Итог: задачи чуть выше (48px → 56px), список плотнее (8px → 4px между пунктами).

---

## 4. Умные метки дат

**Файл:** `src/components/tasks/TaskItem.tsx`

Добавить функцию `formatDueDate(dueDate: string): string`:

```
past date  → "просрочено"
today      → "сегодня"
tomorrow   → "завтра"
other      → toLocaleDateString("ru-RU")
```

Логика сравнения — аналогична существующей `dateBadgeClasses` (midnight-нормализация через `setHours(0,0,0,0)`).

Применяется в двух местах TaskItem:
- **Collapsed badge** (строка ~242): вместо `new Date(task.dueDate).toLocaleDateString("ru-RU")`
- **Expanded date label** (строка ~472): вместо `new Date(task.dueDate).toLocaleDateString("ru-RU")`

Функция `dateBadgeClasses` (цвета) остаётся без изменений.

---

## 5. Фиксированная высота при перетаскивании (DragOverlay)

**Файлы:** `src/app/tasks/page.tsx`, `src/components/SortableTask.tsx`, `src/components/tasks/TaskDragPreview.tsx` (новый)

### Проблема
При перетаскивании развёрнутой задачи ghost-превью занимает полную высоту развёрнутой карточки (~300px), что выглядит непропорционально.

### Решение: DragOverlay

**`page.tsx`:**
- Добавить `useState<Task | null>(null)` → `draggingTask`
- `handleDragStart`: находить task по `active.id`, сохранять в `draggingTask`
- `handleDragEnd`: очищать `draggingTask`
- Добавить `<DragOverlay>` внутрь `<DndContext>`:
  ```tsx
  <DragOverlay>
    {draggingTask && <TaskDragPreview task={draggingTask} />}
  </DragOverlay>
  ```

**`SortableTask.tsx`:**
- Когда `isDragging` — ставить `opacity: 0` (элемент держит место в списке, но невидим; overlay показывает превью)

**`TaskDragPreview.tsx` (новый компонент):**
- Простая collapsed-карточка: белый фон, border-left с цветом приоритета, чекбокс + заголовок
- Без состояния, без хуков задач — только отображение
- Те же стили shadow/scale что и при drag в SortableTask: `scale(1.03)`, `box-shadow: 0 8px 24px rgba(0,0,0,0.12)`

---

## 6. Анимация аккордеона у проектов и тегов

**Файлы:** `src/components/projects/ProjectTabs.tsx`, `src/components/filters/TagFilter.tsx`

Добавить класс `animate-expand` на контейнер контента, который появляется при `isOpen`:

- `ProjectTabs.tsx` строка ~118: `<div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-col gap-2">` → добавить `animate-expand`
- `TagFilter.tsx` строка ~51: `<div className="mt-2 bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2">` → добавить `animate-expand`

Анимация `expand-down` (opacity 0→1, translateY -4px→0, 0.18s ease-out) уже определена в `globals.css` — дополнительных изменений CSS не требуется.

---

## Затронутые файлы (итог)

| Файл | Изменение |
|------|-----------|
| `src/hooks/useTags.ts` | палитра + случайный цвет |
| `src/components/filters/DateFilters.tsx` | порядок табов |
| `src/app/tasks/page.tsx` | позиция DateFilters, DragOverlay, draggingTask |
| `src/components/tasks/TaskItem.tsx` | py-4, formatDueDate |
| `src/components/tasks/TaskList.tsx` | gap-1 |
| `src/components/SortableTask.tsx` | opacity:0 при isDragging |
| `src/components/tasks/TaskDragPreview.tsx` | новый компонент |
| `src/components/projects/ProjectTabs.tsx` | animate-expand |
| `src/components/filters/TagFilter.tsx` | animate-expand |

Итого: 8 существующих файлов + 1 новый. БД и API не затронуты.
