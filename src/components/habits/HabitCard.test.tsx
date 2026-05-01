// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { HabitCard } from "./HabitCard"

const mockUseHabitLogs = vi.fn()

vi.mock("@/hooks/useHabitLogs", () => ({
  useHabitLogs: (taskId: string) => mockUseHabitLogs(taskId),
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

  it("always calls useHabitLogs with habitId to show mini heatmap", () => {
    render(<HabitCard habit={habit} />)
    expect(mockUseHabitLogs).toHaveBeenCalledWith("h1")
  })

  it("expands on click and shows heatmap", () => {
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByText("Morning run"))
    expect(screen.getByLabelText("30-дневный график")).toBeInTheDocument()
  })

  it("calls useHabitLogs with habit id when expanded", () => {
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByText("Morning run"))
    expect(mockUseHabitLogs).toHaveBeenCalledWith("h1")
  })

  it("collapses again on second click", () => {
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByText("Morning run"))
    expect(screen.getByLabelText("30-дневный график")).toBeInTheDocument()
    fireEvent.click(screen.getByText("Morning run"))
    expect(screen.queryByLabelText("30-дневный график")).not.toBeInTheDocument()
  })

  it("shows streak badge when expanded with log data", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z` }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByText("Morning run"))
    expect(screen.getByText(/Серия:/)).toBeInTheDocument()
  })

  it("shows completion rate when expanded", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z` }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByText("Morning run"))
    expect(screen.getByText(/Выполнение:/)).toBeInTheDocument()
  })

  it("shows mood trend when logs have mood data", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z`, reflection: { mood: "energized", difficulty: null } }],
    })
    render(<HabitCard habit={habit} />)
    fireEvent.click(screen.getByText("Morning run"))
    expect(screen.getByLabelText("Тренд настроения")).toBeInTheDocument()
  })

  it("does not show streak for non-daily recurrence", () => {
    mockUseHabitLogs.mockReturnValue({
      data: [{ id: "l1", date: `${todayKey}T00:00:00.000Z` }],
    })
    render(<HabitCard habit={{ ...habit, recurrence: "weekly" }} />)
    fireEvent.click(screen.getByText("Morning run"))
    expect(screen.queryByText(/Серия:/)).not.toBeInTheDocument()
  })
})
