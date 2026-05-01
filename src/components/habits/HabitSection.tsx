"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, ChevronUp, Flame } from "lucide-react"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import { ReflectionModal } from "@/components/tasks/ReflectionModal"
import type { Task } from "@/types"

type Props = {
  habits: Task[]
  isOpen: boolean
  onToggle: () => void
  onHabitToggle: (task: Task) => void
}

function last7UtcDays(): string[] {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (6 - i)))
    return d.toISOString().slice(0, 10)
  })
}

const DAYS = last7UtcDays()

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
  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = useMemo(
    () => computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt)),
    [logs, habit.recurrence, habit.createdAt]
  )

  return (
    <div className="flex items-center gap-3 py-2.5">
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

      <span className="flex-1 text-sm truncate">{habit.title}</span>

      <div className="flex gap-0.5 flex-shrink-0" aria-label="Последние 7 дней">
        {DAYS.map((key) => (
          <div
            key={key}
            className={`w-3 h-3 rounded-sm ${logDates.has(key) ? "bg-purple-400" : "bg-gray-100"}`}
          />
        ))}
      </div>

      {habit.recurrence === "daily" && stats.streak > 0 && (
        <span className="text-xs text-orange-500 font-medium flex-shrink-0">
          🔥{stats.streak}
        </span>
      )}

      <Link href="/habits" className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0">
        →
      </Link>
    </div>
  )
}

export function HabitSection({ habits, isOpen, onToggle, onHabitToggle }: Props) {
  const [reflectionTaskId, setReflectionTaskId] = useState<string | null>(null)

  if (habits.length === 0) return null

  return (
    <>
      <div className="mb-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
        >
          <Flame className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 flex-1">Привычки</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600"
          >
            {habits.length}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <div className="mt-2 bg-white rounded-xl shadow-sm px-3 divide-y divide-gray-50 animate-expand">
            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onToggle={onHabitToggle}
                onRequestReflection={setReflectionTaskId}
              />
            ))}
            <div className="py-2">
              <Link href="/habits" className="text-xs text-purple-500 hover:text-purple-700">
                Все привычки →
              </Link>
            </div>
          </div>
        )}
      </div>

      {reflectionTaskId && (
        <ReflectionModal
          taskId={reflectionTaskId}
          isHabit
          onClose={() => setReflectionTaskId(null)}
        />
      )}
    </>
  )
}
