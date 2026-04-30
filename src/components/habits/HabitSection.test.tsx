// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { HabitSection } from "./HabitSection"

vi.mock("@/hooks/useHabitLogs", () => ({
  useHabitLogs: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
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
      <HabitSection habits={[]} onToggle={vi.fn()} onRequestReflection={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("shows Привычки header with count badge", () => {
    render(
      <HabitSection habits={[habit]} onToggle={vi.fn()} onRequestReflection={vi.fn()} />
    )
    expect(screen.getByText("Привычки")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("toggles collapsed state on header click", () => {
    render(
      <HabitSection habits={[habit]} onToggle={vi.fn()} onRequestReflection={vi.fn()} />
    )
    expect(screen.getByText("Morning run")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Привычки"))
    expect(screen.queryByText("Morning run")).not.toBeInTheDocument()
  })

  it("calls onToggle and onRequestReflection when checkbox clicked on undone habit", () => {
    const onToggle = vi.fn()
    const onRequestReflection = vi.fn()
    render(
      <HabitSection
        habits={[habit]}
        onToggle={onToggle}
        onRequestReflection={onRequestReflection}
      />
    )
    fireEvent.click(screen.getByLabelText("Отметить привычку: Morning run"))
    expect(onToggle).toHaveBeenCalledWith(habit)
    expect(onRequestReflection).toHaveBeenCalledWith("h1")
  })

  it("does not call onRequestReflection when habit is already done", () => {
    const onRequestReflection = vi.fn()
    render(
      <HabitSection
        habits={[{ ...habit, done: true }]}
        onToggle={vi.fn()}
        onRequestReflection={onRequestReflection}
      />
    )
    fireEvent.click(screen.getByLabelText("Отметить привычку: Morning run"))
    expect(onRequestReflection).not.toHaveBeenCalled()
  })
})
