# UI Fixes and Improvements — Design Spec
Date: 2026-04-21

## Overview

Four focused UI improvements:
1. Auto-assign today's date when creating a task in the "Today" filter view
2. Add a reset button in the Projects tab header to clear project selection
3. Fix the "Add date" button not opening the date picker in desktop browsers
4. Double the number of available project icons

---

## 1. Auto-date for New Tasks in "Today" View

**Goal:** When the user is viewing the "Today" filter, new tasks automatically get today's date pre-filled.

**Files:**
- `src/app/tasks/page.tsx` — compute and pass `defaultDueDate`
- `src/components/tasks/AddTaskForm.tsx` — accept and apply `defaultDueDate` prop

**Design:**

`tasks/page.tsx` computes:
```ts
const defaultDueDate = dateFilter === "today"
  ? new Date().toISOString().split("T")[0]
  : undefined
```

Passes it as `<AddTaskForm defaultDueDate={defaultDueDate} ... />`.

`AddTaskForm` adds prop `defaultDueDate?: string` and initializes `dueDate` state from it. A `useEffect` watches `defaultDueDate` and updates the `dueDate` state when the filter changes (so switching to "Today" pre-fills the field, switching away clears it).

The user can still manually change or remove the date before submitting.

**Acceptance criteria:**
- Creating a task while "Today" filter is active → task saved with today's date
- Switching from "Today" to another filter → new task form resets to no date
- Switching back to "Today" → date pre-fills again
- User can manually clear the pre-filled date before saving

---

## 2. Reset Project Button in Projects Tab Header

**Goal:** Allow the user to clear the active project filter without opening the accordion.

**File:** `src/components/projects/ProjectTabs.tsx`

**Design:**

In the accordion header (the always-visible clickable row), after the `· ProjectName` text that shows when a project is selected, add a small `×` button:

```tsx
{activeProjectId && (
  <button
    onClick={(e) => { e.stopPropagation(); onSelect(null) }}
    className="text-gray-400 hover:text-gray-600 text-sm leading-none ml-1"
    aria-label="Сбросить проект"
  >
    ×
  </button>
)}
```

`e.stopPropagation()` prevents the click from toggling the accordion.

**Acceptance criteria:**
- `×` button is visible in the header only when a project is selected
- Clicking it resets the project filter to "all tasks" without opening/closing accordion
- Header returns to showing just "Проекты" (no project name) after reset

---

## 3. Fix "Add Date" Button in Desktop Browsers

**Goal:** The "Добавить дату" label in task expanded view should open the native date picker on desktop browsers.

**File:** `src/components/tasks/TaskItem.tsx`

**Root cause:** The hidden `<input type="date">` uses `sr-only` (clipped to 1px). Some desktop browsers refuse to open the native date picker on a clipped element via `htmlFor` label click. Mobile browsers use a native OS picker that opens regardless.

**Fix:** Replace the `id`/`htmlFor` linkage with a `useRef` and explicit `.showPicker()` call.

```tsx
const dateInputRef = useRef<HTMLInputElement>(null)

// Input: remove id, add ref
<input
  ref={dateInputRef}
  type="date"
  className="sr-only"
  value={...}
  onChange={...}
/>

// Label: remove htmlFor, add onClick with showPicker
<label
  onClick={(e) => {
    e.stopPropagation()
    dateInputRef.current?.showPicker()
  }}
  className={...}
>
```

`showPicker()` is the W3C-standard method for programmatically opening a date input picker. Supported in Chrome 99+, Firefox 101+, Safari 16+.

**Acceptance criteria:**
- Clicking "Добавить дату" opens the native date picker in Chrome/Firefox/Safari desktop
- Clicking an existing date also opens the picker (same label)
- Mobile behavior unchanged (still opens native OS date picker)
- Clearing the date (×) still works

---

## 4. Double the Number of Project Icons

**Goal:** Increase the icon selection from ~32 to ~64 icons.

**File:** `src/components/projects/ProjectIconPicker.tsx`

**Design:** Add 32+ new icons from Lucide React (already in project dependencies). New icons to add:

```ts
building2, shield, users, award, bell, cloud, crown, flame,
gift, headphones, key, layers, leaf, link, lock, mail,
"message-circle", moon, pen, phone, search, send, settings,
tag, "thumbs-up", tv, wifi, watch, archive, activity,
battery, bookmark, bus, calculator
```

All are valid Lucide React icon names available in the current version.

The `PROJECT_ICONS` object in `ProjectIconPicker.tsx` gets these added. No schema or API changes needed — icons are stored as strings and the existing fallback (`"folder"`) handles unknown names.

**Acceptance criteria:**
- Icon picker shows ~64 icons
- All new icons render correctly
- Existing projects with old icons are unaffected
- Icon picker grid layout still looks clean (flex-wrap handles extra icons)

---

## Non-goals

- No changes to how tasks are filtered or sorted
- No changes to the database schema
- No new dependencies
- No changes to mobile-specific behavior (except fix #3 which improves desktop without affecting mobile)
