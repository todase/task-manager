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
  estimatedMinutes: null,
  weeklyTarget: null,
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

describe("HabitCard — weekly target counter", () => {
  beforeEach(() => {
    mockUseHabitLogs.mockReturnValue({ data: [] })
  })
  afterEach(cleanup)

  it("does not show weekly counter for daily habits", () => {
    render(<HabitCard habit={habit} />)
    expect(screen.queryByLabelText(/текущая неделя/i)).not.toBeInTheDocument()
  })

  it("does not show weekly counter when weeklyTarget is 1", () => {
    render(<HabitCard habit={{ ...habit, recurrence: "weekly", weeklyTarget: 1 }} />)
    expect(screen.queryByLabelText(/текущая неделя/i)).not.toBeInTheDocument()
  })

  it("shows weekly counter when weeklyTarget > 1", () => {
    render(<HabitCard habit={{ ...habit, recurrence: "weekly", weeklyTarget: 3 }} />)
    expect(screen.getByLabelText(/текущая неделя: 0 из 3/i)).toBeInTheDocument()
  })

  it("shows 1/3 counter when one log exists in the current calendar week", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "1", taskId: "h1", date: `${todayKey}T00:00:00.000Z`, reflection: null }],
    })
    render(<HabitCard habit={{ ...habit, recurrence: "weekly", weeklyTarget: 3 }} />)
    expect(screen.getByLabelText(/текущая неделя: 1 из 3/i)).toBeInTheDocument()
  })

  it("shows grouped 30-day grid when weeklyTarget > 1 and expanded", () => {
    render(<HabitCard habit={{ ...habit, recurrence: "weekly", weeklyTarget: 3 }} />)
    fireEvent.click(screen.getByRole("button", { name: /развернуть/i }))
    const grid = screen.getByLabelText("30-дневный график")
    expect(grid).toBeInTheDocument()
    // Should have multiple row divs (not a flat wrap)
    expect(grid.children.length).toBeGreaterThan(1)
  })
})
