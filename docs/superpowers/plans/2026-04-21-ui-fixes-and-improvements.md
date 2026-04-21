# UI Fixes and Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four independent UI improvements: auto-date in Today view, project reset button, desktop date picker fix, and doubled project icon set.

**Architecture:** All changes are isolated to existing components — no new files, no API changes, no schema changes. Tasks are fully independent and can be executed in any order.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React

**Spec:** `docs/superpowers/specs/2026-04-21-ui-fixes-and-improvements-design.md`

---

### Task 1: Auto-date when creating tasks in "Today" view

**Goal:** When the "Today" date filter is active, new tasks are pre-populated with today's date.

**Files:**
- Modify: `src/app/tasks/page.tsx` (line ~230 — AddTaskForm usage)
- Modify: `src/components/tasks/AddTaskForm.tsx` (lines 16–22 props interface, line 33 state init, add useEffect)

**Acceptance Criteria:**
- [ ] Creating a task while "Today" filter is active saves task with today's date
- [ ] Switching to another filter — new task form has no pre-filled date
- [ ] Switching back to "Today" — date pre-fills again
- [ ] User can manually clear the pre-filled date before submitting

**Verify:** Manual test — switch to "Today" filter, open add task form, verify date field shows today's date. Switch to "All" filter, verify date field is empty.

**Steps:**

- [ ] **Step 1: Add `defaultDueDate` prop to `AddTaskForm`**

In `src/components/tasks/AddTaskForm.tsx`, update the props interface (lines 16–22):

```tsx
interface AddTaskFormProps {
  activeProjectId: string | null
  projects: Project[]
  tags: Tag[]
  onSubmit: (input: CreateTaskInput) => Promise<void>
  onCreateTag: (name: string) => Promise<Tag>
  defaultDueDate?: string
}

export function AddTaskForm({
  activeProjectId,
  projects,
  tags,
  onSubmit,
  onCreateTag,
  defaultDueDate,
}: AddTaskFormProps) {
```

- [ ] **Step 2: Apply `defaultDueDate` to `dueDate` state**

Change the `dueDate` state initialization (line 33) and add a `useEffect` that updates it when `defaultDueDate` changes. Add after the existing `useEffect` for `isModalOpen` (around line 50):

```tsx
const [dueDate, setDueDate] = useState(defaultDueDate ?? "")

// ... existing useEffects ...

useEffect(() => {
  setDueDate(defaultDueDate ?? "")
}, [defaultDueDate])
```

Note: the existing `closeModal` function resets `dueDate` to `""`. After this change it should reset to `defaultDueDate ?? ""` instead:

```tsx
function closeModal() {
  setIsModalOpen(false)
  setTitle("")
  setDueDate(defaultDueDate ?? "")  // was: setDueDate("")
  setRecurrence("")
  setSelectedTagIds([])
  setTagInput("")
  setShowTagMenu(false)
  setActiveField(null)
  setError(null)
  setSelectedProjectId(null)
  setShowProjectDropdown(false)
}
```

- [ ] **Step 3: Pass `defaultDueDate` from page**

In `src/app/tasks/page.tsx`, compute `defaultDueDate` and pass it to `AddTaskForm` (around line 229–237):

```tsx
const defaultDueDate = dateFilter === "today"
  ? new Date().toISOString().split("T")[0]
  : undefined

// ...

<AddTaskForm
  activeProjectId={activeProjectId}
  projects={projectHook.projects}
  tags={tagHook.tags}
  onSubmit={(input) => taskHook.createTask(input, projectHook.projects)}
  onCreateTag={tagHook.createTag}
  defaultDueDate={defaultDueDate}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/tasks/page.tsx src/components/tasks/AddTaskForm.tsx
git commit -m "feat: auto-fill today's date when creating task in Today view"
```

---

### Task 2: Project reset button in Projects tab header

**Goal:** Add an `×` button in the accordion header that clears the active project filter without opening the accordion.

**Files:**
- Modify: `src/components/projects/ProjectTabs.tsx` (lines 47–60 — accordion header span area)

