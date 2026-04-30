// src/types/index.ts

export type Subtask = {
  id: string
  title: string
  done: boolean
}

export type Tag = {
  id: string
  name: string
  color: string
}

export type Task = {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  recurrence: string | null
  description: string | null
  order: number
  isHabit: boolean
  createdAt: string
  project: { id: string; title: string; icon: string } | null
  subtasks: Subtask[]
  tags: Tag[]
  priorityScore: number
  reflections?: TaskReflection[]
}

export type Project = {
  id: string
  title: string
  icon: string
}

export type DateFilter = "all" | "today" | "week" | "someday"

export type TaskReflection = {
  id: string
  taskId: string
  notes: string | null
  timeMinutes: number | null
  difficulty: 1 | 2 | 3 | null
  mood: "energized" | "neutral" | "tired" | null
  createdAt: string
}

export type HabitLog = {
  id: string
  taskId: string
  date: string // ISO date string, UTC midnight
  reflection?: Pick<TaskReflection, "mood" | "difficulty">
}
