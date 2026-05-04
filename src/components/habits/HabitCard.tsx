"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useHabitLogs, useToggleHabitLog } from "@/hooks/useHabitLogs"
import { utcDays } from "@/hooks/habitUtils"
import { useUTCDate } from "@/hooks/useUTCDate"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

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
    () => computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt)),
    [logs, habit.recurrence, habit.createdAt]
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

        {/* Fixed-width streak slot */}
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

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Свернуть" : "Развернуть"}
          aria-expanded={expanded}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pt-3 pb-4 space-y-3">
          {/* 30-day full heatmap */}
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
