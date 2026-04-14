# Stage 1: PWA + Responsive Interface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the task manager installable as a PWA on mobile and fully usable with native-feeling interactions: bottom navigation, swipe gestures, and offline access.

**Architecture:** Install `@ducanh2912/next-pwa` to generate a service worker and handle caching. Add `manifest.json` with icons. Add a `BottomNav` client component visible only on mobile (`md:hidden`). Add a `SwipeableRow` component that uses touch events to slide task content left and reveal action buttons. Apply responsive Tailwind classes throughout `tasks/page.tsx`.

**Tech Stack:** `@ducanh2912/next-pwa`, Tailwind CSS v4, React touch events (`onTouchStart`/`onTouchMove`/`onTouchEnd`), Next.js 16 App Router

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `public/manifest.json` | Create | PWA metadata: name, icons, display mode, colors |
| `public/icons/icon.svg` | Create | Source SVG icon (blue rounded square with checkmark) |
| `public/icons/icon-192.png` | Create | PWA icon 192×192 (generated from SVG) |
| `public/icons/icon-512.png` | Create | PWA icon 512×512 (generated from SVG) |
| `scripts/generate-icons.mjs` | Create | Node script to generate PNG icons from SVG using sharp |
| `next.config.ts` | Modify | Wrap config with `withPWA` |
| `src/app/layout.tsx` | Modify | Add `<meta name="theme-color">` and manifest link |
| `src/components/BottomNav.tsx` | Create | Fixed bottom bar with Tasks / Add / Archive tabs, mobile only |
| `src/components/SwipeableRow.tsx` | Create | Touch-driven swipe-left to reveal hidden action buttons |
| `src/app/tasks/page.tsx` | Modify | Use `SwipeableRow`, add `BottomNav`, responsive padding + tap targets |

---

## Task 1: Install @ducanh2912/next-pwa

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `next.config.ts`

- [ ] **Step 1: Install the package**

```bash
cd C:\Claude\task-manager
npm install @ducanh2912/next-pwa
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Update `next.config.ts`**

Replace the entire file content:

```ts
import type { NextConfig } from "next"
import withPWA from "@ducanh2912/next-pwa"

const nextConfig: NextConfig = {
  /* existing config options here */
}

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig)
```

- [ ] **Step 3: Verify the build still works**

```bash
npm run build
```

Expected: build completes without errors. In production mode a `public/sw.js` and `public/workbox-*.js` would be generated; in dev they are skipped (`disable: true` in development).

- [ ] **Step 4: Commit**

```bash
git add next.config.ts package.json package-lock.json
git commit -m "feat: install and configure next-pwa"
```

---

## Task 2: Create SVG icon

**Files:**
- Create: `public/icons/icon.svg`

- [ ] **Step 1: Create the icons directory and SVG**

Create `public/icons/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#3b82f6"/>
  <polyline
    points="128,272 224,368 384,176"
    fill="none"
    stroke="white"
    stroke-width="56"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
```

- [ ] **Step 2: Verify SVG renders correctly**

Open `public/icons/icon.svg` in a browser. Expected: blue rounded square with a white checkmark.

---

## Task 3: Generate PNG icons

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

- [ ] **Step 1: Install sharp temporarily**

```bash
npm install --save-dev sharp
```

- [ ] **Step 2: Create the generation script**

Create `scripts/generate-icons.mjs`:

```js
import sharp from "sharp"
import { readFileSync } from "fs"

const svg = readFileSync("public/icons/icon.svg")

await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png")
console.log("✓ icon-192.png")

await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png")
console.log("✓ icon-512.png")
```

- [ ] **Step 3: Run the script**

```bash
node scripts/generate-icons.mjs
```

Expected output:
```
✓ icon-192.png
✓ icon-512.png
```

Both files should appear in `public/icons/`.

- [ ] **Step 4: Commit**

```bash
git add public/icons/ scripts/generate-icons.mjs
git commit -m "feat: add PWA app icons"
```

---

## Task 4: Create manifest.json

**Files:**
- Create: `public/manifest.json`

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "Мои задачи",
  "short_name": "Задачи",
  "description": "Персональный менеджер задач",
  "start_url": "/tasks",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "feat: add PWA manifest"
```

