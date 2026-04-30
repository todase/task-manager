"use client"
import { useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, ChevronRight } from "lucide-react"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import type { Task } from "@/types"

type Props = {
  habits: Task[]
  onToggle: (task: Task) => void
  onRequestReflection: (taskId: string) => void
}

function last7UtcDays(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    days.push(d)
  }
  return days
}

function HabitRow({
  habit,
  onToggle,
  onRequestReflection,
}: {
  habit: Task
  onToggle: (task: Task) => void
  onRequestReflection: (taskId: string) => void
}) {
  const { data: logs = [] } = useHabitLogs(habit.id)
  const days = last7UtcDays()
  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))

  return (
    <div className="flex items-center gap-3 py-2">
      <button
        onClick={() => {
          onToggle(habit)
          if (!habit.done) onRequestReflection(habit.id)
        }}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          habit.done
            ? "border-purple-500 bg-purple-500"
            : "border-gray-300 hover:border-purple-400"
        }`}
        aria-label={`Отметить привычку: ${habit.title}`}
      >
        {habit.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      <span className="flex-1 text-sm">{habit.title}</span>

      {/* 7-day mini heatmap */}
      <div className="flex gap-0.5" aria-label="Последние 7 дней">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10)
          return (
            <div
              key={key}
              className={`w-3 h-3 rounded-sm ${
                logDates.has(key) ? "bg-purple-400" : "bg-gray-100"
              }`}
            />
          )
        })}
      </div>

      {/* Streak badge (daily only) */}
      {habit.recurrence === "daily" && stats.streak > 0 && (
        <span className="text-xs text-orange-500 font-medium">
          🔥{stats.streak}
        </span>
      )}

      <Link href="/habits" className="text-xs text-gray-400 hover:text-gray-600">
        →
      </Link>
    </div>
  )
}

export function HabitSection({ habits, onToggle, onRequestReflection }: Props) {
  const [open, setOpen] = useState(true)

  if (habits.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
      >
        {open ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span>Привычки</span>
        <span className="ml-1 text-xs bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5">
          {habits.length}
        </span>
      </button>

      {open && (
        <div className="pl-2 divide-y divide-gray-50">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              onToggle={onToggle}
              onRequestReflection={onRequestReflection}
            />
          ))}
          <div className="pt-2">
            <Link
              href="/habits"
              className="text-xs text-purple-500 hover:text-purple-700"
            >
              Все привычки →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
