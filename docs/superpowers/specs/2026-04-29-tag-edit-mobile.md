# Tag Edit Button — Mobile Accessibility

**Date:** 2026-04-29

## Problem

The edit (pencil) icon on tag pills is shown only on hover (`opacity-0 group-hover:opacity-100`), making it inaccessible on mobile/touch devices.

## Solution

Mirror the pattern used by `ProjectTabs`: when a tag is active (selected as a filter), show the edit button inline. If multiple tags are selected, only the **last tapped** tag shows the edit button.

## Design

### State

Add `lastTappedId: string | null` local state to `TagFilter`.

### Behavior

- Tag toggled **on** → `lastTappedId = id`
- Tag toggled **off** → if `lastTappedId === id`, reset to `null`
- "Сбросить" button → clears both `selectedIds` and `lastTappedId`

### Rendering

When `active && tag.id === lastTappedId`:
- Tag pill: `rounded-l-full` (left-rounded only)
- Pencil button appears on the right: same height, `rounded-r-full`, colored like the tag

When `active && tag.id !== lastTappedId`:
- Tag pill: `rounded-full` (no pencil)

When not active:
- Tag pill: `rounded-full` (no pencil)

## Scope

- One file changed: `src/components/filters/TagFilter.tsx`
- No new files, no API changes, no test changes required
