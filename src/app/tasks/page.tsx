"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut } from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useTasks, filterTasks } from "@/hooks/useTasks"
import { useProjects } from "@/hooks/useProjects"
import { useTags } from "@/hooks/useTags"
import { TaskList } from "@/components/tasks/TaskList"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { ProjectTabs } from "@/components/projects/ProjectTabs"
import { DateFilters } from "@/components/filters/DateFilters"
import { TagFilter } from "@/components/filters/TagFilter"
import type { DateFilter } from "@/types"

export default function TasksPage() {
  const { status } = useSession()
  const router = useRouter()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const taskHook = useTasks()
  const projectHook = useProjects()
  const tagHook = useTags()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      taskHook.fetchTasks()
      projectHook.fetchProjects()
      tagHook.fetchTags()
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

  const filtered = filterTasks(taskHook.tasks, dateFilter, activeProjectId).filter(
    (t) =>
      selectedTagIds.length === 0 ||
      selectedTagIds.some((id) => t.tags.some((tag) => tag.id === id))
  )

  if (status === "loading" || taskHook.isLoading) {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Мои задачи</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
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
          onUpdate={async (id, updates) => {
            const updated = await projectHook.updateProject(id, updates)
            if (updates.title) taskHook.syncProjectRename(updated)
          }}
        />

        <DateFilters value={dateFilter} onChange={setDateFilter} />

        <TagFilter
          tags={tagHook.tags}
          selectedIds={selectedTagIds}
          onChange={setSelectedTagIds}
        />

        <TaskList
          tasks={taskHook.tasks}
          filteredTasks={filtered}
          activeProjectId={activeProjectId}
          dateFilter={dateFilter}
          projects={projectHook.projects}
          onAssignProject={taskHook.assignProject}
          onToggle={taskHook.toggleTask}
          onDelete={taskHook.deleteTask}
          onRename={taskHook.renameTask}
          onUpdateDueDate={taskHook.updateDueDate}
          onUpdateDescription={taskHook.updateDescription}
          onUpdateTags={taskHook.updateTags}
          onAddSubtask={taskHook.addSubtask}
          onToggleSubtask={taskHook.toggleSubtask}
          onDeleteSubtask={taskHook.deleteSubtask}
        />

        <AddTaskForm
          activeProjectId={activeProjectId}
          projects={projectHook.projects}
          tags={tagHook.tags}
          onSubmit={(input) => taskHook.createTask(input, projectHook.projects)}
          onCreateTag={tagHook.createTag}
        />
      </main>
    </DndContext>
  )
}
