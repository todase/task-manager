# Offline PWA iOS Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix iOS PWA "Safari cannot open page" error by switching to StaleWhileRevalidate caching and adding a guaranteed offline fallback page.

**Architecture:** Two changes: (1) create a static `/offline` page that next-pwa precaches during SW installation; (2) update `next.config.ts` to use `StaleWhileRevalidate` for pages and point `fallbacks.document` at `/offline`. The existing TanStack Query + IndexedDB data layer is untouched — once the app shell loads, cached tasks appear automatically.

**Tech Stack:** Next.js App Router, @ducanh2912/next-pwa, Workbox, Vitest + @testing-library/react

---

### Task 1: Create `/offline` page

**Goal:** Static fallback page that next-pwa precaches and serves when navigation fails offline.

**Files:**
- Create: `src/app/offline/page.tsx`
- Create: `src/app/offline/page.test.tsx`

**Acceptance Criteria:**
- [ ] Page renders "Нет подключения" heading
- [ ] Page renders explanatory text about opening online first
- [ ] "Попробовать снова" button calls `window.location.reload()`
- [ ] No imports from `@/auth`, `next-auth`, Prisma, or any API — purely static
- [ ] Test file passes with `npx vitest run src/app/offline/page.test.tsx`

**Verify:** `npx vitest run src/app/offline/page.test.tsx` → all tests pass

**Steps:**

- [ ] **Step 1: Write failing test**

Create `src/app/offline/page.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import OfflinePage from "./page"

afterEach(() => cleanup())

describe("OfflinePage", () => {
  it("renders offline heading", () => {
    render(<OfflinePage />)
    expect(screen.getByRole("heading", { name: /нет подключения/i })).toBeInTheDocument()
  })

  it("renders hint about opening online first", () => {
    render(<OfflinePage />)
    expect(screen.getByText(/откройте приложение онлайн/i)).toBeInTheDocument()
  })

  it("reload button calls window.location.reload", () => {
    const reload = vi.fn()
    Object.defineProperty(window, "location", { value: { reload }, writable: true })
    render(<OfflinePage />)
    fireEvent.click(screen.getByRole("button", { name: /попробовать снова/i }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/app/offline/page.test.tsx
```

Expected: FAIL — `Cannot find module './page'`

- [ ] **Step 3: Implement the page**

Create `src/app/offline/page.tsx`:

```tsx
"use client"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📡</div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Нет подключения</h1>
        <p className="text-sm text-gray-500 mb-6">
          Откройте приложение онлайн хотя бы раз, чтобы данные закэшировались и были доступны офлайн.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/app/offline/page.test.tsx
```

Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/offline/page.tsx src/app/offline/page.test.tsx
git commit -m "feat: add /offline fallback page for PWA"
```

---

### Task 2: Update next.config.ts — StaleWhileRevalidate + fallbacks

**Goal:** Configure the service worker to cache pages eagerly and serve `/offline` when navigation fails.

**Files:**
- Modify: `next.config.ts`

**Acceptance Criteria:**
- [ ] `handler` for the pages runtime cache rule is `"StaleWhileRevalidate"` (no `networkTimeoutSeconds`)
- [ ] `fallbacks: { document: "/offline" }` is present in the next-pwa config
- [ ] `npm run build` succeeds with no errors
- [ ] `public/sw.js` is generated after build

**Verify:** `npm run build` → exits 0, `public/sw.js` exists

**Steps:**

- [ ] **Step 1: Update next.config.ts**

Replace the full file content:

```ts
import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^\/(?!_next\/)/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "pages",
        },
      },
    ],
  },
})(nextConfig);
```

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: exits 0, no errors. Check that `public/sw.js` is present:

```bash
ls public/sw.js
```

Expected: file exists (generated by next-pwa during build)

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "fix: use StaleWhileRevalidate + offline fallback for iOS PWA"
```

---

## Manual Verification (after deploy to Vercel)

1. Open `https://task-manager-silk-one.vercel.app` on iPhone in Safari
2. Add to Home Screen if not already installed
3. Open the app from the Home Screen icon while **online** — navigate to `/tasks`, wait a few seconds
4. Enable Airplane Mode
5. Close the app fully (swipe up from app switcher)
6. Re-open from Home Screen icon
7. Expected: app loads (either shows cached tasks, or shows the `/offline` page — never shows the iOS system "Safari cannot open the page" error)
