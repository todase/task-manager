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
  dueDate: string | null
  recurrence: string | null
  subtasks: Subtask[]
  project: { id: string; title: string } | null
}

type Project = {
  id: string
  title: string
}

export default function TasksPage() {
  const { status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [recurrence, setRecurrence] = useState("")
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [subtaskTitle, setSubtaskTitle] = useState("")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [newProjectTitle, setNewProjectTitle] = useState("")
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectTitle, setEditingProjectTitle] = useState("")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "someday">("all")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks()
      fetchProjects()
    }
  }, [status])

  async function fetchTasks() {
    const res = await fetch("/api/tasks")
    const data = await res.json()
    setTasks(data)
  }

  async function fetchProjects() {
    const res = await fetch("/api/projects")
    const data = await res.json()
    setProjects(data)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        ...(dueDate && { dueDate }),
        ...(recurrence && { recurrence }),
        ...(activeProjectId && { projectId: activeProjectId }),
      }),
    })
    const task = await res.json()
    setTasks([{ ...task, subtasks: [], project: projects.find((p) => p.id === task.projectId) || null }, ...tasks])
    setTitle("")
    setDueDate("")
    setRecurrence("")
  }

  async function toggleTask(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    })
    const updated = await res.json()
    setTasks(tasks.map((t) => (t.id === updated.id ? { ...updated, subtasks: t.subtasks, project: t.project } : t)))
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    setTasks(tasks.filter((t) => t.id !== id))
  }

  async function renameTask(task: Task) {
    if (!editingTitle.trim() || editingTitle === task.title) {
      setEditingTaskId(null)
      return
    }
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingTitle }),
    })
    const updated = await res.json()
    setTasks(tasks.map((t) => (t.id === updated.id ? { ...updated, subtasks: t.subtasks, project: t.project } : t)))
    setEditingTaskId(null)
  }

  async function updateDueDate(taskId: string, value: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate: value ? new Date(value).toISOString() : null }),
    })
    const updated = await res.json()
    setTasks(tasks.map((t) => (t.id === updated.id ? { ...updated, subtasks: t.subtasks, project: t.project } : t)))
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

  async function addProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectTitle.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newProjectTitle }),
    })
    const project = await res.json()
    setProjects([...projects, project])
    setNewProjectTitle("")
    setShowNewProject(false)
    setActiveProjectId(project.id)
  }

  async function deleteProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    setProjects(projects.filter((p) => p.id !== id))
    setTasks(tasks.filter((t) => t.project?.id !== id))
    if (activeProjectId === id) setActiveProjectId(null)
  }

  async function renameProject(id: string) {
    if (!editingProjectTitle.trim()) {
      setEditingProjectId(null)
      return
    }
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingProjectTitle }),
    })
    const updated = await res.json()
    setProjects(projects.map((p) => (p.id === updated.id ? updated : p)))
    setTasks(tasks.map((t) =>
      t.project?.id === updated.id ? { ...t, project: updated } : t
    ))
    setEditingProjectId(null)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  const filteredTasks = tasks.filter((t) => {
    if (activeProjectId && t.project?.id !== activeProjectId) return false

    if (dateFilter === "today") {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    }
    if (dateFilter === "week") {
      if (!t.dueDate) return false
      const d = new Date(t.dueDate)
      d.setHours(0, 0, 0, 0)
      return d.getTime() > today.getTime() && d < weekEnd
    }
    if (dateFilter === "someday") {
      if (!t.dueDate) return true
      const d = new Date(t.dueDate)
      return d >= weekEnd
    }
    return true
  })

  if (status === "loading") return <p className="p-8">Загрузка...</p>

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Мои задачи</h1>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Выйти
        </button>
      </div>

      {/* Фильтр по проектам */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveProjectId(null)}
          className={`text-sm px-3 py-1 rounded-full border ${
            activeProjectId === null
              ? "bg-blue-500 text-white border-blue-500"
              : "text-gray-500 hover:border-gray-400"
          }`}
        >
          Все задачи
        </button>
        {projects.map((project) => (
          <div key={project.id} className="flex items-center gap-1">
            {editingProjectId === project.id ? (
              <input
                type="text"
                value={editingProjectTitle}
                onChange={(e) => setEditingProjectTitle(e.target.value)}
                onBlur={() => renameProject(project.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameProject(project.id)
                  if (e.key === "Escape") setEditingProjectId(null)
                }}
                className="border p-1 rounded text-sm w-32"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setActiveProjectId(project.id)}
                onDoubleClick={() => {
                  setEditingProjectId(project.id)
                  setEditingProjectTitle(project.title)
                }}
                className={`text-sm px-3 py-1 rounded-full border ${
                  activeProjectId === project.id
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-gray-500 hover:border-gray-400"
                }`}
              >
                {project.title}
              </button>
            )}
            {activeProjectId === project.id && editingProjectId !== project.id && (
              <button
                onClick={() => deleteProject(project.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {showNewProject ? (
          <form onSubmit={addProject} className="flex gap-1">
            <input
              type="text"
              placeholder="Название проекта..."
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              className="border p-1 rounded text-sm"
              autoFocus
              onBlur={() => { if (!newProjectTitle) setShowNewProject(false) }}
            />
            <button type="submit" className="text-sm bg-blue-500 text-white px-2 rounded">+</button>
          </form>
        ) : (
          <button
            onClick={() => setShowNewProject(true)}
            className="text-sm px-3 py-1 rounded-full border border-dashed text-gray-400 hover:text-gray-600"
          >
            + проект
          </button>
        )}
      </div>

      {/* Фильтр по дате */}
      <div className="flex gap-2 mb-6">
        {(["all", "today", "week", "someday"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setDateFilter(filter)}
            className={`text-sm px-3 py-1 rounded-full border ${
              dateFilter === filter
                ? "bg-gray-700 text-white border-gray-700"
                : "text-gray-500 hover:border-gray-400"
            }`}
          >
            {{ all: "Все", today: "Сегодня", week: "Неделя", someday: "Когда-нибудь" }[filter]}
          </button>
        ))}
      </div>

      {/* Форма добавления задачи */}
      <form onSubmit={addTask} className="flex flex-col gap-2 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={activeProjectId ? `Задача в «${projects.find(p => p.id === activeProjectId)?.title}»...` : "Новая задача..."}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 rounded">
            Добавить
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500 flex-1"
          />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500"
          >
            <option value="">Не повторять</option>
            <option value="daily">Каждый день</option>
            <option value="weekly">Каждую неделю</option>
            <option value="monthly">Каждый месяц</option>
          </select>
        </div>
      </form>

      {/* Список задач */}
      <ul className="flex flex-col gap-3">
        {filteredTasks.map((task) => (
          <li key={task.id} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task)}
                />
                {!activeProjectId && task.project && (
                  <span className="text-xs text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
                    {task.project.title}
                  </span>
                )}
                {editingTaskId === task.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => renameTask(task)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameTask(task)
                      if (e.key === "Escape") setEditingTaskId(null)
                    }}
                    className="border p-1 rounded text-sm"
                    autoFocus
                  />
                ) : (
                  <span
                    className={task.done ? "line-through text-gray-400" : ""}
                    onDoubleClick={() => {
                      setEditingTaskId(task.id)
                      setEditingTitle(task.title)
                    }}
                  >
                    {task.title}
                  </span>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  id={`date-${task.id}`}
                  defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => updateDueDate(task.id, e.target.value)}
                  className="sr-only"
                />
                {task.recurrence && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-400">
                    {{ daily: "↻ день", weekly: "↻ неделя", monthly: "↻ месяц" }[task.recurrence]}
                  </span>
                )}
                {task.dueDate ? (
                  <span
                    onClick={() => {
                      const el = document.getElementById(`date-${task.id}`) as HTMLInputElement
                      el?.showPicker()
                    }}
                    className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                      new Date(task.dueDate) < new Date() && !task.done
                        ? "text-red-500 bg-red-50"
                        : "text-gray-400 bg-gray-100"
                    }`}
                  >
                    {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const el = document.getElementById(`date-${task.id}`) as HTMLInputElement
                      el?.showPicker()
                    }}
                    className="text-xs text-gray-300 hover:text-gray-500"
                  >
                    + дата
                  </button>
                )}
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
