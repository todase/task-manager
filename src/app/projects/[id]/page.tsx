"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"

type Task = {
  id: string
  title: string
  done: boolean
}

export default function ProjectPage() {
  const { status } = useSession()
  const router = useRouter()
  const { id: projectId } = useParams<{ id: string }>()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projectTitle, setProjectTitle] = useState("")
  const [title, setTitle] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  async function fetchProject() {
    const res = await fetch(`/api/projects/${projectId}`)
    const data = await res.json()
    setProjectTitle(data.title)
    setTasks(data.tasks)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (status === "authenticated") fetchProject()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, projectId }),
    })
    const task = await res.json()
    setTasks([task, ...tasks])
    setTitle("")
  }

  async function toggleTask(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    })
    const updated = await res.json()
    setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    setTasks(tasks.filter((t) => t.id !== id))
  }

  if (status === "loading") return <p className="p-8">Загрузка...</p>

  return (
    <main className="max-w-xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/projects" className="text-sm text-gray-400 hover:text-gray-600">
            ← Проекты
          </Link>
          <h1 className="text-2xl font-bold mt-1">{projectTitle}</h1>
        </div>
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

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between border p-3 rounded">
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
            <button
              onClick={() => deleteTask(task.id)}
              className="text-sm text-red-400 hover:text-red-600"
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
