"use client"
import { useState, useMemo, Fragment } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { HabitLog } from "@/types"

const MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
]
// Genitive forms for aria-labels ("1 мая", "2 апреля", etc.)
const MONTH_NAMES_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
]
const DOW = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

type Props = {
  logs: HabitLog[]
  weeklyTarget?: number
  onDateClick?: (date: string) => void
  /** Called whenever the user switches month. Parent uses this to sync the reflections list. */
  onMonthChange?: (year: number, month: number) => void
}

export function HabitDetailCalendar({ logs, weeklyTarget, onDateClick, onMonthChange }: Props) {
  const now = new Date()
  const todayStr = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10)

  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()

  // Oldest allowed month: 90 days back
  const earliest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89))
  const minYear = earliest.getUTCFullYear()
  const minMonth = earliest.getUTCMonth()

  const [viewYear, setViewYear] = useState(currentYear)
  const [viewMonth, setViewMonth] = useState(currentMonth)

  const atMax = viewYear === currentYear && viewMonth === currentMonth
  const atMin = viewYear === minYear && viewMonth === minMonth

  function prevMonth() {
    if (atMin) return
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1
    setViewYear(newYear)
    setViewMonth(newMonth)
    onMonthChange?.(newYear, newMonth)
  }

  function nextMonth() {
    if (atMax) return
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1
    setViewYear(newYear)
    setViewMonth(newMonth)
    onMonthChange?.(newYear, newMonth)
  }

  const logDates = useMemo(() => new Set(logs.map((l) => l.date.slice(0, 10))), [logs])
  const reflDates = useMemo(
    () => new Set(logs.filter((l) => l.reflection != null).map((l) => l.date.slice(0, 10))),
    [logs]
  )

  const cells = useMemo(() => {
    const firstDay = new Date(Date.UTC(viewYear, viewMonth, 1))
    const startOffset = (firstDay.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate()

    const result: Array<{ date: string | null; day: number | null }> = []
    for (let i = 0; i < startOffset; i++) result.push({ date: null, day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(viewYear, viewMonth, d)).toISOString().slice(0, 10)
      result.push({ date, day: d })
    }
    return result
  }, [viewYear, viewMonth])

  const showWeeklyCounters = weeklyTarget != null && weeklyTarget > 1

  // Per-row weekly counters (one entry per row of 7 cells)
  const weeklyCounters = useMemo(() => {
    if (!showWeeklyCounters) return []
    const numRows = Math.ceil(cells.length / 7)
    return Array.from({ length: numRows }, (_, rowIdx) => {
      const rowCells = cells.slice(rowIdx * 7, rowIdx * 7 + 7)
      const count = rowCells.filter((c) => c.date && logDates.has(c.date)).length
      // Row is current if it contains today or a future date (still in-progress)
      const isCurrent = rowCells.some((c) => c.date != null && c.date >= todayStr)
      return { count, isCurrent }
    })
  }, [cells, logDates, showWeeklyCounters, todayStr])

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`
  const gridCols = showWeeklyCounters ? "grid-cols-[repeat(7,1fr)_36px]" : "grid-cols-7"

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Nav row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <button
          onClick={prevMonth}
          disabled={atMin}
          aria-label="Предыдущий месяц"
          className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-700 capitalize">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={atMax}
          aria-label="Следующий месяц"
          className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className={`grid ${gridCols} px-3 pt-2 pb-1 gap-1`} role="row">
        {DOW.map((d) => (
          <div key={d} role="columnheader" className="text-center text-xs text-gray-400 font-semibold">
            {d}
          </div>
        ))}
        {showWeeklyCounters && <div />}
      </div>

      {/* Day cells + weekly counter cells */}
      <div className={`grid ${gridCols} gap-1 px-3 pb-3`}>
        {cells.map((cell, i) => {
          const rowIdx = Math.floor(i / 7)
          const colIdx = i % 7

          const cellEl = (() => {
            if (!cell.date) return <div key={`empty-${i}`} />
            const done = logDates.has(cell.date)
            const hasRefl = reflDates.has(cell.date)
            const isToday = cell.date === todayStr
            const ariaLabel = `${cell.day} ${MONTH_NAMES_GENITIVE[viewMonth]}`
            const cellClasses = [
              "relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
              done && hasRefl ? "bg-purple-600 text-white cursor-pointer hover:bg-purple-500"
                : done ? "bg-purple-600 text-white cursor-default"
                : "bg-gray-100 text-gray-300 cursor-default",
              isToday ? "ring-2 ring-purple-200" : "",
            ].filter(Boolean).join(" ")

            return (
              <button
                key={cell.date}
                onClick={() => done && hasRefl && onDateClick?.(cell.date!)}
                disabled={done ? !hasRefl : true}
                aria-label={ariaLabel}
                className={cellClasses}
              >
                {cell.day}
                {hasRefl && (
                  <span
                    data-testid={`reflection-dot-${cell.date}`}
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"
                  />
                )}
              </button>
            )
          })()

          // After last column of each row, inject counter cell
          if (colIdx === 6 && showWeeklyCounters) {
            const { count, isCurrent } = weeklyCounters[rowIdx] ?? { count: 0, isCurrent: false }
            const target = weeklyTarget!
            let counterText: string
            let counterClass: string
            if (isCurrent) {
              counterText = count > 0 ? `${count}…` : ""
              counterClass = "text-gray-400"
            } else if (count >= target) {
              counterText = `✓${target}`
              counterClass = "text-green-600 font-semibold"
            } else if (count > 0) {
              counterText = `${count}/${target}`
              counterClass = "text-amber-500"
            } else {
              counterText = `0/${target}`
              counterClass = "text-red-400"
            }

            return (
              <Fragment key={`row-${rowIdx}-counter`}>
                {cellEl}
                <div
                  className={`flex items-center justify-center text-xs ${counterClass}`}
                  aria-label={`неделя ${rowIdx + 1}: ${counterText}`}
                >
                  {counterText}
                </div>
              </Fragment>
            )
          }

          return cellEl
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 pb-3 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-600 inline-block" /> выполнено
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-100 inline-block" /> пропущено
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative inline-block w-3 h-3 rounded bg-purple-600">
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
          </span>
          рефлексия
        </span>
        {showWeeklyCounters && (
          <span className="flex items-center gap-1">
            <span className="text-green-600 font-semibold">✓N</span> — цель недели выполнена
          </span>
        )}
      </div>
    </div>
  )
}
