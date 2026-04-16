# UX: задачи и проекты — 5 улучшений

**Дата:** 2026-04-16  
**Затронутые файлы:** `TaskItem.tsx`, `TaskList.tsx`, `AddTaskForm.tsx`, `ProjectTabs.tsx`, `useTasks.ts`, `src/app/layout.tsx`

---

## 1. Полное название в развёрнутой задаче

**Проблема:** заголовок задачи всегда рендерится с `truncate` — даже когда карточка раскрыта.

**Решение:** `<span>` заголовка получает `truncate` только при `!isOpen`. При `isOpen` — `break-words` без ограничения по высоте.

```tsx
// TaskItem.tsx — span с заголовком
className={`text-sm font-medium flex-1 min-w-0 ${
  isOpen ? "break-words" : "truncate"
} ${task.done ? "line-through text-gray-400" : "text-gray-900"}`}
```

Строка заголовка переходит в `items-start` когда `isOpen`, чтобы чекбокс прижался к верху при переносе.

---

## 2. Проект и переименование в развёрнутой карточке

### 2a. Чип проекта с инлайн-дропдауном

В развёрнутой части (`isOpen`) первой строкой появляется чип проекта.

- Назначен проект → синий чип с иконкой и названием + стрелка `▾`
- Проекта нет → серый чип «Без проекта ▾»
- Нажатие → `showProjectDropdown` переключается, рендерится список всех проектов + пункт «Без проекта»
- Выбор вызывает `onUpdateProject(task.id, projectId | null)` и закрывает дропдаун

**Новые пропсы `TaskItem`:**
```ts
projects: Project[]
onAssignProject: (taskId: string, projectId: string | null, project: Project | null) => Promise<void>
```

`onAssignProject` напрямую передаётся из существующего `useTasks.assignProject` — новый хук не нужен.

### 2b. Кнопка переименовать

Рядом с чипом проекта — кнопка «✎ переименовать».

- Нажатие: `editing = true`, `editTitle = task.title`
- Заголовок в строке превращается в `<input>` (существующая логика `editing`)
- Сохранение по blur / Enter, отмена по Escape
- **`onDoubleClick` на заголовке убирается** — переименование только через эту кнопку

---

## 3. Проект при создании задачи и поведение после создания проекта

### 3a. Чип «Проект» в форме AddTaskForm

Условие показа: `activeProjectId === null` (вид «Все задачи»).

- Добавляется чип «📁 Проект ▾» в ряд кнопок (Дата / Повтор / Метки)
- Нажатие → инлайн-дропдаун со списком проектов (аналогично п. 2a)
- Выбранный проект → чип синеет, показывает название
- При сабмите выбранный `projectId` передаётся в `CreateTaskInput`

В виде конкретного проекта (`activeProjectId !== null`) чип не рендерится — проект уже задан.

### 3b. Не переключаться после создания проекта

В `ProjectTabs.handleCreate` убрать строку `onSelect(project.id)`. Проект создаётся, список обновляется, текущий вид остаётся.

---

## 4. iOS-зум при фокусе на input

**Причина:** iOS Safari зумирует страницу, если `font-size` инпута < 16px. Зум остаётся после потери фокуса.

**Решение — два шага:**

1. Добавить `style={{ fontSize: '16px' }}` (или `text-base`) на все `<input>` и `<textarea>` в:
   - `TaskItem.tsx` — поле переименования задачи
   - `AddTaskForm.tsx` — поле названия, поле тегов
   - `ProjectTabs.tsx` — поля названия нового/редактируемого проекта

2. В `src/app/layout.tsx` обновить viewport meta, добавив `viewport-fit=cover` но **не** `maximum-scale=1` (сохраняем пинч-зум для доступности):
   ```tsx
   export const viewport = {
     width: "device-width",
     initialScale: 1,
     viewportFit: "cover",
   }
   ```
   Шаг 1 (font-size 16px) должен полностью устранить зум — шаг 2 только страховка.

---

## 5. Карандаш на активном чипе проекта

**Проблема:** редактирование проекта скрыто за `onDoubleClick` — на тачскрине недоступно.

**Решение:** разделённая кнопка на активном чипе.

```
[ 📁 Личное ] [ ✎ ]
```

- Левая часть — выбор проекта (существующий `onClick`)
- Правая часть — кнопка-карандаш, `onClick → startEditing(project)`
- Появляется **только** на активном (синем) чипе
- `onDoubleClick` убирается

Форма редактирования (input + IconPicker) остаётся прежней, только триггер меняется.

---

## Затронутые компоненты — итог

| Файл | Изменения |
|------|-----------|
| `TaskItem.tsx` | wrap заголовка при раскрытии; убрать `onDoubleClick`; добавить чип проекта + дропдаун; добавить кнопку «переименовать»; `font-size: 16px` на input |
| `TaskList.tsx` | прокинуть `projects` и `onUpdateProject` в `TaskItem` |
| `AddTaskForm.tsx` | чип «Проект» при `activeProjectId === null`; `font-size: 16px` на inputs |
| `ProjectTabs.tsx` | убрать auto-switch после создания; разделённая кнопка на активном чипе; убрать `onDoubleClick`; `font-size: 16px` на inputs |
| `useTasks.ts` | без изменений — `assignProject` уже существует |
| `src/app/layout.tsx` | viewport meta |
