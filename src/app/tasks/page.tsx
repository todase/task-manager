"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner"
import { ArrowLeft } from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { useTasks, filterTasks } from "@/hooks/useTasks"
import { useProjects } from "@/hooks/useProjects"
import { useTags } from "@/hooks/useTags"
import { useHabits } from "@/hooks/useHabits"
import { TaskList } from "@/components/tasks/TaskList"
import { AddTaskForm } from "@/components/tasks/AddTaskForm"
import { ProjectTabs } from "@/components/projects/ProjectTabs"
import { DateFilters } from "@/components/filters/DateFilters"
import { TagFilter } from "@/components/filters/TagFilter"
import { HabitSection } from "@/components/habits/HabitSection"
import type { DateFilter, Task } from "@/types"
import { TaskDragPreview } from "@/components/tasks/TaskDragPreview"
import { BurgerMenu } from "@/components/BurgerMenu"
import { SearchInput } from "@/components/search/SearchInput"

export default function TasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [tagsOpen, setTagsOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [habitsOpen, setHabitsOpen] = useState(false)

  const taskHook = useTasks({ done: false, q: searchMode && debouncedQuery ? debouncedQuery : undefined })
  const projectHook = useProjects()
  const tagHook = useTags()
  const { data: habits = [] } = useHabits()

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 10 } })
  )

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (!searchMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDebouncedQuery("")
      return
    }
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchMode])

  function exitSearch() {
    setSearchMode(false)
    setSearchQuery("")
    setDebouncedQuery("")
  }

  function handleDragStart(event: DragStartEvent) {
    const task = taskHook.tasks.find((t) => t.id === event.active.id) ?? null
    setDraggingTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingTask(null)
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

  const filtered = searchMode
    ? taskHook.tasks
    : filterTasks(taskHook.tasks, dateFilter, activeProjectId).filter(
        (t) =>
          selectedTagIds.length === 0 ||
          selectedTagIds.some((id) => t.tags.some((tag) => tag.id === id))
      )

  if (status === "loading") {
    return <p className="p-8">Загрузка...</p>
  }

  return (
    <>
      <EmailVerificationBanner
        email={session?.user?.email}
        emailVerified={session?.user?.emailVerified}
      />
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <main className="max-w-2xl mx-auto px-4 py-6 md:p-8 pb-20">
        {/* ── Header — normal / search mode ── */}
        {searchMode ? (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={exitSearch}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
              aria-label="Выйти из поиска"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">Мои задачи</h1>
            <BurgerMenu onSearch={() => setSearchMode(true)} />
          </div>
        )}

        {/* ── Filters — скрыты в режиме поиска ── */}
        {!searchMode && (
          <>
            <DateFilters value={dateFilter} onChange={setDateFilter} />

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
              isOpen={projectsOpen}
              onToggle={() => setProjectsOpen((o) => !o)}
            />

            <TagFilter
              tags={tagHook.tags}
              selectedIds={selectedTagIds}
              onChange={setSelectedTagIds}
              isOpen={tagsOpen}
              onToggle={() => setTagsOpen((o) => !o)}
              onUpdate={tagHook.updateTag}
              onDelete={async (id) => {
                await tagHook.deleteTag(id)
                setSelectedTagIds((prev) => prev.filter((s) => s !== id))
              }}
            />

            <HabitSection
              habits={habits}
              isOpen={habitsOpen}
              onToggle={() => setHabitsOpen((o) => !o)}
            />
          </>
        )}

        {searchMode && searchQuery && (
          <p className="text-xs text-gray-400 mb-3 px-1">
            Результаты поиска для «{searchQuery}»
          </p>
        )}

        <div
          onClick={() => {
            setProjectsOpen(false)
            setTagsOpen(false)
            setHabitsOpen(false)
          }}
        >
          <TaskList
            tasks={taskHook.tasks}
            filteredTasks={filtered}
            activeProjectId={activeProjectId}
            dateFilter={dateFilter}
            isLoading={taskHook.isLoading}
            projects={projectHook.projects}
            onAssignProject={taskHook.assignProject}
            onToggle={taskHook.toggleTask}
            onDelete={taskHook.deleteTask}
            onRename={taskHook.renameTask}
            onUpdateDueDate={taskHook.updateDueDate}
            onUpdateDescription={taskHook.updateDescription}
            onUpdateTags={taskHook.updateTags}
            tags={tagHook.tags}
            onCreateTag={tagHook.createTag}
            onAddSubtask={taskHook.addSubtask}
            onToggleSubtask={taskHook.toggleSubtask}
            onDeleteSubtask={taskHook.deleteSubtask}
          />

          {!searchMode && (
            <AddTaskForm
              activeProjectId={activeProjectId}
              projects={projectHook.projects}
              tags={tagHook.tags}
              onSubmit={(input) => taskHook.createTask(input, projectHook.projects)}
              onCreateTag={tagHook.createTag}
              defaultDueDate={dateFilter === "today" ? new Date().toISOString().split("T")[0] : undefined}
            />
          )}
        </div>
      </main>
      <DragOverlay dropAnimation={null}>
        {draggingTask && <TaskDragPreview task={draggingTask} />}
      </DragOverlay>
    </DndContext>
    </>
  )
}
