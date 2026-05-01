"use client"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

const MOOD_EMOJI: Record<string, string> = {
  energized: "⚡",
  neutral: "😐",
  tired: "😴",
}

const RECURRENCE_LABEL: Record<string, string> = {
  daily: "ежедневно",
  weekly: "еженедельно",
  monthly: "ежемесячно",
}

function utcDays(count: number): string[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (count - 1 - i)))
    return d.toISOString().slice(0, 10)
  })
}

function MiniHeatmap({ logDates }: { logDates: Set<string> }) {
  const days = utcDays(14)
  return (
    <div className="flex gap-0.5" aria-label="14-дневный мини-график">
      {days.map((key) => (
        <div
          key={key}
          title={key}
          className={`w-3 h-3 rounded-sm ${logDates.has(key) ? "bg-purple-400" : "bg-gray-100"}`}
        />
      ))}
    </div>
  )
}

function FullHeatmap({ logDates }: { logDates: Set<string> }) {
  const days = utcDays(30)
  return (
    <div className="flex flex-wrap gap-0.5" aria-label="30-дневный график">
      {days.map((key) => (
        <div
          key={key}
          title={key}
          className={`w-3 h-3 rounded-sm ${logDates.has(key) ? "bg-purple-500" : "bg-gray-100"}`}
        />
      ))}
    </div>
  )
}

export function HabitCard({ habit }: { habit: Task }) {
  const [expanded, setExpanded] = useState(false)
  const { data: logs = [] } = useHabitLogs(habit.id)

  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = expanded
    ? computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
    : null

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-4"
        aria-label={habit.title}
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{habit.title}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {RECURRENCE_LABEL[habit.recurrence ?? ""] ?? habit.recurrence}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
        <MiniHeatmap logDates={logDates} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          <FullHeatmap logDates={logDates} />

          <div className="flex items-center gap-4 text-sm">
            {habit.recurrence === "daily" && stats && stats.streak > 0 && (
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
