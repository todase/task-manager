"use client"

import { useState } from "react"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { SortableTask } from "@/components/SortableTask"
import { TaskItem } from "@/components/tasks/TaskItem"
import { ReflectionModal } from "@/components/tasks/ReflectionModal"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { TaskSkeleton } from "@/components/tasks/TaskSkeleton"
import type { Task, Subtask, DateFilter, Project, Tag } from "@/types"

interface TaskListProps {
  tasks: Task[]
  filteredTasks: Task[]
  activeProjectId: string | null
  dateFilter: DateFilter
  isLoading?: boolean
  projects: Project[]
  onAssignProject: (taskId: string, projectId: string | null, project: Project | null) => Promise<unknown>
  onToggle: (task: Task) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  onRename: (id: string, title: string) => Promise<unknown>
  onUpdateDueDate: (id: string, value: string) => Promise<unknown>
  onUpdateDescription: (id: string, description: string) => Promise<unknown>
  onUpdateTags: (id: string, tags: Tag[]) => Promise<unknown>
  tags: Tag[]
  onCreateTag: (name: string) => Promise<Tag>
  onAddSubtask: (taskId: string, title: string) => Promise<unknown>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<unknown>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<unknown>
}

function emptyMessage(
  dateFilter: DateFilter,
  activeProjectId: string | null,
  allEmpty: boolean
): string {
  if (allEmpty) return "Добавьте первую задачу"
  if (activeProjectId) return "Перетащите задачи в этот проект"
  return "Нет задач с таким фильтром"
}

export function TaskList({
  tasks,
  filteredTasks,
  activeProjectId,
  dateFilter,
  isLoading,
  projects,
  onAssignProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  tags,
  onCreateTag,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskListProps) {
  const [reflectionTaskId, setReflectionTaskId] = useState<string | null>(null)
  const nonHabitFiltered = filteredTasks.filter((t) => !t.isHabit)

  if (isLoading) return <TaskSkeleton />

  return (
    <ErrorBoundary>
      <SortableContext
        items={tasks.filter((t) => !t.isHabit).map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul id="task-list" className="flex flex-col gap-1">
          {nonHabitFiltered.length === 0 ? (
            <li className="text-center text-gray-400 py-8 text-sm">
              {emptyMessage(dateFilter, activeProjectId, tasks.filter((t) => !t.isHabit).length === 0)}
            </li>
          ) : (
            nonHabitFiltered.map((task) => (
              <SortableTask key={task.id} id={task.id}>
                <TaskItem
                  task={task}
                  showProject={!activeProjectId}
                  projects={projects}
                  onAssignProject={onAssignProject}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onRename={onRename}
                  onUpdateDueDate={onUpdateDueDate}
                  onUpdateDescription={onUpdateDescription}
                  onUpdateTags={onUpdateTags}
                  tags={tags}
                  onCreateTag={onCreateTag}
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                  onRequestReflection={setReflectionTaskId}
                />
              </SortableTask>
            ))
          )}
        </ul>
      </SortableContext>
      {reflectionTaskId && (
        <ReflectionModal
          taskId={reflectionTaskId}
          isHabit={tasks.find((t) => t.id === reflectionTaskId)?.isHabit ?? false}
          onClose={() => setReflectionTaskId(null)}
        />
      )}
    </ErrorBoundary>
  )
}
