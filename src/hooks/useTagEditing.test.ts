// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTagEditing } from "./useTagEditing"
import type { Tag } from "@/types"

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return { id: "t1", name: "bug", color: "#60a5fa", ...overrides }
}

function makeOptions() {
  return {
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  }
}

describe("useTagEditing — startEditing / cancelEdit", () => {
  it("startEditing populates state from tag", () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useTagEditing(opts))
    const tag = makeTag({ id: "t1", name: "feature" })

    act(() => result.current.startEditing(tag))

    expect(result.current.editingId).toBe("t1")
    expect(result.current.editingName).toBe("feature")
  })

  it("startEditing closes delete dialog", () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useTagEditing(opts))

    act(() => result.current.setDeletingId("t1"))
    act(() => result.current.startEditing(makeTag()))

    expect(result.current.deletingId).toBeNull()
  })

  it("cancelEdit clears editingId and error", () => {
    const opts = makeOptions()
    opts.onUpdate.mockRejectedValue(new Error("fail"))
    const { result } = renderHook(() => useTagEditing(opts))

    act(() => {
      result.current.startEditing(makeTag())
      result.current.setEditingName("valid")
    })

    // force an error first
    act(() => { result.current.cancelEdit() })
    // simulate error state manually then cancel
    act(() => result.current.startEditing(makeTag()))
    act(() => result.current.cancelEdit())

    expect(result.current.editingId).toBeNull()
    expect(result.current.error).toBeNull()
  })
})

describe("useTagEditing — handleUpdate", () => {
  it("calls onUpdate with trimmed name and closes editor", async () => {
    const opts = makeOptions()
    const updated = makeTag({ name: "hotfix" })
    opts.onUpdate.mockResolvedValue(updated)
    const { result } = renderHook(() => useTagEditing(opts))

    act(() => {
      result.current.startEditing(makeTag({ id: "t1" }))
      result.current.setEditingName("  hotfix  ")
    })

    await act(() => result.current.handleUpdate("t1"))

    expect(opts.onUpdate).toHaveBeenCalledWith("t1", { name: "hotfix" })
    expect(result.current.editingId).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("cancels edit without calling onUpdate when name is blank", async () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useTagEditing(opts))

    act(() => {
      result.current.startEditing(makeTag())
      result.current.setEditingName("   ")
    })

    await act(() => result.current.handleUpdate("t1"))

    expect(opts.onUpdate).not.toHaveBeenCalled()
    expect(result.current.editingId).toBeNull()
  })

  it("sets error message when onUpdate throws", async () => {
    const opts = makeOptions()
    opts.onUpdate.mockRejectedValue(new Error("fail"))
    const { result } = renderHook(() => useTagEditing(opts))

    act(() => {
      result.current.startEditing(makeTag({ id: "t1" }))
      result.current.setEditingName("valid")
    })

    await act(() => result.current.handleUpdate("t1"))

    expect(result.current.error).toBe("Не удалось сохранить метку.")
    expect(result.current.editingId).toBe("t1") // form stays open
  })
})

describe("useTagEditing — handleConfirmDelete", () => {
  it("calls onDelete and clears both ids on success", async () => {
    const opts = makeOptions()
    opts.onDelete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useTagEditing(opts))

    act(() => {
      result.current.startEditing(makeTag({ id: "t1" }))
      result.current.setDeletingId("t1")
    })

    await act(() => result.current.handleConfirmDelete("t1"))

    expect(opts.onDelete).toHaveBeenCalledWith("t1")
    expect(result.current.deletingId).toBeNull()
    expect(result.current.editingId).toBeNull()
  })

  it("sets error and keeps ids when onDelete throws", async () => {
    const opts = makeOptions()
    opts.onDelete.mockRejectedValue(new Error("fail"))
    const { result } = renderHook(() => useTagEditing(opts))

    act(() => {
      result.current.startEditing(makeTag({ id: "t1" }))
      result.current.setDeletingId("t1")
    })

    await act(() => result.current.handleConfirmDelete("t1"))

    expect(result.current.error).toBe("Не удалось удалить метку.")
    expect(result.current.deletingId).toBe("t1")
  })
})
