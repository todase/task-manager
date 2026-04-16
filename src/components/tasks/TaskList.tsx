"use client"

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { SortableTask } from "@/components/SortableTask"
import { TaskItem } from "@/components/tasks/TaskItem"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import type { Task, Subtask, DateFilter, Project } from "@/types"

interface TaskListProps {
  tasks: Task[]
  filteredTasks: Task[]
  activeProjectId: string | null
  dateFilter: DateFilter
  projects: Project[]
  onAssignProject: (taskId: string, projectId: string | null, project: Project | null) => Promise<void>
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onUpdateDueDate: (id: string, value: string) => Promise<void>
  onUpdateDescription: (id: string, description: string) => Promise<void>
  onUpdateTags: (id: string, tagIds: string[]) => Promise<void>
  onAddSubtask: (taskId: string, title: string) => Promise<void>
  onToggleSubtask: (taskId: string, subtask: Subtask) => Promise<void>
  onDeleteSubtask: (taskId: string, subtaskId: string) => Promise<void>
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
  projects,
  onAssignProject,
  onToggle,
  onDelete,
  onRename,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateTags,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: TaskListProps) {
  return (
    <ErrorBoundary>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul id="task-list" className="flex flex-col gap-2">
          {filteredTasks.length === 0 ? (
            <li className="text-center text-gray-400 py-8 text-sm">
              {emptyMessage(dateFilter, activeProjectId, tasks.length === 0)}
            </li>
          ) : (
            filteredTasks.map((task) => (
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
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                />
              </SortableTask>
            ))
          )}
        </ul>
      </SortableContext>
    </ErrorBoundary>
  )
}
