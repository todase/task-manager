// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { TaskTagPicker } from "./TaskTagPicker"
import type { Tag } from "@/types"

afterEach(cleanup)

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: "tag-1",
  name: "urgent",
  color: "#ff0000",
  ...overrides,
})

const defaultProps = {
  assignedTags: [] as Tag[],
  allTags: [] as Tag[],
  onUpdateTags: vi.fn().mockResolvedValue(undefined),
  onCreateTag: vi.fn().mockResolvedValue(makeTag({ id: "new-tag", name: "new" })),
}

describe("TaskTagPicker", () => {
  it("renders the add tag button", () => {
    render(<TaskTagPicker {...defaultProps} />)
    expect(screen.getByRole("button", { name: /\+ тег/i })).toBeInTheDocument()
  })

  it("renders assigned tags", () => {
    const tags = [
      makeTag({ id: "t1", name: "urgent" }),
      makeTag({ id: "t2", name: "work", color: "#0000ff" }),
    ]
    render(<TaskTagPicker {...defaultProps} assignedTags={tags} allTags={tags} />)
    expect(screen.getByText("urgent")).toBeInTheDocument()
    expect(screen.getByText("work")).toBeInTheDocument()
  })

  it("opens picker when + тег is clicked", () => {
    render(<TaskTagPicker {...defaultProps} allTags={[makeTag()]} />)
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    expect(screen.getByPlaceholderText(/новая метка/i)).toBeInTheDocument()
  })

  it("shows available (unassigned) tags in picker, not the assigned ones", () => {
    const t1 = makeTag({ id: "t1", name: "urgent" })
    const t2 = makeTag({ id: "t2", name: "work" })
    render(
      <TaskTagPicker {...defaultProps} assignedTags={[t1]} allTags={[t1, t2]} />
    )
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    // "urgent" is assigned — shows as chip span, not as a picker button
    expect(screen.queryByRole("button", { name: "urgent" })).not.toBeInTheDocument()
    // "work" is available — shows as a button in the picker dropdown
    expect(screen.getByRole("button", { name: "work" })).toBeInTheDocument()
  })

  it("shows 'Все метки уже назначены' when all tags are assigned", () => {
    const tag = makeTag()
    render(
      <TaskTagPicker {...defaultProps} assignedTags={[tag]} allTags={[tag]} />
    )
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    expect(screen.getByText(/все метки уже назначены/i)).toBeInTheDocument()
  })

  it("calls onUpdateTags when an available tag is selected", async () => {
    const onUpdateTags = vi.fn().mockResolvedValue(undefined)
    const t1 = makeTag({ id: "t1", name: "urgent" })
    const t2 = makeTag({ id: "t2", name: "work" })
    render(
      <TaskTagPicker
        {...defaultProps}
        assignedTags={[t1]}
        allTags={[t1, t2]}
        onUpdateTags={onUpdateTags}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    fireEvent.mouseDown(screen.getByText("work"))
    await waitFor(() => expect(onUpdateTags).toHaveBeenCalledWith(["t1", "t2"]))
  })

  it("removes tag when remove button clicked", async () => {
    const onUpdateTags = vi.fn().mockResolvedValue(undefined)
    const t1 = makeTag({ id: "t1", name: "urgent" })
    const t2 = makeTag({ id: "t2", name: "work" })
    render(
      <TaskTagPicker
        {...defaultProps}
        assignedTags={[t1, t2]}
        allTags={[t1, t2]}
        onUpdateTags={onUpdateTags}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /снять метку urgent/i }))
    await waitFor(() => expect(onUpdateTags).toHaveBeenCalledWith(["t2"]))
  })

  it("shows create button when typing a new tag name", () => {
    render(<TaskTagPicker {...defaultProps} allTags={[makeTag({ name: "existing" })]} />)
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    fireEvent.change(screen.getByPlaceholderText(/новая метка/i), {
      target: { value: "brandnew" },
    })
    expect(screen.getByText(/создать «brandnew»/i)).toBeInTheDocument()
  })

  it("does not show create button when tag name already exists", () => {
    const tag = makeTag({ name: "existing" })
    render(<TaskTagPicker {...defaultProps} allTags={[tag]} />)
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    fireEvent.change(screen.getByPlaceholderText(/новая метка/i), {
      target: { value: "existing" },
    })
    expect(screen.queryByText(/создать «existing»/i)).not.toBeInTheDocument()
  })

  it("calls onCreateTag and onUpdateTags when Enter pressed in new tag input", async () => {
    const newTag = makeTag({ id: "new-1", name: "brandnew" })
    const onCreateTag = vi.fn().mockResolvedValue(newTag)
    const onUpdateTags = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskTagPicker
        {...defaultProps}
        allTags={[]}
        onCreateTag={onCreateTag}
        onUpdateTags={onUpdateTags}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    fireEvent.change(screen.getByPlaceholderText(/новая метка/i), {
      target: { value: "brandnew" },
    })
    fireEvent.keyDown(screen.getByPlaceholderText(/новая метка/i), { key: "Enter" })
    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith("brandnew"))
    await waitFor(() => expect(onUpdateTags).toHaveBeenCalledWith(["new-1"]))
  })

  it("closes picker on Escape key", () => {
    render(<TaskTagPicker {...defaultProps} allTags={[makeTag()]} />)
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    expect(screen.getByPlaceholderText(/новая метка/i)).toBeInTheDocument()
    fireEvent.keyDown(screen.getByPlaceholderText(/новая метка/i), { key: "Escape" })
    expect(screen.queryByPlaceholderText(/новая метка/i)).not.toBeInTheDocument()
  })

  it("shows error when onUpdateTags rejects (via chip remove with picker open)", async () => {
    const onUpdateTags = vi.fn().mockRejectedValue(new Error("fail"))
    const t1 = makeTag({ id: "t1", name: "urgent" })
    render(
      <TaskTagPicker
        {...defaultProps}
        assignedTags={[t1]}
        allTags={[t1]}
        onUpdateTags={onUpdateTags}
      />
    )
    // Open picker so the error element is mounted
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    // Click chip remove button — does NOT close picker, so error renders inside picker
    fireEvent.click(screen.getByRole("button", { name: /снять метку urgent/i }))
    await waitFor(() =>
      expect(screen.getByText(/не удалось обновить метки/i)).toBeInTheDocument()
    )
  })

  it("shows error when onCreateTag rejects", async () => {
    const onCreateTag = vi.fn().mockRejectedValue(new Error("fail"))
    render(
      <TaskTagPicker
        {...defaultProps}
        allTags={[]}
        onCreateTag={onCreateTag}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /\+ тег/i }))
    fireEvent.change(screen.getByPlaceholderText(/новая метка/i), {
      target: { value: "new" },
    })
    fireEvent.keyDown(screen.getByPlaceholderText(/новая метка/i), { key: "Enter" })
    await waitFor(() =>
      expect(screen.getByText(/не удалось создать метку/i)).toBeInTheDocument()
    )
  })
})
