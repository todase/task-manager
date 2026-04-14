"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useTasks, filterTasks } from "@/hooks/useTasks"
import { useProjects } from "@/hooks/useProjects"
import { TaskList } from "@/components/tasks/TaskList"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { ProjectTabs } from "@/components/projects/ProjectTabs"
import { DateFilters } from "@/components/filters/DateFilters"
import { BottomNav } from "@/components/BottomNav"
import type { DateFilter } from "@/types"

export default function TasksPage() {
  const { status } = useSession()
  const router = useRouter()
  const titleInputRef = useRef<HTMLInputElement>(null!)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")

  const taskHook = useTasks()
  const projectHook = useProjects()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      taskHook.fetchTasks()
      projectHook.fetchProjects()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragStart(_event: DragStartEvent) {}

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const projectTabIds = ["all", ...projectHook.projects.map((p) => p.id)]

    if (projectTabIds.includes(over.id as string)) {
      const projectId = over.id === "all" ? null : (over.id as string)
      const task = taskHook.tasks.find((t) => t.id === taskId)
      if (!task || task.project?.id === projectId) return
      const newProject = projectId
        ? (projectHook.projects.find((p) => p.id === projectId) ?? null)
        : null
      await taskHook.assignProject(taskId, projectId, newProject)
      return
    }

    if (active.id !== over.id) {
      const oldIndex = taskHook.tasks.findIndex((t) => t.id === active.id)
      const newIndex = taskHook.tasks.findIndex((t) => t.id === over.id)
      const newTasks = arrayMove(taskHook.tasks, oldIndex, newIndex)
      await taskHook.reorderTasks(newTasks)
    }
  }

  const filtered = filterTasks(taskHook.tasks, dateFilter, activeProjectId)

  if (status === "loading" || taskHook.isLoading) {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Мои задачи</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Выйти
          </button>
        </div>

        <ProjectTabs
          projects={projectHook.projects}
          activeProjectId={activeProjectId}
          onSelect={setActiveProjectId}
          onCreate={projectHook.createProject}
          onDelete={async (id) => {
            await projectHook.deleteProject(id)
            taskHook.removeProjectTasks(id)
            if (activeProjectId === id) setActiveProjectId(null)
          }}
          onRename={async (id, title) => {
            const updated = await projectHook.renameProject(id, title)
            taskHook.syncProjectRename(updated)
          }}
        />

        <DateFilters value={dateFilter} onChange={setDateFilter} />

        <AddTaskForm
          activeProjectId={activeProjectId}
          projects={projectHook.projects}
          inputRef={titleInputRef}
          onSubmit={(input) => taskHook.createTask(input, projectHook.projects)}
        />

        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
          activeProjectId={activeProjectId}
          dateFilter={dateFilter}
          onToggle={taskHook.toggleTask}
          onDelete={taskHook.deleteTask}
          onRename={taskHook.renameTask}
          onUpdateDueDate={taskHook.updateDueDate}
          onAddSubtask={taskHook.addSubtask}
          onToggleSubtask={taskHook.toggleSubtask}
          onDeleteSubtask={taskHook.deleteSubtask}
        />

        <BottomNav
          onAddClick={() => {
            titleInputRef.current?.focus()
            titleInputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }}
        />
      </main>
    </DndContext>
  )
}
