// src/types/index.ts

export type Subtask = {
  id: string
  title: string
  done: boolean
}

export type Task = {
  id: string
  title: string
  done: boolean
  dueDate: string | null
  recurrence: string | null
  order: number
  project: { id: string; title: string } | null
  subtasks: Subtask[]
}

export type Project = {
  id: string
  title: string
}

export type DateFilter = "all" | "today" | "week" | "someday"
