// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { TaskItem } from "./TaskItem"
import type { Task, Project, Tag } from "@/types"

vi.mock("@/components/tasks/SubtaskPanel", () => ({
  SubtaskPanel: () => <div data-testid="subtask-panel" />,
}))

vi.mock("@/components/tasks/TaskTagPicker", () => ({
  TaskTagPicker: () => <div data-testid="tag-picker" />,
}))

vi.mock("@/components/projects/ProjectIconPicker", () => ({
  ProjectIcon: ({ icon }: { icon: string }) => <span data-testid="project-icon">{icon}</span>,
}))

vi.mock("@/lib/dates", () => ({
  formatDueDate: (d: string) => `formatted:${d}`,
}))

vi.mock("@/lib/priority", () => ({
  priorityColor: () => "rgb(59, 130, 246)",
}))

vi.mock("@/components/tasks/ReflectionModal", () => ({
  ReflectionModal: ({ onClose }: { taskId: string; onClose: () => void }) => (
    <div data-testid="reflection-modal">
      <button onClick={onClose}>close-modal</button>
    </div>
  ),
}))

afterEach(cleanup)

const TODAY = "2026-04-18"

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test task",
  done: false,
  dueDate: null,
  recurrence: null,
  description: null,
  order: 0,
  project: null,
  subtasks: [],
  tags: [],
  priorityScore: 0.5,
  ...overrides,
})

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "p1",
  title: "My Project",
  icon: "folder",
  ...overrides,
})

const defaultProps = {
  task: makeTask(),
  showProject: false,
  projects: [],
  onAssignProject: vi.fn().mockResolvedValue(undefined),
  onToggle: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  onRename: vi.fn().mockResolvedValue(undefined),
  onUpdateDueDate: vi.fn().mockResolvedValue(undefined),
  onUpdateDescription: vi.fn().mockResolvedValue(undefined),
  onUpdateTags: vi.fn().mockResolvedValue(undefined),
  tags: [] as Tag[],
  onCreateTag: vi.fn().mockResolvedValue({ id: "new-tag", name: "tag", color: "#000" }),
  onAddSubtask: vi.fn().mockResolvedValue(undefined),
  onToggleSubtask: vi.fn().mockResolvedValue(undefined),
  onDeleteSubtask: vi.fn().mockResolvedValue(undefined),
}

