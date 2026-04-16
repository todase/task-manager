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
  project: { id: string; title: string; icon: string } | null
  subtasks: Subtask[]
  tags: Tag[]
  priorityScore: number
}

export type Project = {
  id: string
  title: string
  icon: string
}

export type DateFilter = "all" | "today" | "week" | "someday"
