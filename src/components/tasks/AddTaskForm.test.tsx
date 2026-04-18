// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { AddTaskForm } from "./AddTaskForm"
import type { Project, Tag } from "@/types"

vi.mock("@/components/projects/ProjectIconPicker", () => ({
  ProjectIcon: ({ icon }: { icon: string }) => <span data-testid="project-icon">{icon}</span>,
}))

afterEach(cleanup)

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "p1",
  title: "Work",
  icon: "folder",
  ...overrides,
})

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: "tag-1",
  name: "urgent",
  color: "#ff0000",
  ...overrides,
})

const defaultProps = {
  activeProjectId: null,
  projects: [] as Project[],
  tags: [] as Tag[],
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCreateTag: vi.fn().mockResolvedValue(makeTag()),
}

function openModal() {
  fireEvent.click(screen.getByRole("button", { name: /добавить задачу/i }))
}

describe("AddTaskForm", () => {
  it("renders FAB button", () => {
    render(<AddTaskForm {...defaultProps} />)
    expect(screen.getByRole("button", { name: /добавить задачу/i })).toBeInTheDocument()
  })

  it("modal is hidden initially", () => {
    render(<AddTaskForm {...defaultProps} />)
    expect(screen.queryByText(/новая задача/i)).not.toBeInTheDocument()
  })

  it("opens modal when FAB is clicked", () => {
    render(<AddTaskForm {...defaultProps} />)
    openModal()
    expect(screen.getByText(/новая задача/i)).toBeInTheDocument()
  })

  it("closes modal when X button is clicked", () => {
    render(<AddTaskForm {...defaultProps} />)
    openModal()
    fireEvent.click(screen.getByRole("button", { name: /закрыть/i }))
    expect(screen.queryByText(/новая задача/i)).not.toBeInTheDocument()
  })

  it("closes modal on Escape key press", () => {
    render(<AddTaskForm {...defaultProps} />)
    openModal()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByText(/новая задача/i)).not.toBeInTheDocument()
  })

  it("submit button is disabled when title is empty", () => {
    render(<AddTaskForm {...defaultProps} />)
    openModal()
    expect(screen.getByRole("button", { name: /создать задачу/i })).toBeDisabled()
  })

  it("submit button is enabled when title has text", () => {
    render(<AddTaskForm {...defaultProps} />)
    openModal()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My new task" } })
    expect(screen.getByRole("button", { name: /создать задачу/i })).not.toBeDisabled()
  })

  it("calls onSubmit with trimmed title", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AddTaskForm {...defaultProps} onSubmit={onSubmit} />)
    openModal()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  My task  " } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "My task" })))
  })

  it("closes and resets modal after successful submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AddTaskForm {...defaultProps} onSubmit={onSubmit} />)
    openModal()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Task title" } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    await waitFor(() => expect(screen.queryByText(/новая задача/i)).not.toBeInTheDocument())
  })

  it("shows error message when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Network error"))
    render(<AddTaskForm {...defaultProps} onSubmit={onSubmit} />)
    openModal()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bad task" } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    await waitFor(() =>
      expect(screen.getByText(/не удалось создать задачу/i)).toBeInTheDocument()
    )
  })

  it("modal stays open after failed submit", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("fail"))
    render(<AddTaskForm {...defaultProps} onSubmit={onSubmit} />)
    openModal()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Task" } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    await waitFor(() =>
      expect(screen.getByText(/новая задача/i)).toBeInTheDocument()
    )
  })

  it("includes activeProjectId in submit payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const projects = [makeProject({ id: "project-99" })]
    render(
      <AddTaskForm
        {...defaultProps}
        activeProjectId="project-99"
        projects={projects}
        onSubmit={onSubmit}
      />
    )
    openModal()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Task" } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ projectId: "project-99" }))
    )
  })

  it("hides project dropdown button when activeProjectId is set", () => {
    render(
      <AddTaskForm {...defaultProps} activeProjectId="p1" projects={[makeProject()]} />
    )
    openModal()
    expect(screen.queryByRole("button", { name: /проект/i })).not.toBeInTheDocument()
  })

  it("shows project dropdown button when activeProjectId is null", () => {
    render(<AddTaskForm {...defaultProps} projects={[makeProject()]} />)
    openModal()
    expect(screen.getByRole("button", { name: /проект/i })).toBeInTheDocument()
  })

  it("shows project list when project button is clicked", () => {
    const projects = [makeProject({ id: "p1", title: "Work" })]
    render(<AddTaskForm {...defaultProps} projects={projects} />)
    openModal()
    fireEvent.click(screen.getByRole("button", { name: /проект/i }))
    expect(screen.getByText("Work")).toBeInTheDocument()
  })

  it("selecting a project from dropdown includes it in submit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const projects = [makeProject({ id: "p42", title: "Work" })]
    render(<AddTaskForm {...defaultProps} projects={projects} onSubmit={onSubmit} />)
    openModal()
    fireEvent.click(screen.getByRole("button", { name: /проект/i }))
    fireEvent.mouseDown(screen.getByText("Work"))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Task" } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p42" }))
    )
  })

  it("shows date input when date button is clicked", () => {
    const { container } = render(<AddTaskForm {...defaultProps} />)
    openModal()
    fireEvent.click(screen.getByRole("button", { name: /дата/i }))
    expect(container.querySelector('input[type="date"]')).toBeInTheDocument()
  })

  it("shows recurrence select when repeat button is clicked", () => {
    render(<AddTaskForm {...defaultProps} />)
    openModal()
    fireEvent.click(screen.getByRole("button", { name: /повтор/i }))
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("includes recurrence in submit payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AddTaskForm {...defaultProps} onSubmit={onSubmit} />)
    openModal()
    fireEvent.click(screen.getByRole("button", { name: /повтор/i }))
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "weekly" } })
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Weekly task" } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ recurrence: "weekly" }))
    )
  })

  it("shows tags section when tags button is clicked", () => {
    render(<AddTaskForm {...defaultProps} tags={[makeTag()]} />)
    openModal()
    fireEvent.click(screen.getByRole("button", { name: /метки/i }))
    expect(screen.getByPlaceholderText(/добавить метку/i)).toBeInTheDocument()
  })

  it("prevents double submit — onSubmit called once even if button clicked twice", async () => {
    let resolve!: () => void
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((r) => { resolve = r }))
    render(<AddTaskForm {...defaultProps} onSubmit={onSubmit} />)
    openModal()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Task" } })
    fireEvent.click(screen.getByRole("button", { name: /создать задачу/i }))
    fireEvent.click(screen.getByRole("button", { name: /создаём/i }))
    resolve()
    await waitFor(() => {})
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("uses project-specific placeholder when activeProjectId set", () => {
    const projects = [makeProject({ id: "p1", title: "Work" })]
    render(<AddTaskForm {...defaultProps} activeProjectId="p1" projects={projects} />)
    openModal()
    expect(screen.getByPlaceholderText(/задача в «work»/i)).toBeInTheDocument()
  })
})
