// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useProjectEditing } from "./useProjectEditing"
import type { Project } from "@/types"

function makeProject(overrides: Partial<Project> = {}): Project {
  return { id: "p1", title: "My Project", icon: "folder", ...overrides }
}

function makeOptions() {
  return {
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    onUpdate: vi.fn(),
  }
}

describe("useProjectEditing — startEditing / cancelEdit", () => {
  it("startEditing populates editing state from project", () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useProjectEditing(opts))
    const project = makeProject({ id: "p1", title: "Alpha", icon: "star" })

    act(() => result.current.startEditing(project))

    expect(result.current.editingId).toBe("p1")
    expect(result.current.editingTitle).toBe("Alpha")
    expect(result.current.editingIcon).toBe("star")
    expect(result.current.showEditIconPicker).toBe(false)
  })

  it("startEditing closes delete dialog", () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => result.current.setDeletingId("p1"))
    act(() => result.current.startEditing(makeProject()))

    expect(result.current.deletingId).toBeNull()
  })

  it("cancelEdit clears editingId and icon picker", () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => result.current.startEditing(makeProject()))
    act(() => result.current.toggleEditIconPicker())
    act(() => result.current.cancelEdit())

    expect(result.current.editingId).toBeNull()
    expect(result.current.showEditIconPicker).toBe(false)
  })
})

describe("useProjectEditing — toggles", () => {
  it("toggleEditIconPicker toggles showEditIconPicker", () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useProjectEditing(opts))

    expect(result.current.showEditIconPicker).toBe(false)
    act(() => result.current.toggleEditIconPicker())
    expect(result.current.showEditIconPicker).toBe(true)
    act(() => result.current.toggleEditIconPicker())
    expect(result.current.showEditIconPicker).toBe(false)
  })

  it("toggleNewIconPicker toggles showNewIconPicker", () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useProjectEditing(opts))

    expect(result.current.showNewIconPicker).toBe(false)
    act(() => result.current.toggleNewIconPicker())
    expect(result.current.showNewIconPicker).toBe(true)
  })
})

describe("useProjectEditing — handleUpdate", () => {
  it("calls onUpdate with trimmed title and icon, then cancels edit", async () => {
    const opts = makeOptions()
    opts.onUpdate.mockResolvedValue(undefined)
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => {
      result.current.startEditing(makeProject({ id: "p1" }))
      result.current.setEditingTitle("  New Name  ")
      result.current.setEditingIcon("inbox")
    })

    await act(() => result.current.handleUpdate("p1"))

    expect(opts.onUpdate).toHaveBeenCalledWith("p1", { title: "New Name", icon: "inbox" })
    expect(result.current.editingId).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("cancels edit without calling onUpdate when title is blank", async () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => {
      result.current.startEditing(makeProject({ id: "p1" }))
      result.current.setEditingTitle("   ")
    })

    await act(() => result.current.handleUpdate("p1"))

    expect(opts.onUpdate).not.toHaveBeenCalled()
    expect(result.current.editingId).toBeNull()
  })

  it("sets error message when onUpdate throws", async () => {
    const opts = makeOptions()
    opts.onUpdate.mockRejectedValue(new Error("fail"))
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => {
      result.current.startEditing(makeProject({ id: "p1" }))
      result.current.setEditingTitle("Valid")
    })

    await act(() => result.current.handleUpdate("p1"))

    expect(result.current.error).toBe("Не удалось сохранить проект. Попробуйте ещё раз.")
    expect(result.current.editingId).toBe("p1") // stays open
  })
})

describe("useProjectEditing — handleConfirmDelete", () => {
  it("calls onDelete and clears deletingId and editingId", async () => {
    const opts = makeOptions()
    opts.onDelete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => {
      result.current.startEditing(makeProject({ id: "p1" }))
      result.current.setDeletingId("p1")
    })

    await act(() => result.current.handleConfirmDelete("p1"))

    expect(opts.onDelete).toHaveBeenCalledWith("p1")
    expect(result.current.deletingId).toBeNull()
    expect(result.current.editingId).toBeNull()
  })
})

describe("useProjectEditing — handleCreate", () => {
  const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls onCreate with trimmed title and resets new-project state", async () => {
    const opts = makeOptions()
    opts.onCreate.mockResolvedValue(makeProject())
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => {
      result.current.setNewTitle("  Beta  ")
      result.current.setNewIcon("star")
    })

    await act(() => result.current.handleCreate(fakeEvent))

    expect(opts.onCreate).toHaveBeenCalledWith("Beta", "star")
    expect(result.current.newTitle).toBe("")
    expect(result.current.newIcon).toBe("folder")
    expect(result.current.showNew).toBe(false)
    expect(result.current.showNewIconPicker).toBe(false)
  })

  it("does nothing when newTitle is blank", async () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => result.current.setNewTitle("   "))
    await act(() => result.current.handleCreate(fakeEvent))

    expect(opts.onCreate).not.toHaveBeenCalled()
  })

  it("sets error when onCreate throws", async () => {
    const opts = makeOptions()
    opts.onCreate.mockRejectedValue(new Error("fail"))
    const { result } = renderHook(() => useProjectEditing(opts))

    act(() => {
      result.current.setShowNew(true)
      result.current.setNewTitle("Gamma")
    })
    await act(() => result.current.handleCreate(fakeEvent))

    expect(result.current.error).toBe("Не удалось создать проект. Попробуйте ещё раз.")
    expect(result.current.showNew).toBe(true) // form stays open
  })
})
