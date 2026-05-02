"use client"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useHabitLogs, useToggleHabitLog } from "@/hooks/useHabitLogs"
import { utcDays } from "@/hooks/habitUtils"
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

function MiniHeatmap({
  logDates,
  onToggle,
}: {
  logDates: Set<string>
  onToggle: (date: string) => void
}) {
  const days = utcDays(14)
  return (
    <div className="flex gap-0.5" aria-label="14-дневный мини-график">
      {days.map((key) => (
        <button
          key={key}
          title={key}
          onClick={() => onToggle(key)}
          className={`w-3 h-3 rounded-sm transition-colors cursor-pointer ${
            logDates.has(key) ? "bg-purple-400 hover:bg-purple-300" : "bg-gray-100 hover:bg-purple-200"
          }`}
          aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
        />
      ))}
    </div>
  )
}

function FullHeatmap({
  logDates,
  onToggle,
}: {
  logDates: Set<string>
  onToggle: (date: string) => void
}) {
  const days = utcDays(30)
  return (
    <div className="flex flex-wrap gap-0.5" aria-label="30-дневный график">
      {days.map((key) => (
        <button
          key={key}
          title={key}
          onClick={() => onToggle(key)}
          className={`w-3 h-3 rounded-sm transition-colors cursor-pointer ${
            logDates.has(key) ? "bg-purple-500 hover:bg-purple-400" : "bg-gray-100 hover:bg-purple-200"
          }`}
          aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
        />
      ))}
    </div>
  )
}

export function HabitCard({ habit }: { habit: Task }) {
  const [expanded, setExpanded] = useState(false)
  const { data: logs = [] } = useHabitLogs(habit.id)
  const { mutate: toggleLog } = useToggleHabitLog(habit.id)

  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = expanded
    ? computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
    : null

  const handleToggle = (date: string) =>
    toggleLog({ date, isCurrentlyLogged: logDates.has(date) })

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full text-left mb-2"
          aria-label={habit.title}
          aria-expanded={expanded}
        >
          <div className="flex items-center justify-between">
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
        </button>
        <MiniHeatmap logDates={logDates} onToggle={handleToggle} />
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          <FullHeatmap logDates={logDates} onToggle={handleToggle} />

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