**Acceptance Criteria:**
- [ ] `×` button appears in the header only when a project is selected (`activeProjectId !== null`)
- [ ] Clicking `×` resets the project filter (calls `onSelect(null)`) without toggling the accordion
- [ ] After reset, the header shows just "Проекты" with no project name
- [ ] The button does not interfere with clicking the header to open/close the accordion

**Verify:** Select a project → `×` button appears in header. Click `×` → project deselected, header shows "Проекты" only, accordion state unchanged.

**Steps:**

- [ ] **Step 1: Add reset button to the accordion header**

In `src/components/projects/ProjectTabs.tsx`, the accordion header button contains a `<span>` with the project name (lines ~47–55). Add the `×` button between the count badge and the chevron. The full updated header button content:

```tsx
<button
  onClick={onToggle}
  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
>
  {activeProject ? (
    <ProjectIcon icon={activeProject.icon} className="w-4 h-4 text-blue-500 flex-shrink-0" />
  ) : (
    <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
  )}
  <span className="text-sm font-medium text-gray-700 flex-1">
    Проекты
    {activeProjectId !== null && activeProject && (
      <span className="ml-1 text-blue-500">· {activeProject.title}</span>
    )}
  </span>
  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
    {projects.length}
  </span>
  {activeProjectId !== null && (
    <span
      role="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect(null)
      }}
      className="text-gray-400 hover:text-gray-600 text-base leading-none px-0.5"
      aria-label="Сбросить проект"
    >
      ×
    </span>
  )}
  {isOpen ? (
    <ChevronUp className="w-4 h-4 text-gray-400" />
  ) : (
    <ChevronDown className="w-4 h-4 text-gray-400" />
  )}
</button>
```

Note: Using `<span role="button">` instead of `<button>` inside a `<button>` avoids invalid HTML nesting. The `e.stopPropagation()` prevents the accordion toggle from firing.

- [ ] **Step 2: Commit**

```bash
git add src/components/projects/ProjectTabs.tsx
git commit -m "feat: add reset button to project tabs header"
```

---

### Task 3: Fix "Add date" button not opening date picker in desktop browsers

**Goal:** Replace the `id`/`htmlFor` label linkage with a `useRef` + `.showPicker()` call so the date picker opens reliably on desktop browsers.

**Files:**
- Modify: `src/components/tasks/TaskItem.tsx` (lines 119, 124–133, 323–334)

**Acceptance Criteria:**
- [ ] Clicking "Добавить дату" opens the native date picker in Chrome, Firefox, and Safari desktop
- [ ] Clicking an existing formatted date also opens the picker
- [ ] Mobile behavior unchanged
- [ ] Clearing the date (× button) still works

**Verify:** Open a task, click "Добавить дату" in expanded view — native date picker opens in desktop browser.

**Steps:**

- [ ] **Step 1: Add `dateInputRef` and remove `id` from the input**

In `src/components/tasks/TaskItem.tsx`, `useRef` is already imported (line 3 area). Add the ref constant near `dateInputId` (line 119):

```tsx
const dateInputId = `date-${task.id}`   // can keep for now or remove — we won't use it
const dateInputRef = useRef<HTMLInputElement>(null)
```

Update the hidden input (lines 124–134) — add `ref`, remove `id`:

```tsx
<input
  ref={dateInputRef}
  type="date"
  value={
    task.dueDate
      ? new Date(task.dueDate).toISOString().split("T")[0]
      : ""
  }
  onChange={(e) => onUpdateDueDate(task.id, e.target.value)}
  className="sr-only"
/>
```

- [ ] **Step 2: Update the label to use `showPicker()` instead of `htmlFor`**

In `src/components/tasks/TaskItem.tsx`, update the label (lines 323–334) — remove `htmlFor`, replace `onClick` with explicit `showPicker()` call:

```tsx
<label
  className={`flex items-center gap-1 text-xs cursor-pointer ${
    task.dueDate
      ? `${dateBadgeClasses(task)} px-2 py-0.5 rounded-full`
      : "text-gray-400 hover:text-gray-600"
  }`}
  onClick={(e) => {
    e.stopPropagation()
    dateInputRef.current?.showPicker()
  }}
>
  <CalendarDays className="w-3 h-3" />
  {task.dueDate ? formatDueDate(task.dueDate) : "Добавить дату"}
</label>
```

