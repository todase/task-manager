"use client"

import { useQuery } from "@tanstack/react-query"
import { buildTasksUrl, withPriorityScores, type TaskFilters } from "./taskUtils"
import { apiFetch } from "@/lib/apiFetch"

export function useTaskQueries(filters: TaskFilters = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const res = await apiFetch(buildTasksUrl(filters))
      if (!res.ok) throw new Error("Не удалось загрузить задачи")
      return withPriorityScores(await res.json())
    },
  })

  return {
    tasks: data ?? [],
    isLoading: isLoading && !data,
    error: error ? (error instanceof Error ? error.message : "Ошибка загрузки задач") : null,
  }
}