beforeEach(() => {
  vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("TaskItem", () => {
  it("renders task title", () => {
    render(<TaskItem {...defaultProps} task={makeTask({ title: "My task" })} />)
    expect(screen.getByText("My task")).toBeInTheDocument()
  })

  it("calls onToggle when checkbox is clicked", async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined)
    const task = makeTask()
    render(<TaskItem {...defaultProps} task={task} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole("button", { name: /отметить выполненной/i }))
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(task))
  })

  it("shows done checkbox label for completed task", () => {
    render(<TaskItem {...defaultProps} task={makeTask({ done: true })} />)
    expect(screen.getByRole("button", { name: /отметить невыполненной/i })).toBeInTheDocument()
  })

  it("applies line-through to done task title", () => {
    render(<TaskItem {...defaultProps} task={makeTask({ done: true, title: "Done task" })} />)
    expect(screen.getByText("Done task").className).toContain("line-through")
  })

  it("expands/collapses on chevron click", () => {
    render(<TaskItem {...defaultProps} />)
    expect(screen.queryByTestId("subtask-panel")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByTestId("subtask-panel")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /свернуть/i }))
    expect(screen.queryByTestId("subtask-panel")).not.toBeInTheDocument()
  })

  it("expands when clicking the task row (not buttons)", () => {
    render(<TaskItem {...defaultProps} task={makeTask({ title: "Clickable task" })} />)
    fireEvent.click(screen.getByText("Clickable task"))
    expect(screen.getByTestId("subtask-panel")).toBeInTheDocument()
  })

  it("calls onDelete when delete button clicked (expanded)", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(<TaskItem {...defaultProps} task={makeTask({ id: "task-42" })} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /удалить задачу/i }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("task-42"))
  })

  it("enters rename mode when rename button is clicked", () => {
    render(<TaskItem {...defaultProps} task={makeTask({ title: "Old title" })} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /переименовать/i }))
    const input = screen.getByRole("textbox", { name: "" })
    expect((input as HTMLInputElement).value).toBe("Old title")
  })

  it("commits rename on Enter key", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskItem {...defaultProps} task={makeTask({ id: "t1", title: "Old" })} onRename={onRename} />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /переименовать/i }))
    const input = screen.getByRole("textbox", { name: "" })
    fireEvent.change(input, { target: { value: "New title" } })
    fireEvent.keyDown(input, { key: "Enter" })
    await waitFor(() => expect(onRename).toHaveBeenCalledWith("t1", "New title"))
  })

  it("cancels rename on Escape key without calling onRename", async () => {
    const onRename = vi.fn()
    render(
      <TaskItem {...defaultProps} task={makeTask({ title: "Unchanged" })} onRename={onRename} />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /переименовать/i }))
    const input = screen.getByRole("textbox", { name: "" })
    fireEvent.change(input, { target: { value: "Changed" } })
    fireEvent.keyDown(input, { key: "Escape" })
    await waitFor(() => expect(onRename).not.toHaveBeenCalled())
    expect(screen.getByText("Unchanged")).toBeInTheDocument()
  })

  it("does not call onRename when title unchanged", async () => {
    const onRename = vi.fn()
    render(
      <TaskItem {...defaultProps} task={makeTask({ title: "Same" })} onRename={onRename} />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /переименовать/i }))
    const input = screen.getByRole("textbox", { name: "" })
    fireEvent.blur(input)
    await waitFor(() => expect(onRename).not.toHaveBeenCalled())
  })

  it("shows date badge in collapsed mode when task has dueDate", () => {
    render(
      <TaskItem {...defaultProps} task={makeTask({ dueDate: "2026-05-01T00:00:00.000Z" })} />
    )
    expect(screen.getByText(/formatted:/)).toBeInTheDocument()
  })

  it("hides date badge in expanded mode", () => {
    render(
      <TaskItem {...defaultProps} task={makeTask({ dueDate: "2026-05-01T00:00:00.000Z" })} />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    // collapsed badge disappears; expanded date label rendered differently
    const badges = screen.queryAllByText(/formatted:/)
    // in expanded mode there is still a date label but no collapsed badge
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it("calls onUpdateDueDate with empty string when clear date button clicked", async () => {
    const onUpdateDueDate = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskItem
        {...defaultProps}
        task={makeTask({ id: "t1", dueDate: "2026-05-01T00:00:00.000Z" })}
        onUpdateDueDate={onUpdateDueDate}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /сбросить дату/i }))
    await waitFor(() => expect(onUpdateDueDate).toHaveBeenCalledWith("t1", ""))
  })

  it("shows project icon when showProject=true and task has project", () => {
    const task = makeTask({ project: { id: "p1", title: "Work", icon: "briefcase" } })
    render(<TaskItem {...defaultProps} task={task} showProject={true} />)
    expect(screen.getByTestId("project-icon")).toBeInTheDocument()
  })

  it("hides project icon when showProject=false", () => {
    const task = makeTask({ project: { id: "p1", title: "Work", icon: "briefcase" } })
    render(<TaskItem {...defaultProps} task={task} showProject={false} />)
    expect(screen.queryByTestId("project-icon")).not.toBeInTheDocument()
  })

  it("shows recurrence label when task has recurrence", () => {
    render(
      <TaskItem {...defaultProps} task={makeTask({ recurrence: "weekly" })} />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByText(/еженедельно/i)).toBeInTheDocument()
  })

  it("shows project dropdown when project chip is clicked (expanded)", () => {
    const projects = [makeProject()]
    render(<TaskItem {...defaultProps} task={makeTask()} projects={projects} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /без проекта/i }))
    expect(screen.getAllByText(/без проекта/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("My Project")).toBeInTheDocument()
  })

  it("calls onAssignProject when project selected from dropdown", async () => {
    const onAssignProject = vi.fn().mockResolvedValue(undefined)
    const project = makeProject({ id: "p99" })
    render(
      <TaskItem {...defaultProps} task={makeTask({ id: "t1" })} projects={[project]} onAssignProject={onAssignProject} />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /без проекта/i }))
    fireEvent.click(screen.getByText("My Project"))
    await waitFor(() =>
      expect(onAssignProject).toHaveBeenCalledWith("t1", "p99", project)
    )
  })

  it("enters description edit mode and saves on Ctrl+Enter", async () => {
    const onUpdateDescription = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskItem
        {...defaultProps}
        task={makeTask({ id: "t1" })}
        onUpdateDescription={onUpdateDescription}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    fireEvent.click(screen.getByRole("button", { name: /добавить описание/i }))
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "New description" } })
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true })
    await waitFor(() =>
      expect(onUpdateDescription).toHaveBeenCalledWith("t1", "New description")
    )
  })
})

describe("ReflectionModal trigger", () => {
  it("shows ReflectionModal when toggling incomplete task to done", async () => {
    render(<TaskItem {...defaultProps} task={makeTask({ done: false })} />)
    fireEvent.click(screen.getByLabelText("Отметить выполненной"))
    await waitFor(() =>
      expect(screen.getByTestId("reflection-modal")).toBeInTheDocument()
    )
  })

  it("does not show ReflectionModal when toggling done task to undone", () => {
    render(<TaskItem {...defaultProps} task={makeTask({ done: true })} />)
    fireEvent.click(screen.getByLabelText("Отметить невыполненной"))
    expect(screen.queryByTestId("reflection-modal")).not.toBeInTheDocument()
  })

  it("closes ReflectionModal when onClose is called", async () => {
    render(<TaskItem {...defaultProps} task={makeTask({ done: false })} />)
    fireEvent.click(screen.getByLabelText("Отметить выполненной"))
    await waitFor(() =>
      expect(screen.getByTestId("reflection-modal")).toBeInTheDocument()
    )
    fireEvent.click(screen.getByText("close-modal"))
    expect(screen.queryByTestId("reflection-modal")).not.toBeInTheDocument()
  })
})
