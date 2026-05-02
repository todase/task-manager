// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { HabitSection } from "./HabitSection"

vi.mock("@/hooks/useHabitLogs", () => ({
  useHabitLogs: vi.fn().mockReturnValue({ data: [] }),
  useToggleHabitLog: vi.fn().mockReturnValue({ mutate: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock("@/components/tasks/ReflectionModal", () => ({
  ReflectionModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="reflection-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

const habit = {
  id: "h1",
  title: "Morning run",
  done: false,
  recurrence: "daily",
  isHabit: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  dueDate: null,
  description: null,
  order: 0,
  project: null,
  subtasks: [],
  tags: [],
  priorityScore: 1,
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe("HabitSection", () => {
  it("renders null when habits list is empty", () => {
    const { container } = render(
      <HabitSection habits={[]} isOpen={false} onToggle={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("shows Привычки header with count badge", () => {
    render(<HabitSection habits={[habit]} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.getByText("Привычки")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("hides habit rows when isOpen is false", () => {
    render(<HabitSection habits={[habit]} isOpen={false} onToggle={vi.fn()} />)
    expect(screen.queryByText("Morning run")).not.toBeInTheDocument()
  })

  it("shows habit rows when isOpen is true", () => {
    render(<HabitSection habits={[habit]} isOpen={true} onToggle={vi.fn()} />)
    expect(screen.getByText("Morning run")).toBeInTheDocument()
  })

  it("calls onToggle when header is clicked", () => {
    const onToggle = vi.fn()
    render(<HabitSection habits={[habit]} isOpen={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByText("Привычки"))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("shows 7 heatmap cells per habit when open", () => {
    render(<HabitSection habits={[habit]} isOpen={true} onToggle={vi.fn()} />)
    const cells = screen.getAllByRole("button", { name: /отметить/ })
    expect(cells).toHaveLength(7)
  })

  it("shows reflection modal when today's cell is clicked and not yet logged", () => {
    render(<HabitSection habits={[habit]} isOpen={true} onToggle={vi.fn()} />)
    // today is the last cell (aria-label contains "отметить выполненным")
    const cells = screen.getAllByRole("button", { name: /отметить выполненным/ })
    fireEvent.click(cells[cells.length - 1])
    expect(screen.getByTestId("reflection-modal")).toBeInTheDocument()
  })

  it("closes reflection modal on close callback", () => {
    render(<HabitSection habits={[habit]} isOpen={true} onToggle={vi.fn()} />)
    const cells = screen.getAllByRole("button", { name: /отметить выполненным/ })
    fireEvent.click(cells[cells.length - 1])
    fireEvent.click(screen.getByText("Close"))
    expect(screen.queryByTestId("reflection-modal")).not.toBeInTheDocument()
  })
})