---

## Task 5: Update layout.tsx for PWA

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update `src/app/layout.tsx`**

Replace the entire file:

```tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Providers from "./providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Мои задачи",
  description: "Персональный менеджер задач",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Мои задачи",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify manifest is served**

```bash
npm run build && npm start
```

Open `http://localhost:3000/manifest.json` in a browser. Expected: JSON with `"name": "Мои задачи"`.

In Chrome DevTools → Application → Manifest — should show the app name, icons, and display mode.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: link PWA manifest and add mobile meta tags"
```

---

## Task 6: Create BottomNav component

**Files:**
- Create: `src/components/BottomNav.tsx`

The bottom nav is visible only on mobile (`md:hidden`). It has three buttons:
- **Задачи** — scrolls to top of task list
- **Добавить** — focuses the task title input
- **Архив** — navigates to `/archive` (not yet built; shows as disabled for now)

- [ ] **Step 1: Create `src/components/BottomNav.tsx`**

```tsx
"use client"

import { useRouter, usePathname } from "next/navigation"

type Props = {
  onAddClick: () => void
}

export function BottomNav({ onAddClick }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200">
      <div className="flex items-stretch h-16">
        {/* Projects — scrolls to project tabs at top of page */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 min-h-[44px]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          Проекты
        </button>

        {/* Add — focuses the task title input */}
        <button
          onClick={onAddClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 min-h-[44px]"
        >
          <span className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-light leading-none">
            +
          </span>
        </button>

        {/* Tasks — scrolls to task list */}
        <button
          onClick={() => document.getElementById("task-list")?.scrollIntoView({ behavior: "smooth" })}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs min-h-[44px] ${
            pathname === "/tasks" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Задачи
        </button>
      </div>
      {/* Safe area inset for iOS home indicator */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "feat: add BottomNav component for mobile"
```

---

## Task 7: Create SwipeableRow component

**Files:**
- Create: `src/components/SwipeableRow.tsx`

Swipe left → slides content 88px left → reveals two action buttons (Subtasks, Delete) on the right. Tap anywhere else → snaps closed. Works only on touch devices.

- [ ] **Step 1: Create `src/components/SwipeableRow.tsx`**

```tsx
"use client"

import { useRef, useState, ReactNode } from "react"

type Props = {
  children: ReactNode
  onSubtasks: () => void
  onDelete: () => void
  subtasksLabel?: string
}

const SWIPE_THRESHOLD = 40   // px moved before we track
const SNAP_OPEN_AT = 60      // px — if dragged past this, snap open
const OPEN_WIDTH = 88        // px — total revealed width

export function SwipeableRow({ children, onSubtasks, onDelete, subtasksLabel = "Подзадачи" }: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const startXRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    isDraggingRef.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return
    const delta = e.touches[0].clientX - startXRef.current

    // Only track leftward swipe
    if (!isDraggingRef.current && Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) isDraggingRef.current = true
      else return
    }

    if (!isDraggingRef.current) return

    const base = isOpen ? -OPEN_WIDTH : 0
    const newOffset = Math.min(0, Math.max(-OPEN_WIDTH, base + delta))
    setOffsetX(newOffset)
  }

  function handleTouchEnd() {
    if (!isDraggingRef.current) return
    const shouldOpen = isOpen
      ? offsetX > -(OPEN_WIDTH - SNAP_OPEN_AT)
      : offsetX < -SNAP_OPEN_AT

    if (shouldOpen || (!isOpen && offsetX < -SNAP_OPEN_AT)) {
      setOffsetX(-OPEN_WIDTH)
      setIsOpen(true)
    } else {
      setOffsetX(0)
      setIsOpen(false)
    }
    startXRef.current = null
    isDraggingRef.current = false
  }

  function close() {
    setOffsetX(0)
    setIsOpen(false)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons (revealed on swipe) — 48px height per spec */}
      <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: OPEN_WIDTH }}>
        <button
          onClick={() => { onSubtasks(); close() }}
          className="flex-1 bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center min-h-[48px]"
        >
          {subtasksLabel}
        </button>
        <button
          onClick={() => { onDelete(); close() }}
          className="flex-1 bg-red-100 text-red-600 text-xs font-medium flex items-center justify-center min-h-[48px]"
        >
          Удалить
        </button>
      </div>

      {/* Main content — slides left */}
      <div
        className="relative bg-white"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDraggingRef.current ? "none" : "transform 200ms ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isOpen ? close : undefined}
      >
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SwipeableRow.tsx
git commit -m "feat: add SwipeableRow component with touch swipe-to-reveal"
```

---

## Task 8: Integrate BottomNav and SwipeableRow into tasks/page.tsx

**Files:**
- Modify: `src/app/tasks/page.tsx`

This task applies all responsive changes to the main page in one go:
1. Import `BottomNav` and `SwipeableRow`
2. Add `titleInputRef` to focus input from BottomNav
3. Add bottom padding so content isn't hidden by BottomNav
4. Wrap each task in `SwipeableRow`
5. Hide desktop-only action buttons on mobile (they're now in the swipe menu)
6. Responsive padding on the main container

- [ ] **Step 1: Add imports and `titleInputRef` at the top of the component**

At the top of `tasks/page.tsx`, add imports:

```tsx
import { BottomNav } from "@/components/BottomNav"
import { SwipeableRow } from "@/components/SwipeableRow"
```

After the existing `useState` declarations, add:

```tsx
const titleInputRef = useRef<HTMLInputElement>(null)
```

Also add `useRef` to the React import if it isn't there:

```tsx
import { useState, useEffect, useRef } from "react"
```

- [ ] **Step 2: Fix main container padding**

Find this line:

```tsx
<main className="max-w-2xl mx-auto p-8">
```

Replace with:

```tsx
<main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-24 md:pb-8">
```

`pb-24` leaves room for the BottomNav on mobile.

- [ ] **Step 3: Attach ref to the task title input**

Find the task title input in the add-task form:

```tsx
<input
  type="text"
  placeholder={activeProjectId ? `Задача в «${projects.find(p => p.id === activeProjectId)?.title}»...` : "Новая задача..."}
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  className="border p-2 rounded flex-1"
/>
```

Add the ref:

```tsx
<input
  ref={titleInputRef}
  type="text"
  placeholder={activeProjectId ? `Задача в «${projects.find(p => p.id === activeProjectId)?.title}»...` : "Новая задача..."}
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  className="border p-2 rounded flex-1"
/>
```

- [ ] **Step 4: Wrap each task row in SwipeableRow**

Find this section in the task list:

```tsx
{filteredTasks.map((task) => (
  <SortableTask key={task.id} id={task.id}>
  <div className="border rounded p-3">
```

Replace the outer structure so `SwipeableRow` wraps the `<div>` inside `SortableTask`:

```tsx
{filteredTasks.map((task) => (
  <SortableTask key={task.id} id={task.id}>
  <SwipeableRow
    onSubtasks={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
    onDelete={() => deleteTask(task.id)}
    subtasksLabel={openTaskId === task.id ? "Свернуть" : "Подзадачи"}
  >
  <div className="border rounded p-3">
```

And close both `SwipeableRow` and `SortableTask` at the end:

```tsx
  </div>
  </SwipeableRow>
  </SortableTask>
```

- [ ] **Step 5: Fix tap targets on desktop action buttons**

The "Подзадачи" and "Удалить" buttons in the task row are still visible on desktop. Ensure they have adequate touch targets and are hidden on mobile (since swipe handles them there):

Find the two action buttons in the task row:

```tsx
<button
  onClick={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
  className="text-sm text-blue-400 hover:text-blue-600"
>
  {openTaskId === task.id ? "Свернуть" : "Подзадачи"}
</button>
<button
  onClick={() => deleteTask(task.id)}
  className="text-sm text-red-400 hover:text-red-600"
>
  Удалить
</button>
```

Replace with (hidden on mobile, visible on desktop):

```tsx
<button
  onClick={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
  className="hidden md:block text-sm text-blue-400 hover:text-blue-600 min-h-[44px] px-2"
>
  {openTaskId === task.id ? "Свернуть" : "Подзадачи"}
</button>
<button
  onClick={() => deleteTask(task.id)}
  className="hidden md:block text-sm text-red-400 hover:text-red-600 min-h-[44px] px-2"
>
  Удалить
</button>
```

- [ ] **Step 6: Fix tap targets on project tab buttons**

Find the project filter buttons (the `<button>` inside `DroppableProject`). Add `min-h-[44px]` to each:

```tsx
<button
  onClick={() => setActiveProjectId(null)}
  className={`text-sm px-3 py-1 rounded-full border min-h-[44px] ${
    activeProjectId === null
      ? "bg-blue-500 text-white border-blue-500"
      : "text-gray-500 hover:border-gray-400"
  }`}
>
  Все задачи
</button>
```

And for project buttons:

```tsx
<button
  onClick={() => setActiveProjectId(project.id)}
  onDoubleClick={() => {
    setEditingProjectId(project.id)
    setEditingProjectTitle(project.title)
  }}
  className={`text-sm px-3 py-1 rounded-full border min-h-[44px] ${
    activeProjectId === project.id
      ? "bg-blue-500 text-white border-blue-500"
      : "text-gray-500 hover:border-gray-400"
  }`}
>
  {project.title}
</button>
```

- [ ] **Step 7: Add BottomNav at the bottom of the JSX**

Just before the closing `</main>` and `</DndContext>`, add:

```tsx
      <BottomNav
        onAddClick={() => {
          titleInputRef.current?.focus()
          titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }}
      />
    </main>
    </DndContext>
```

- [ ] **Step 8: Verify the build compiles without TypeScript errors**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/tasks/page.tsx
git commit -m "feat: integrate BottomNav and SwipeableRow, apply responsive layout"
```

---

## Task 9: Responsive form and filter layout

**Files:**
- Modify: `src/app/tasks/page.tsx`

On small screens the date filter row and project tabs can overflow. Fix wrapping and spacing.

- [ ] **Step 1: Fix date filter buttons wrapping on mobile**

Find the date filter row:

```tsx
<div className="flex gap-2 mb-6">
```

Replace with:

```tsx
<div className="flex flex-wrap gap-2 mb-6">
```

- [ ] **Step 2: Fix add-task form on mobile**

The form currently has two rows. On mobile the bottom row (date + recurrence select) should stack vertically. Find:

```tsx
<div className="flex gap-2">
  <input
    type="date"
    ...
  />
  <select
    ...
  >
```

Replace with:

```tsx
<div className="flex flex-col sm:flex-row gap-2">
  <input
    type="date"
    ...
  />
  <select
    ...
  >
```

- [ ] **Step 3: Commit**

```bash
git add src/app/tasks/page.tsx
git commit -m "fix: responsive wrapping for filters and form on mobile"
```

---

## Task 10: Sticky add-task input above keyboard on mobile

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/tasks/page.tsx`

On mobile, when the user taps the task input, the keyboard opens. Without adjustment the input can be hidden behind it. Two changes fix this:
1. `interactive-widget=resizes-content` in the viewport meta tag — tells the browser to shrink the visual viewport when the keyboard opens, so sticky/fixed elements reposition correctly.
2. The add-task form gets `sticky bottom-[80px]` on mobile so it visually "floats" just above the BottomNav when focused.

- [ ] **Step 1: Update viewport meta tag in `src/app/layout.tsx`**

In the `<head>` section, add the viewport meta tag with `interactive-widget`:

```tsx
<head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
  />
  <meta name="theme-color" content="#3b82f6" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
</head>
```

Note: Next.js may already inject a default `<meta name="viewport">`. If the build warns about a duplicate viewport tag, remove the one injected by `metadata` by explicitly setting it to `null`:

```tsx
export const metadata: Metadata = {
  title: "Мои задачи",
  description: "Персональный менеджер задач",
  manifest: "/manifest.json",
  viewport: null, // prevent Next.js default viewport tag
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Мои задачи",
  },
}
```

- [ ] **Step 2: Make the add-task form sticky on mobile**

In `src/app/tasks/page.tsx`, find the add-task form opening tag:

```tsx
<form onSubmit={addTask} className="flex flex-col gap-2 mb-6">
```

Replace with:

```tsx
<form
  onSubmit={addTask}
  className="flex flex-col gap-2 mb-6 md:static md:shadow-none md:bg-transparent sticky bottom-[80px] z-30 bg-white rounded-lg focus-within:shadow-lg focus-within:px-3 focus-within:py-2 transition-all"
>
```

This means: on mobile, the form sticks to `80px` from the bottom (just above BottomNav) and gains a shadow + padding when any child element is focused — giving a visual cue that it's in "active entry" mode.

- [ ] **Step 3: Add `id="task-list"` to the task list `<ul>` for BottomNav scrolling**

Find:

```tsx
<ul className="flex flex-col gap-3">
```

Replace with:

```tsx
<ul id="task-list" className="flex flex-col gap-3">
```

- [ ] **Step 4: Verify on mobile simulator**

In Chrome DevTools with "iPhone 14 Pro" device:
1. Tap the task title input
2. Keyboard opens
3. Expected: the input remains visible above the keyboard, not hidden behind it
4. Expected: the form has a subtle shadow/padding to indicate active state

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/tasks/page.tsx
git commit -m "feat: sticky add-task form above keyboard on mobile"
```

---

## Task 11: Manual PWA Verification

No automated tests exist yet (added in Stage 6). Verify manually using Chrome DevTools.

- [ ] **Step 1: Build and start production server**

```bash
npm run build && npm start
```

- [ ] **Step 2: Verify Service Worker**

Open `http://localhost:3000` in Chrome.
DevTools → Application → Service Workers.
Expected: a service worker registered for `localhost` with status "activated and running".

- [ ] **Step 3: Verify Manifest**

DevTools → Application → Manifest.
Expected:
- Name: "Мои задачи"
- Start URL: `/tasks`
- Display: `standalone`
- Icons: two entries (192×192, 512×512)
- No errors listed

- [ ] **Step 4: Verify installability**

In Chrome address bar, look for the install icon (monitor with down arrow) or go to:
DevTools → Application → Manifest → scroll to bottom → "Add to homescreen".
Expected: install prompt appears without errors.

- [ ] **Step 5: Verify offline**

DevTools → Application → Service Workers → check "Offline".
Reload the page.
Expected: `/tasks` page loads (from cache). Tasks from last session are visible. Adding tasks shows an error (expected — network is offline).
Uncheck "Offline" to restore.

- [ ] **Step 6: Verify mobile layout on simulated device**

DevTools → Toggle device toolbar → select "iPhone 14 Pro" (390×844).
Expected:
- Bottom navigation bar visible at the bottom
- "Подзадачи" and "Удалить" buttons not visible in task rows
- Swipe left on a task → action buttons appear
- Tap "+" in bottom nav → task title input focused
- Project tabs wrap without horizontal overflow
- All buttons at least 44px tall

- [ ] **Step 7: Final commit with any minor fixes found during verification**

```bash
git add -A
git commit -m "fix: mobile layout adjustments from manual verification"
```

---

## Summary

After this plan is complete, the app will:
- Be installable as a PWA on Android Chrome and iOS Safari (via "Add to Home Screen")
- Cache static assets and task pages for offline viewing
- Show a native-looking standalone window (no browser chrome) when launched from home screen
- Have a bottom navigation bar on mobile (≤768px) with Tasks / Add / Archive
- Swipe-left on any task row to reveal Subtasks and Delete actions
- Have minimum 44×44px tap targets on all interactive elements
- Responsive form layout that doesn't overflow on small screens
