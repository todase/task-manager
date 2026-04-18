// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { SubtaskPanel } from "./SubtaskPanel"
import type { Subtask } from "@/types"

afterEach(cleanup)

const makeSubtask = (overrides: Partial<Subtask> = {}): Subtask => ({
  id: "s1",
  title: "Test subtask",
  done: false,
  ...overrides,
})

describe("SubtaskPanel", () => {
  it("renders the add subtask form", () => {
    render(
      <SubtaskPanel
        taskId="t1"
        subtasks={[]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText(/добавить подзадачу/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument()
  })

  it("does not show counter when subtasks list is empty", () => {
    render(
      <SubtaskPanel taskId="t1" subtasks={[]} onAdd={vi.fn()} onToggle={vi.fn()} onDelete={vi.fn()} />
    )
    expect(screen.queryByText(/подзадачи/i)).not.toBeInTheDocument()
  })

  it("shows subtask titles", () => {
    render(
      <SubtaskPanel
        taskId="t1"
        subtasks={[
          makeSubtask({ id: "s1", title: "First" }),
          makeSubtask({ id: "s2", title: "Second", done: true }),
        ]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
  })

  it("shows done/total counter", () => {
    render(
      <SubtaskPanel
        taskId="t1"
        subtasks={[
          makeSubtask({ id: "s1", done: true }),
          makeSubtask({ id: "s2", done: false }),
        ]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByText(/1\/2/)).toBeInTheDocument()
  })

  it("calls onAdd with trimmed title on form submit", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(
      <SubtaskPanel taskId="t1" subtasks={[]} onAdd={onAdd} onToggle={vi.fn()} onDelete={vi.fn()} />
    )
    const input = screen.getByPlaceholderText(/добавить подзадачу/i)
    fireEvent.change(input, { target: { value: "  New subtask  " } })
    fireEvent.submit(input.closest("form")!)
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("t1", "New subtask"))
  })

  it("clears input after successful add", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(
      <SubtaskPanel taskId="t1" subtasks={[]} onAdd={onAdd} onToggle={vi.fn()} onDelete={vi.fn()} />
    )
    const input = screen.getByPlaceholderText(/добавить подзадачу/i)
    fireEvent.change(input, { target: { value: "New subtask" } })
    fireEvent.submit(input.closest("form")!)
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(""))
  })

  it("does not call onAdd when input is empty", async () => {
    const onAdd = vi.fn()
    render(
      <SubtaskPanel taskId="t1" subtasks={[]} onAdd={onAdd} onToggle={vi.fn()} onDelete={vi.fn()} />
    )
    fireEvent.submit(screen.getByPlaceholderText(/добавить подзадачу/i).closest("form")!)
    expect(onAdd).not.toHaveBeenCalled()
  })

  it("calls onToggle when checkbox is changed", () => {
    const onToggle = vi.fn().mockResolvedValue(undefined)
    const subtask = makeSubtask({ id: "s1", title: "Toggle me" })
    render(
      <SubtaskPanel taskId="t1" subtasks={[subtask]} onAdd={vi.fn()} onToggle={onToggle} onDelete={vi.fn()} />
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(onToggle).toHaveBeenCalledWith("t1", subtask)
  })

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn()
    render(
      <SubtaskPanel
        taskId="t1"
        subtasks={[makeSubtask({ id: "s1", title: "Delete me" })]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onDelete={onDelete}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /удалить подзадачу/i }))
    expect(onDelete).toHaveBeenCalledWith("t1", "s1")
  })

  it("renders done subtask with line-through style", () => {
    render(
      <SubtaskPanel
        taskId="t1"
        subtasks={[makeSubtask({ id: "s1", title: "Done task", done: true })]}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const title = screen.getByText("Done task")
    expect(title.className).toContain("line-through")
  })
})
