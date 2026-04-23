"use client"

export type { TaskFilters, CreateTaskInput } from "./taskUtils"
export { buildTasksUrl, withPriorityScores, filterTasks } from "./taskUtils"

import { useTaskQueries } from "./useTaskQueries"
import { useTaskMutations } from "./useTaskMutations"
import type { TaskFilters } from "./taskUtils"

export function useTasks(baseFilters: TaskFilters = {}) {
  const queries = useTaskQueries(baseFilters)
  const mutations = useTaskMutations(baseFilters)
  return {
    ...queries,
    ...mutations,
  }
}
