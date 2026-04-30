"use client"
import { useState } from "react"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

const MOOD_EMOJI: Record<string, string> = {
  energized: "⚡",
  neutral: "😐",
  tired: "😴",
}

function last30UtcDays(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    days.push(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    )
  }
  return days
}

function Heatmap({ logDates }: { logDates: Set<string> }) {
  const days = last30UtcDays()
  return (
    <div className="flex flex-wrap gap-0.5" aria-label="30-дневный график">
      {days.map((d) => {
        const key = d.toISOString().slice(0, 10)
        return (
          <div
            key={key}
            title={key}
            className={`w-3 h-3 rounded-sm ${
              logDates.has(key) ? "bg-purple-500" : "bg-gray-100"
            }`}
          />
        )
      })}
    </div>
  )
}

export function HabitCard({ habit }: { habit: Task }) {
  const [expanded, setExpanded] = useState(false)
  const { data: logs = [] } = useHabitLogs(expanded ? habit.id : "")

  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = expanded
    ? computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
    : null

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left flex items-center justify-between"
      >
        <span className="font-medium">{habit.title}</span>
        <span className="text-xs text-gray-400">
          {habit.recurrence === "daily"
            ? "ежедневно"
            : habit.recurrence === "weekly"
            ? "еженедельно"
            : "ежемесячно"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <Heatmap logDates={logDates} />

          <div className="flex items-center gap-4 text-sm">
            {habit.recurrence === "daily" && stats && (
              <span className="text-orange-500">🔥 Серия: {stats.streak} дн.</span>
            )}
            {stats && (
              <span className="text-gray-600">
                Выполнение: {Math.round(stats.completionRate * 100)}%
              </span>
            )}
          </div>

          {stats && stats.moodTrend.length > 0 && (
            <div className="flex gap-1" aria-label="Тренд настроения">
              {stats.moodTrend.map((mood, i) => (
                <span key={i} title={mood}>
                  {MOOD_EMOJI[mood] ?? mood}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
