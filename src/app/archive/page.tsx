"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft } from "lucide-react"
import { useTasks } from "@/hooks/useTasks"
import { TaskSkeleton } from "@/components/tasks/TaskSkeleton"
import { BurgerMenu } from "@/components/BurgerMenu"

export default function ArchivePage() {
  const { status } = useSession()
  const router = useRouter()
  const { tasks, isLoading, error, deleteTask, restoreTask, clearArchive } =
    useTasks({ done: true, sort: "createdAt_desc" })
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  if (status === "loading") {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-24 md:pb-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/tasks"
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700"
            aria-label="Назад к задачам"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Архив</h1>
        </div>
        <BurgerMenu />
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {tasks.length > 0 && (
        <div className="mb-4">
          {!confirmClear ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Очистить архив
            </button>
          ) : (
            <span className="text-sm">
              Удалить все выполненные задачи?{" "}
              <button
                onClick={async () => {
                  await clearArchive()
                  setConfirmClear(false)
                }}
                className="text-red-600 font-medium hover:underline"
              >
                Да, удалить
              </button>
              {" · "}
              <button
                onClick={() => setConfirmClear(false)}
                className="text-gray-500 hover:underline"
              >
                Отмена
              </button>
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <TaskSkeleton />
      ) : tasks.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">
          Выполненных задач нет
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 line-through truncate">
                  {task.title}
                </p>
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 rounded-full text-xs text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => restoreTask(task.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded border border-blue-200 hover:border-blue-400"
                >
                  Восстановить
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded border border-red-200 hover:border-red-400"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
