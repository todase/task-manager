// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { TaskList } from "./TaskList"
import type { Task, Tag, Project } from "@/types"

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
}))

vi.mock("@/components/SortableTask", () => ({
  SortableTask: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
}))

vi.mock("@/components/tasks/TaskItem", () => ({
  TaskItem: ({ task }: { task: Task }) => <div data-testid="task-item">{task.title}</div>,
}))

vi.mock("@/components/tasks/TaskSkeleton", () => ({
  TaskSkeleton: () => <div data-testid="task-skeleton" />,
}))

vi.mock("@/components/tasks/ReflectionModal", () => ({
  ReflectionModal: () => <div data-testid="reflection-modal" />,
}))

afterEach(cleanup)

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Task one",
  done: false,
  dueDate: null,
  recurrence: null,
  description: null,
  order: 0,
  isHabit: false,
  estimatedMinutes: null,
  weeklyTarget: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  project: null,
  subtasks: [],
  tags: [],
  priorityScore: 0.5,
  ...overrides,
})

const defaultProps = {
  tasks: [] as Task[],
  filteredTasks: [] as Task[],
  activeProjectId: null,
  dateFilter: "all" as const,
  isLoading: false,
  projects: [] as Project[],
  onAssignProject: vi.fn(),
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onRename: vi.fn(),
  onUpdateDueDate: vi.fn(),
  onUpdateDescription: vi.fn(),
  onUpdateTags: vi.fn(),
  tags: [] as Tag[],
  onCreateTag: vi.fn(),
  onAddSubtask: vi.fn(),
  onToggleSubtask: vi.fn(),
  onDeleteSubtask: vi.fn(),
}

describe("TaskList", () => {
  it("shows skeleton when loading", () => {
    render(<TaskList {...defaultProps} isLoading={true} />)
    expect(screen.getByTestId("task-skeleton")).toBeInTheDocument()
  })

  it("does not show skeleton when not loading", () => {
    render(<TaskList {...defaultProps} isLoading={false} />)
    expect(screen.queryByTestId("task-skeleton")).not.toBeInTheDocument()
  })

  it("shows 'Добавьте первую задачу' when both lists are empty", () => {
    render(<TaskList {...defaultProps} tasks={[]} filteredTasks={[]} />)
    expect(screen.getByText(/добавьте первую задачу/i)).toBeInTheDocument()
  })

  it("shows 'Нет задач с таким фильтром' when tasks exist but filteredTasks empty", () => {
    const tasks = [makeTask()]
    render(<TaskList {...defaultProps} tasks={tasks} filteredTasks={[]} activeProjectId={null} />)
    expect(screen.getByText(/нет задач с таким фильтром/i)).toBeInTheDocument()
  })

  it("shows 'Перетащите задачи' when in project view with no filtered tasks", () => {
    const tasks = [makeTask()]
    render(
      <TaskList {...defaultProps} tasks={tasks} filteredTasks={[]} activeProjectId="p1" />
    )
    expect(screen.getByText(/перетащите задачи в этот проект/i)).toBeInTheDocument()
  })

  it("renders a TaskItem for each filtered task", () => {
    const tasks = [
      makeTask({ id: "t1", title: "First task" }),
      makeTask({ id: "t2", title: "Second task" }),
    ]
    render(<TaskList {...defaultProps} tasks={tasks} filteredTasks={tasks} />)
    const items = screen.getAllByTestId("task-item")
    expect(items).toHaveLength(2)
    expect(screen.getByText("First task")).toBeInTheDocument()
    expect(screen.getByText("Second task")).toBeInTheDocument()
  })

  it("renders only filteredTasks, not all tasks", () => {
    const all = [
      makeTask({ id: "t1", title: "Visible" }),
      makeTask({ id: "t2", title: "Hidden" }),
    ]
    const filtered = [all[0]]
    render(<TaskList {...defaultProps} tasks={all} filteredTasks={filtered} />)
    expect(screen.getByText("Visible")).toBeInTheDocument()
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument()
  })

  it("renders list with correct ul id", () => {
    const task = makeTask()
    render(<TaskList {...defaultProps} tasks={[task]} filteredTasks={[task]} />)
    expect(document.getElementById("task-list")).toBeInTheDocument()
  })
})
