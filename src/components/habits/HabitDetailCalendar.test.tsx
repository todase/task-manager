// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { HabitDetailCalendar } from "./HabitDetailCalendar"
import type { HabitLog } from "@/types"

// Pin date to 2026-05-02 (Saturday, week starts Monday)
const FIXED_NOW = new Date("2026-05-02T12:00:00.000Z")
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

const mockScrollIntoView = vi.fn()
window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView

function makeLog(date: string, withReflection = false): HabitLog {
  return {
    id: `log-${date}`,
    taskId: "h1",
    date: `${date}T00:00:00.000Z`,
    reflection: withReflection
      ? { mood: "energized", difficulty: 1 }
      : null,
  }
}

describe("HabitDetailCalendar", () => {
  it("renders current month name", () => {
    render(<HabitDetailCalendar logs={[]} />)
    expect(screen.getByText(/май 2026/i)).toBeInTheDocument()
  })

  it("renders 7 day-of-week headers starting with Пн", () => {
    render(<HabitDetailCalendar logs={[]} />)
    const headers = screen.getAllByRole("columnheader")
    expect(headers[0]).toHaveTextContent("Пн")
    expect(headers[6]).toHaveTextContent("Вс")
  })

  it("marks a logged day as done", () => {
    render(<HabitDetailCalendar logs={[makeLog("2026-05-01")]} />)
    const cell = screen.getByRole("button", { name: "1 мая" })
    expect(cell).toHaveClass("bg-purple-600")
  })

  it("marks today with ring", () => {
    render(<HabitDetailCalendar logs={[]} />)
    const cell = screen.getByRole("button", { name: "2 мая" })
    expect(cell).toHaveClass("ring-2")
  })

  it("shows yellow dot on days with reflection", () => {
    render(<HabitDetailCalendar logs={[makeLog("2026-05-01", true)]} />)
    const dot = screen.getByTestId("reflection-dot-2026-05-01")
    expect(dot).toBeInTheDocument()
  })

  it("prev button navigates to April", () => {
    render(<HabitDetailCalendar logs={[]} />)
    fireEvent.click(screen.getByRole("button", { name: /предыдущий месяц/i }))
    expect(screen.getByText(/апрель 2026/i)).toBeInTheDocument()
  })

  it("next button is disabled in current month", () => {
    render(<HabitDetailCalendar logs={[]} />)
    expect(screen.getByRole("button", { name: /следующий месяц/i })).toBeDisabled()
  })

  it("prev button is disabled at 90-day boundary (Feb 2026)", () => {
    render(<HabitDetailCalendar logs={[]} />)
    // Navigate back: May → Apr → Mar → Feb (3 clicks)
    const prev = screen.getByRole("button", { name: /предыдущий месяц/i })
    fireEvent.click(prev)
    fireEvent.click(prev)
    fireEvent.click(prev)
    expect(screen.getByText(/февраль 2026/i)).toBeInTheDocument()
    expect(prev).toBeDisabled()
  })

  it("renders a missed day as a button (for accessibility)", () => {
    render(<HabitDetailCalendar logs={[]} />)
    // May 3 is not today (today = May 2) and not logged → missed day
    const cell = screen.getByRole("button", { name: "3 мая" })
    expect(cell).toBeDisabled()
  })

  it("does not call onDateClick when done cell has no reflection", () => {
    const onDateClick = vi.fn()
    render(
      <HabitDetailCalendar
        logs={[makeLog("2026-05-01", false)]}
        onDateClick={onDateClick}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "1 мая" }))
    expect(onDateClick).not.toHaveBeenCalled()
  })

  it("calls onDateClick with date string when clicking a done cell", () => {
    const onDateClick = vi.fn()
    render(
      <HabitDetailCalendar
        logs={[makeLog("2026-05-01", true)]}
        onDateClick={onDateClick}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "1 мая" }))
    expect(onDateClick).toHaveBeenCalledWith("2026-05-01")
  })
})

describe("HabitDetailCalendar — weekly target counters", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Saturday 2026-05-02: May starts on Fri, so row 0 is Apr 28(Mon)–May 3(Sun)
    vi.setSystemTime(new Date("2026-05-02T12:00:00.000Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it("does not render counter column when weeklyTarget is not set", () => {
    render(<HabitDetailCalendar logs={[]} />)
    expect(screen.queryByLabelText(/неделя 1/i)).not.toBeInTheDocument()
  })

  it("does not render counter column when weeklyTarget is 1", () => {
    render(<HabitDetailCalendar logs={[]} weeklyTarget={1} />)
    expect(screen.queryByLabelText(/неделя 1/i)).not.toBeInTheDocument()
  })

  it("renders current week counter when week has logs and target is 3", () => {
    // May 2026: row 0 = cells[0..6], where May 1 (Fri) is at index 4.
    // May 1 and May 2 are in row 0 which contains today (May 2) → current week
    const logs = [
      makeLog("2026-05-01"),
      makeLog("2026-05-02"),
    ]
    render(<HabitDetailCalendar logs={logs} weeklyTarget={3} />)
    // 2 logs in current (incomplete) week → "2…"
    expect(screen.getByLabelText(/неделя 1: 2…/i)).toBeInTheDocument()
  })

  it("renders 0/3 for past week with no logs", () => {
    // Navigate to previous month (April) so May 2 is not in view
    render(<HabitDetailCalendar logs={[]} weeklyTarget={3} />)
    fireEvent.click(screen.getByRole("button", { name: /предыдущий месяц/i }))
    // April week 1 (Mar 30–Apr 5): no logs, past week → 0/3
    expect(screen.getByLabelText(/неделя 1: 0\/3/i)).toBeInTheDocument()
  })
})
