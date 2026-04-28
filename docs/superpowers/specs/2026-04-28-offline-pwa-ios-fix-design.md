# Offline PWA iOS Fix

**Date:** 2026-04-28
**Problem:** App installed as PWA on iOS (Add to Home Screen) shows "Safari cannot open the page" when opened offline. The data layer (TanStack Query + IndexedDB) works correctly — the issue is the service worker not reliably caching and serving the HTML/JS app shell.

**Root causes:**
1. `NetworkFirst` strategy waits for network timeout before serving from cache — on iOS this causes a navigation-level failure before SW can respond
2. No fallback document — when cache is empty (iOS cleared it, or first offline open), SW has nothing to serve and iOS shows the system error

## Solution

Two changes to `next.config.ts` + one new page.

### 1. Change page caching strategy

Replace `NetworkFirst` with `StaleWhileRevalidate` for all non-`_next` pages:

```ts
{
  urlPattern: /^\/(?!_next\/)/,
  handler: "StaleWhileRevalidate",
  options: {
    cacheName: "pages",
  },
}
```

`StaleWhileRevalidate` serves from cache immediately (no network wait), then updates the cache in the background. This is critical on iOS where SW must respond synchronously to navigation requests.

### 2. Add fallback document

Add `fallbacks` option to next-pwa config:

```ts
fallbacks: {
  document: "/offline",
}
```

next-pwa automatically precaches `/offline` during SW installation, guaranteeing it is always available regardless of whether the user has visited any pages online.

### 3. New `/offline` page

**File:** `src/app/offline/page.tsx`

- `"use client"` (needed for reload button only)
- No `Providers`, `SessionProvider`, or API calls
- Content: "Нет подключения" heading, brief explanation, "Попробовать снова" button calling `window.location.reload()`
- Tailwind styling consistent with the rest of the app

This page is served by the SW whenever a navigation request fails (network error and no cached match).

## Files Changed

| File | Action |
|------|--------|
| `next.config.ts` | Change strategy + add fallbacks |
| `src/app/offline/page.tsx` | Create new static offline page |

## Success Criteria

- App opens from Home Screen on iPhone while in airplane mode without showing system Safari error
- If cache is warm (app was opened online before), `/tasks` is served and shows cached tasks
- If cache is empty, `/offline` page is shown instead of iOS system error
- No regression on desktop Chrome / online usage