- [ ] **Step 3: Clean up unused `dateInputId` if no longer used**

Search for other uses of `dateInputId` in the file:

```bash
grep -n "dateInputId" src/components/tasks/TaskItem.tsx
```

If the only remaining use was the removed `id` and `htmlFor`, remove the `const dateInputId` line entirely.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/TaskItem.tsx
git commit -m "fix: use showPicker() for date input to fix desktop browser date picker"
```

---

### Task 4: Double the number of project icons

**Goal:** Increase the icon selection from 36 to ~72 by adding new icons from Lucide React.

**Files:**
- Modify: `src/components/projects/ProjectIconPicker.tsx` (lines 1–48)

**Acceptance Criteria:**
- [ ] Icon picker shows ~72 icons (was ~36)
- [ ] All new icons render correctly
- [ ] Existing projects with old icon keys are unaffected
- [ ] Icon picker grid layout looks clean (flex-wrap)

**Verify:** Open project edit mode — icon picker shows roughly double the previous number of icons, all rendering correctly.

**Steps:**

- [ ] **Step 1: Update imports in `ProjectIconPicker.tsx`**

Replace lines 1–8 with the expanded import list:

```tsx
import {
  Folder, Briefcase, Book, Home, Star, Heart, Zap, Target,
  Coffee, Music, Camera, Code, Globe, ShoppingCart, Clipboard,
  Flag, Rocket, Sun, GraduationCap, Dumbbell, Car, Plane,
  TreePine, FlaskConical, Gamepad2, Palette, Wrench, Utensils,
  Bike, Tent, Microscope, Cpu, Package, MapPin, Newspaper, Coins,
  // New icons
  Building2, Shield, Users, Award, Bell, Cloud, Crown, Flame,
  Gift, Headphones, Key, Layers, Leaf, Link, Lock, Mail,
  MessageCircle, Moon, Pen, Phone, Search, Send, Settings,
  Tag, ThumbsUp, Tv, Wifi, Watch, Archive, Activity,
  Battery, Bookmark, Bus, Calculator, Compass, Diamond,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
```

- [ ] **Step 2: Update `PROJECT_ICONS` map**

Replace lines 11–48 with the expanded map:

```tsx
export const PROJECT_ICONS: Record<string, LucideIcon> = {
  // Original icons
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
  // New icons
  building2: Building2,
  shield: Shield,
  users: Users,
  award: Award,
  bell: Bell,
  cloud: Cloud,
  crown: Crown,
  flame: Flame,
  gift: Gift,
  headphones: Headphones,
  key: Key,
  layers: Layers,
  leaf: Leaf,
  link: Link,
  lock: Lock,
  mail: Mail,
  "message-circle": MessageCircle,
  moon: Moon,
  pen: Pen,
  phone: Phone,
  search: Search,
  send: Send,
  settings: Settings,
  tag: Tag,
  "thumbs-up": ThumbsUp,
  tv: Tv,
  wifi: Wifi,
  watch: Watch,
  archive: Archive,
  activity: Activity,
  battery: Battery,
  bookmark: Bookmark,
  bus: Bus,
  calculator: Calculator,
  compass: Compass,
  diamond: Diamond,
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/ProjectIconPicker.tsx
git commit -m "feat: double project icon set to 72 icons"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1 — auto-date in Today view
- ✅ Task 2 — reset project button in header
- ✅ Task 3 — desktop date picker fix
- ✅ Task 4 — doubled icons

**Placeholder scan:** No TBDs, no "handle edge cases", all steps have actual code.

**Type consistency:**
- `defaultDueDate?: string` — used consistently in interface, destructuring, and useEffect
- `dateInputRef` — typed `useRef<HTMLInputElement>(null)`, `.showPicker()` is on HTMLInputElement
- New icon keys in `PROJECT_ICONS` use same string-key pattern as existing ones

**No blocking dependencies** — all 4 tasks are independent and can be executed in any order.
