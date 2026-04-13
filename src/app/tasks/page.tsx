"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type Subtask = {
  id: string
  title: string
  done: boolean
}

type Task = {
  id: string
  title: string
  done: boolean
  subtasks: Subtask[]
}

export default function TasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState("")
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [subtaskTitle, setSubtaskTitle] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") fetchTasks()
  }, [status])

  async function fetchTasks() {
    const res = await fetch("/api/tasks")
    const data = await res.json()
    setTasks(data)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    const task = await res.json()
    setTasks([{ ...task, subtasks: [] }, ...tasks])
    setTitle("")
  }

  async function toggleTask(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    })
    const updated = await res.json()
    setTasks(tasks.map((t) => (t.id === updated.id ? { ...updated, subtasks: t.subtasks } : t)))
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    setTasks(tasks.filter((t) => t.id !== id))
  }

  async function addSubtask(e: React.FormEvent, taskId: string) {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: subtaskTitle }),
    })
    const subtask = await res.json()
    setTasks(tasks.map((t) =>
      t.id === taskId ? { ...t, subtasks: [...t.subtasks, subtask] } : t
    ))
    setSubtaskTitle("")
  }

  async function toggleSubtask(taskId: string, subtask: Subtask) {
    const res = await fetch(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !subtask.done }),
    })
    const updated = await res.json()
    setTasks(tasks.map((t) =>
      t.id === taskId
        ? { ...t, subtasks: t.subtasks.map((s) => (s.id === updated.id ? updated : s)) }
        : t
    ))
  }

  async function deleteSubtask(taskId: string, subtaskId: string) {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" })
    setTasks(tasks.map((t) =>
      t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t
    ))
  }

  if (status === "loading") return <p className="p-8">Загрузка...</p>

  return (
    <main className="max-w-xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Мои задачи</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Выйти
        </button>
      </div>

      <form onSubmit={addTask} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Новая задача..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 rounded">
          Добавить
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {tasks.map((task) => (
          <li key={task.id} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task)}
                />
                <span className={task.done ? "line-through text-gray-400" : ""}>
                  {task.title}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
                  className="text-sm text-blue-400 hover:text-blue-600"
                >
                  {openTaskId === task.id ? "Свернуть" : "Подзадачи"}
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-sm text-red-400 hover:text-red-600"
                >
                  Удалить
                </button>
              </div>
            </div>

            {openTaskId === task.id && (
              <div className="mt-3 pl-6">
                <ul className="flex flex-col gap-2 mb-2">
                  {task.subtasks.map((subtask) => (
                    <li key={subtask.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={subtask.done}
                          onChange={() => toggleSubtask(task.id, subtask)}
                        />
                        <span className={subtask.done ? "line-through text-gray-400 text-sm" : "text-sm"}>
                          {subtask.title}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteSubtask(task.id, subtask.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>

                <form onSubmit={(e) => addSubtask(e, task.id)} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Новая подзадача..."
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    className="border p-1 rounded text-sm flex-1"
                  />
                  <button type="submit" className="bg-blue-400 text-white px-3 rounded text-sm">
                    +
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
