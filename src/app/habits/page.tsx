"use client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useHabits } from "@/hooks/useHabits"
import { HabitCard } from "@/components/habits/HabitCard"

export default function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits()

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
    <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
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
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} />
      ))}
    </main>
  )
}
