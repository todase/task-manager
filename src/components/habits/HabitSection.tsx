"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Flame } from "lucide-react"
import { useHabitLogs, useToggleHabitLog } from "@/hooks/useHabitLogs"
import { utcDays } from "@/hooks/habitUtils"
import { computeHabitStats } from "@/hooks/habitStats"
import { ReflectionModal } from "@/components/tasks/ReflectionModal"
import type { Task } from "@/types"

type Props = {
  habits: Task[]
  isOpen: boolean
  onToggle: () => void
}

function HabitRow({ habit }: { habit: Task }) {
  const days = utcDays(7)
  const today = days[days.length - 1]
  const [showReflection, setShowReflection] = useState(false)
  const { data: logs = [] } = useHabitLogs(habit.id)
  const { mutate: toggleLog } = useToggleHabitLog(habit.id)
  const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
  const stats = useMemo(
    () => computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt)),
    [logs, habit.recurrence, habit.createdAt]
  )

  function handleCellClick(date: string) {
    const isCurrentlyLogged = logDates.has(date)
    toggleLog({ date, isCurrentlyLogged })
    if (!isCurrentlyLogged && date === today) {
      setShowReflection(true)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 py-2.5">
        <span className="flex-1 text-sm truncate">{habit.title}</span>

        <div className="flex gap-0.5 flex-shrink-0" aria-label="Последние 7 дней">
          {days.map((key) => (
            <button
              key={key}
              title={key}
              onClick={() => handleCellClick(key)}
              className={`w-3 h-3 rounded-sm transition-colors cursor-pointer ${
                logDates.has(key)
                  ? "bg-purple-400 hover:bg-purple-300"
                  : "bg-gray-100 hover:bg-purple-200"
              }`}
              aria-label={`${key}: ${logDates.has(key) ? "отметить невыполненным" : "отметить выполненным"}`}
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

      {showReflection && (
        <ReflectionModal
          taskId={habit.id}
          isHabit
          onClose={() => setShowReflection(false)}
        />
      )}
    </>
  )
}

export function HabitSection({ habits, isOpen, onToggle }: Props) {
  if (habits.length === 0) return null

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl bg-white shadow-sm hover:shadow transition-shadow"
      >
        <Flame className="w-4 h-4 text-purple-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 flex-1">Привычки</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
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
            <HabitRow key={habit.id} habit={habit} />
          ))}
          <div className="py-2">
            <Link href="/habits" className="text-xs text-purple-500 hover:text-purple-700">
              Все привычки →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
