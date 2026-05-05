"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useHabitLogs, useToggleHabitLog } from "@/hooks/useHabitLogs"
import { utcDays } from "@/hooks/habitUtils"
import { useUTCDate } from "@/hooks/useUTCDate"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

function weekCounterLabel(count: number, isCurrent: boolean, target: number): { text: string; cls: string } {
  if (isCurrent) return { text: count > 0 ? `${count}…` : "", cls: "text-gray-400" }
  if (count >= target) return { text: `✓${target}`, cls: "text-green-600 font-semibold" }
  if (count > 0) return { text: `${count}/${target}`, cls: "text-amber-500" }
  return { text: `0/${target}`, cls: "text-red-400" }
}

const MOOD_EMOJI: Record<string, string> = {
  energized: "⚡",
  neutral: "😐",
  tired: "😴",
}

export function HabitCard({ habit }: { habit: Task }) {
  const [expanded, setExpanded] = useState(false)
  const { data: logs = [] } = useHabitLogs(habit.id)
  const { mutate: toggleLog } = useToggleHabitLog(habit.id)

  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = useMemo(
    () => computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt), habit.weeklyTarget ?? undefined),
    [logs, habit.recurrence, habit.createdAt, habit.weeklyTarget]
  )

  const handleToggle = (date: string) =>
    toggleLog({ date, isCurrentlyLogged: logDates.has(date) })

  useUTCDate()
  const miniDays = utcDays(7)
  const fullDays = utcDays(30)
  const today = miniDays[miniDays.length - 1]
  const streakLabel =
    habit.recurrence === "daily" && stats.streak > 0 ? `🔥${stats.streak}` : ""
  const moodEmoji =
    stats.moodTrend.length > 0
      ? MOOD_EMOJI[stats.moodTrend[stats.moodTrend.length - 1]] ?? null
      : null

  const showWeeklyCounters = (habit.weeklyTarget ?? 0) > 1
  const target = habit.weeklyTarget ?? 1

  // Count logs in the current Mon–Sun calendar week
  const currentWeekCount = useMemo(() => {
    if (!showWeeklyCounters) return null
    const todayDate = new Date(today + "T00:00:00.000Z")
    const mondayOffset = (todayDate.getUTCDay() + 6) % 7 // days since Monday
    let count = 0
    for (let i = 0; i <= mondayOffset; i++) {
      const d = new Date(todayDate)
      d.setUTCDate(d.getUTCDate() - mondayOffset + i)
      if (logDates.has(d.toISOString().slice(0, 10))) count++
    }
    return count
  }, [today, logDates, showWeeklyCounters])

  // 30-day grid grouped into rows of 7
  const weekRows = useMemo(() => {
    if (!showWeeklyCounters) return null
    const rows: { days: string[]; count: number }[] = []
    for (let i = 0; i < fullDays.length; i += 7) {
      const rowDays = fullDays.slice(i, i + 7)
      const count = rowDays.filter((d) => logDates.has(d)).length
      rows.push({ days: rowDays, count })
    }
    return rows
  }, [fullDays, logDates, showWeeklyCounters])

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Link
          href={`/habits/${habit.id}`}
          className="flex-1 font-medium text-sm truncate hover:text-purple-600 transition-colors"
        >
          {habit.title}
        </Link>

        <span className="w-9 text-right text-xs font-bold text-orange-500 flex-shrink-0">
          {streakLabel}
        </span>

        {/* 7-cell mini heatmap */}
        <div className="flex gap-0.5 flex-shrink-0" aria-label="Последние 7 дней">
          {miniDays.map((key) => (
            <button
              key={key}
              title={key}
              onClick={() => handleToggle(key)}
              className={`w-4 h-4 rounded transition-colors cursor-pointer ${
                logDates.has(key)
                  ? "bg-purple-600 hover:bg-purple-500"
                  : "bg-purple-100 hover:bg-purple-200"
              } ${key === today ? "ring-2 ring-purple-200" : ""}`}
              aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
            />
          ))}
        </div>

        {/* Weekly counter for current week */}
        {showWeeklyCounters && currentWeekCount !== null && (
          <span
            className={`text-xs font-medium flex-shrink-0 min-w-[24px] text-center ${
              currentWeekCount >= target
                ? "text-green-600"
                : currentWeekCount > 0
                ? "text-amber-500"
                : "text-gray-300"
            }`}
            aria-label={`текущая неделя: ${currentWeekCount} из ${target}`}
          >
            {currentWeekCount >= target ? `✓${target}` : currentWeekCount > 0 ? `${currentWeekCount}/${target}` : ""}
          </span>
        )}

        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          aria-expanded={expanded}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pt-3 pb-4 space-y-3">
          {/* 30-day heatmap */}
          {showWeeklyCounters && weekRows ? (
            <div className="flex flex-col gap-1" aria-label="30-дневный график">
              {weekRows.map(({ days, count }, rowIdx) => {
                const isCurrent = rowIdx === weekRows.length - 1
                const { text, cls } = weekCounterLabel(count, isCurrent, target)
                return (
                  <div key={rowIdx} className="flex items-center gap-0.5">
                    {days.map((key) => (
                      <button
                        key={key}
                        title={key}
                        onClick={() => handleToggle(key)}
                        className={`w-4 h-4 rounded transition-colors cursor-pointer ${
                          logDates.has(key)
                            ? "bg-purple-600 hover:bg-purple-500"
                            : "bg-purple-100 hover:bg-purple-200"
                        } ${key === today ? "ring-2 ring-purple-200" : ""}`}
                        aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
                      />
                    ))}
                    <span className={`ml-1 text-xs ${cls}`}>{text}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-0.5" aria-label="30-дневный график">
              {fullDays.map((key) => (
                <button
                  key={key}
                  title={key}
                  onClick={() => handleToggle(key)}
                  className={`w-4 h-4 rounded transition-colors cursor-pointer ${
                    logDates.has(key)
                      ? "bg-purple-600 hover:bg-purple-500"
                      : "bg-purple-100 hover:bg-purple-200"
                  } ${key === today ? "ring-2 ring-purple-200" : ""}`}
                  aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
                />
              ))}
            </div>
          )}

          {/* Stat pills */}
          <div className="flex gap-2">
            <div
              data-testid="stat-completion"
              className="flex-1 bg-purple-50 border border-purple-100 rounded-lg py-1.5 text-center"
            >
              <div className="text-base font-bold text-purple-600">
                {Math.round(stats.completionRate * 100)}%
              </div>
              <div className="text-xs text-gray-400">за 30 дней</div>
            </div>

            {habit.recurrence === "daily" && stats.streak > 0 && (
              <div
                data-testid="stat-streak"
                className="flex-1 bg-purple-50 border border-purple-100 rounded-lg py-1.5 text-center"
              >
                <div className="text-base font-bold text-orange-500">🔥{stats.streak}</div>
                <div className="text-xs text-gray-400">стрик</div>
              </div>
            )}

            {moodEmoji && (
              <div
                data-testid="stat-mood"
                className="flex-1 bg-purple-50 border border-purple-100 rounded-lg py-1.5 text-center"
              >
                <div className="text-base font-bold">{moodEmoji}</div>
                <div className="text-xs text-gray-400">настроение</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
