"use client"
import { useRef, useMemo, useCallback, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useHabits } from "@/hooks/useHabits"
import { useHabitLogs } from "@/hooks/useHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import { HabitDetailCalendar } from "@/components/habits/HabitDetailCalendar"
import type { HabitLog } from "@/types"

const MOOD_EMOJI: Record<string, string> = {
  energized: "⚡",
  neutral: "😐",
  tired: "😴",
}

const MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
]

type ReflectionEntryProps = {
  log: HabitLog
  highlighted: boolean
  refCallback: (el: HTMLDivElement | null) => void
}

function ReflectionEntry({ log, highlighted, refCallback }: ReflectionEntryProps) {
  const date = new Date(log.date)
  const now = new Date()
  const isToday =
    date.getUTCDate() === now.getUTCDate() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCFullYear() === now.getUTCFullYear()
  const dateLabel = isToday
    ? `сегодня`
    : `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]}`

  return (
    <div
      ref={refCallback}
      className={[
        "px-4 py-3 border-b border-gray-50 last:border-b-0 transition-colors",
        highlighted ? "bg-purple-50 border-l-4 border-l-purple-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="text-xs text-gray-400 mb-1 font-medium">{dateLabel}</div>
      {log.reflection ? (
        <>
          <div className="flex gap-2 mt-1">
            {log.reflection.mood && (
              <span className="text-xs bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 text-purple-600">
                {MOOD_EMOJI[log.reflection.mood] ?? log.reflection.mood}
              </span>
            )}
            {log.reflection.difficulty && (
              <span className="text-xs bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 text-purple-600">
                {log.reflection.difficulty === 1
                  ? "легко"
                  : log.reflection.difficulty === 2
                  ? "средне"
                  : "сложно"}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-300 italic">нет рефлексии</p>
      )}
    </div>
  )
}

export default function HabitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 16: params is a Promise in client components — must unwrap with React.use()
  const { id } = use(params)
  const { data: habits = [], isLoading: habitsLoading } = useHabits()
  const habit = habits.find((h) => h.id === id)
  const { data: logs = [], isLoading: logsLoading } = useHabitLogs(id)

  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)

  const [calYear, setCalYear] = useState(() => { const n = new Date(); return n.getUTCFullYear() })
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return n.getUTCMonth() })

  const reflRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const stats = useMemo(() => {
    if (!habit) return null
    return computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
  }, [logs, habit])

  const stats90 = useMemo(() => {
    if (!habit || logs.length === 0) return 0
    const now = new Date()
    const ninetyDaysAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89)
    )
    const logsIn90d = logs.filter((l) => new Date(l.date) >= ninetyDaysAgo)
    return logsIn90d.length > 0
      ? Math.round((logsIn90d.length / 90) * 100)
      : 0
  }, [logs])

  const monthReflections = useMemo(() => {
    return logs
      .filter((l) => {
        if (!l.reflection) return false
        const d = new Date(l.date)
        return d.getUTCMonth() === calMonth && d.getUTCFullYear() === calYear
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [logs, calMonth, calYear])

  const handleDateClick = useCallback(
    (date: string) => {
      setHighlightedDate(date)
      const el = reflRefs.current[date]
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    },
    []
  )

  const handleMonthChange = useCallback((y: number, m: number) => {
    setCalYear(y)
    setCalMonth(m)
  }, [])

  if (habitsLoading) {
    return (
      <div className="flex justify-center items-center h-32 text-gray-400">
        Загрузка...
      </div>
    )
  }

  if (!habit) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <Link
          href="/habits"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Привычки
        </Link>
        <p className="text-gray-400">Привычка не найдена.</p>
      </main>
    )
  }

  const latestMood =
    stats && stats.moodTrend.length > 0
      ? MOOD_EMOJI[stats.moodTrend[stats.moodTrend.length - 1]] ?? null
      : null

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/habits"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="Назад к привычкам"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">{habit.title}</h1>
      </div>

      {/* Stat pills */}
      {!logsLoading && stats && (
        <div className="flex gap-2">
          {habit.recurrence === "daily" && stats.streak > 0 && (
            <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
              <div className="text-lg font-bold text-orange-500">🔥{stats.streak}</div>
              <div className="text-xs text-gray-400">стрик</div>
            </div>
          )}
          <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
            <div className="text-lg font-bold text-purple-600">
              {Math.round(stats.completionRate * 100)}%
            </div>
            <div className="text-xs text-gray-400">30 дней</div>
          </div>
          <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
            <div className="text-lg font-bold text-purple-600">{stats90}%</div>
            <div className="text-xs text-gray-400">90 дней</div>
          </div>
          {latestMood && (
            <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
              <div className="text-lg">{latestMood}</div>
              <div className="text-xs text-gray-400">настр.</div>
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      <HabitDetailCalendar
        logs={logs}
        onDateClick={handleDateClick}
        onMonthChange={handleMonthChange}
      />

      {/* Reflections list */}
      {monthReflections.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-50">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
              Рефлексии
            </span>
          </div>
          {monthReflections.map((log) => (
            <ReflectionEntry
              key={log.id}
              log={log}
              highlighted={highlightedDate === log.date.slice(0, 10)}
              refCallback={(el) => {
                reflRefs.current[log.date.slice(0, 10)] = el
              }}
            />
          ))}
        </div>
      )}

      {monthReflections.length === 0 && !logsLoading && (
        <p className="text-center text-sm text-gray-400 py-4">
          Нет рефлексий за этот месяц.
        </p>
      )}
    </main>
  )
}
