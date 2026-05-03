"use client"
import { useMemo } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useHabits } from "@/hooks/useHabits"
import { useAllHabitLogs } from "@/hooks/useAllHabitLogs"
import { computeHabitStats } from "@/hooks/habitStats"
import { computeHabitRate7d } from "@/hooks/summaryBar"
import { HabitCard } from "@/components/habits/HabitCard"
import type { Task, HabitLog } from "@/types"

type SummaryBarProps = {
  habits: Task[]
  logsByHabitId: Record<string, HabitLog[]>
  isLoading: boolean
}

function SummaryBar({ habits, logsByHabitId, isLoading }: SummaryBarProps) {
  const { avgRate7d, bestStreak } = useMemo(() => {
    if (isLoading || habits.length === 0) return { avgRate7d: null, bestStreak: null }

    let totalRate = 0
    let best = 0

    for (const habit of habits) {
      const logs = logsByHabitId[habit.id] ?? []
      const stats = computeHabitStats(logs, habit.recurrence ?? "", new Date(habit.createdAt))
      if (stats.streak > best) best = stats.streak

      totalRate += computeHabitRate7d(logs, habit.recurrence ?? "")
    }

    return {
      avgRate7d: Math.round((totalRate / habits.length) * 100),
      bestStreak: best,
    }
  }, [habits, logsByHabitId, isLoading])

  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
        <div className="text-lg font-bold text-purple-600">{habits.length}</div>
        <div className="text-xs text-gray-400">активных</div>
      </div>
      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
        <div className="text-lg font-bold text-purple-600">
          {isLoading || avgRate7d === null ? "—" : `${avgRate7d}%`}
        </div>
        <div className="text-xs text-gray-400">за 7 дней</div>
      </div>
      <div className="flex-1 bg-purple-50 border border-purple-100 rounded-xl py-2 text-center">
        <div className="text-lg font-bold text-purple-600">
          {isLoading || bestStreak === null ? "—" : bestStreak > 0 ? `🔥${bestStreak}` : "0"}
        </div>
        <div className="text-xs text-gray-400">лучший стрик</div>
      </div>
    </div>
  )
}

export default function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits()
  const { logsByHabitId, isLoading: logsLoading } = useAllHabitLogs(habits.map((h) => h.id))

  const sortedHabits = useMemo(() => {
    if (logsLoading) return habits
    return [...habits].sort((a, b) => {
      const statsA = computeHabitStats(
        logsByHabitId[a.id] ?? [],
        a.recurrence ?? "",
        new Date(a.createdAt)
      )
      const statsB = computeHabitStats(
        logsByHabitId[b.id] ?? [],
        b.recurrence ?? "",
        new Date(b.createdAt)
      )
      return statsB.completionRate - statsA.completionRate
    })
  }, [habits, logsByHabitId, logsLoading])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 text-gray-400">
        Загрузка...
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Задачи
        </Link>
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <p>Нет привычек.</p>
          <p className="text-sm">Создайте задачу с повторением и включите «Привычка».</p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/tasks"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
          aria-label="Назад к задачам"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">Привычки</h1>
      </div>

      <SummaryBar habits={sortedHabits} logsByHabitId={logsByHabitId} isLoading={logsLoading} />

      <div className="space-y-3">
        {sortedHabits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} />
        ))}
      </div>
    </main>
  )
}
