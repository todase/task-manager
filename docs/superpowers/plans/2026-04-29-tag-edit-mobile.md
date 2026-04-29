# Tag Edit Button — Mobile Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tag rename/delete accessible on touch devices by showing the edit button on the last-tapped active tag, mirroring the ProjectTabs pattern.

**Architecture:** Add `lastTappedId` local state to `TagFilter`. When a tag is toggled on, record it as `lastTappedId`. The pencil button renders only when the tag is both active and equals `lastTappedId`, with pill styling split into left/right halves like ProjectTabs.

**Tech Stack:** React useState, Tailwind CSS, existing `useTagEditing` hook

---

### Task 1: Update TagFilter for mobile-accessible tag editing

**Goal:** Replace hover-only pencil button with always-visible pencil on the last-tapped active tag.

**Files:**
- Modify: `src/components/filters/TagFilter.tsx`
- Test: `src/components/tasks/TaskTagPicker.test.tsx` (check no regressions — TagFilter has no dedicated test file)

**Acceptance Criteria:**
- [ ] Pencil icon is not visible by default on any tag
- [ ] Tapping a tag activates it and shows the pencil icon on that tag only
- [ ] Tapping another tag moves the pencil to the newly tapped tag
- [ ] Tapping an active tag (to deactivate it) removes the pencil if it was on that tag
- [ ] Clicking "Сбросить" clears both selection and pencil
- [ ] Active tag without pencil remains `rounded-full` (standard pill)
- [ ] Active tag with pencil uses `rounded-l-full` + separate `rounded-r-full` pencil button (same height)
- [ ] Works in offline mode (pencil button disabled when `!isOnline`, same as before)

**Verify:** `npx vitest run src/components/tasks/TaskTagPicker.test.tsx` → all pass (no regressions)

**Steps:**

- [ ] **Step 1: Add `lastTappedId` state and update `toggle`**

In `TagFilter`, add state and update the toggle function:

```tsx
const [lastTappedId, setLastTappedId] = useState<string | null>(null)

function toggle(id: string) {
  if (selectedIds.includes(id)) {
    onChange(selectedIds.filter((s) => s !== id))
    if (lastTappedId === id) setLastTappedId(null)
  } else {
    onChange([...selectedIds, id])
    setLastTappedId(id)
  }
}
```

- [ ] **Step 2: Update "Сбросить" to clear `lastTappedId`**

```tsx
<button
  onClick={() => { onChange([]); setLastTappedId(null) }}
  className="text-xs text-gray-400 hover:text-gray-600"
>
  Сбросить
</button>
```

- [ ] **Step 3: Replace the tag pill render with project-style split**

Replace the existing `<span key={tag.id} className="flex items-center group">` block (the non-editing state, currently lines ~123–149) with:

```tsx
return (
  <span key={tag.id} className="flex items-center">
    <button
      onClick={() => toggle(tag.id)}
      className="text-xs px-2.5 py-1 border transition-colors"
      style={
        active
          ? {
              backgroundColor: tag.color,
              borderColor: tag.color,
              color: "white",
              borderRadius: showEdit ? "9999px 0 0 9999px" : "9999px",
            }
          : {
              backgroundColor: `${tag.color}26`,
              borderColor: `${tag.color}80`,
              color: tag.color,
              borderRadius: "9999px",
            }
      }
    >
      {tag.name}
    </button>
    {showEdit && (
      <button
        onClick={() => edit.startEditing(tag)}
        disabled={!isOnline}
        title={!isOnline ? "Недоступно без подключения" : undefined}
        className="flex items-center justify-center px-1.5 py-1 border border-l-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: tag.color,
          borderColor: tag.color,
          color: "white",
          borderRadius: "0 9999px 9999px 0",
        }}
        aria-label="Редактировать метку"
      >
        <Pencil className="w-3 h-3" />
      </button>
    )}
  </span>
)
```

Where `showEdit` is defined just before the return:

```tsx
const showEdit = active && tag.id === lastTappedId
```

- [ ] **Step 4: Remove the `group` class import usage**

The old `group` / `group-hover` classes are no longer needed. Confirm `TagFilter.tsx` no longer has `group-hover` anywhere.

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/components/tasks/TaskTagPicker.test.tsx
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/filters/TagFilter.tsx
git commit -m "feat: show tag edit button on last-tapped active tag (mobile fix)"
```
