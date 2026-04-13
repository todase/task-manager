"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"

type Task = {
  id: string
  title: string
  done: boolean
}

type Project = {
  id: string
  title: string
  tasks: Task[]
}

export default function ProjectsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState("")
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") fetchProjects()
  }, [status])

  async function fetchProjects() {
    const res = await fetch("/api/projects")
    const data = await res.json()
    setProjects(data)
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    const project = await res.json()
    setProjects([{ ...project, tasks: [] }, ...projects])
    setTitle("")
  }

  async function deleteProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    setProjects(projects.filter((p) => p.id !== id))
  }

  async function addTask(e: React.FormEvent, projectId: string) {
    e.preventDefault()
    const taskTitle = newTaskTitles[projectId]
    if (!taskTitle?.trim()) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, projectId }),
    })
    const task = await res.json()
    setProjects(projects.map((p) =>
      p.id === projectId ? { ...p, tasks: [task, ...p.tasks] } : p
    ))
    setNewTaskTitles({ ...newTaskTitles, [projectId]: "" })
  }

  async function toggleTask(projectId: string, task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    })
    const updated = await res.json()
    setProjects(projects.map((p) =>
      p.id === projectId
        ? { ...p, tasks: p.tasks.map((t) => (t.id === updated.id ? updated : t)) }
        : p
    ))
  }

  async function deleteTask(projectId: string, taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
    setProjects(projects.map((p) =>
      p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p
    ))
  }

  if (status === "loading") return <p className="p-8">Загрузка...</p>

  return (
    <main className="max-w-xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Проекты</h1>
        <Link href="/tasks" className="text-sm text-blue-500 hover:text-blue-700">
          Все задачи
        </Link>
      </div>

      <form onSubmit={addProject} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Новый проект..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 rounded">
          Добавить
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {projects.map((project) => (
          <li key={project.id} className="border rounded">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setOpenProjectId(openProjectId === project.id ? null : project.id)}
                className="flex items-center gap-2 text-left"
              >
                <span className="text-gray-400">{openProjectId === project.id ? "▼" : "▶"}</span>
                <div>
                  <p className="font-medium">{project.title}</p>
                  <p className="text-sm text-gray-400">{project.tasks.length} задач</p>
                </div>
              </button>
              <button
                onClick={() => deleteProject(project.id)}
                className="text-sm text-red-400 hover:text-red-600"
              >
                Удалить
              </button>
            </div>

            {openProjectId === project.id && (
              <div className="px-4 pb-4 border-t pt-3">
                <ul className="flex flex-col gap-2 mb-3">
                  {project.tasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => toggleTask(project.id, task)}
                        />
                        <span className={task.done ? "line-through text-gray-400 text-sm" : "text-sm"}>
                          {task.title}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteTask(project.id, task.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>

                <form onSubmit={(e) => addTask(e, project.id)} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Новая задача..."
                    value={newTaskTitles[project.id] || ""}
                    onChange={(e) =>
                      setNewTaskTitles({ ...newTaskTitles, [project.id]: e.target.value })
                    }
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
