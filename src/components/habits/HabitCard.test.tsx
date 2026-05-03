// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { HabitCard } from "./HabitCard"

const mockUseHabitLogs = vi.fn()

vi.mock("@/hooks/useHabitLogs", () => ({
  useHabitLogs: (taskId: string) => mockUseHabitLogs(taskId),
  useToggleHabitLog: vi.fn().mockReturnValue({ mutate: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const TODAY = new Date()
const todayKey = new Date(
  Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate())
)
  .toISOString()
  .slice(0, 10)

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

beforeEach(() => {
  mockUseHabitLogs.mockReturnValue({ data: [] })
})
afterEach(cleanup)

describe("HabitCard", () => {
  it("renders habit title and is collapsed by default", () => {
    render(<HabitCard habit={habit} />)
    expect(screen.getByText("Morning run")).toBeInTheDocument()
    expect(screen.queryByLabelText("30-дневный график")).not.toBeInTheDocument()
  })

  it("habit name is a link to /habits/<id>", () => {
    render(<HabitCard habit={habit} />)
    const link = screen.getByRole("link", { name: "Morning run" })
    expect(link).toHaveAttribute("href", "/habits/h1")
  })

  it("shows 7 mini heatmap cells when collapsed", () => {
    render(<HabitCard habit={habit} />)
    const cells = screen.getAllByRole("button", { name: /отметить/ })
    expect(cells).toHaveLength(7)
  })

  it("expands on chevron click and shows 30-day heatmap", () => {
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByLabelText("30-дневный график")).toBeInTheDocument()
  })

  it("collapses again on second chevron click", () => {
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByLabelText("30-дневный график")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /свернуть/i }))
    expect(screen.queryByLabelText("30-дневный график")).not.toBeInTheDocument()
  })

  it("shows completion rate pill when expanded", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: null }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByTestId("stat-completion")).toBeInTheDocument()
  })

  it("shows streak pill for daily habit when expanded with streak", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: null }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByTestId("stat-streak")).toBeInTheDocument()
  })

  it("does not show streak pill for non-daily recurrence", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: null }],
    })
    render(<HabitCard habit={{ ...habit, recurrence: "weekly" }} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.queryByTestId("stat-streak")).not.toBeInTheDocument()
  })

  it("shows mood pill when expanded with mood data", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: { mood: "energized", difficulty: null } }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    expect(screen.getByTestId("stat-mood")).toBeInTheDocument()
  })
})
