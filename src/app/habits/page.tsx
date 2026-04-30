"use client"
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
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
        <p>Нет привычек.</p>
        <p className="text-sm">Создайте задачу с повторением и включите «Привычка».</p>
      </div>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <h1 className="text-xl font-semibold mb-4">Привычки</h1>
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} />
      ))}
    </main>
  )
}
