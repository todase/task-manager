import { useQuery } from "@tanstack/react-query"
import { buildTasksUrl, withPriorityScores } from "./taskUtils"
import type { Task } from "@/types"

export function useHabits() {
  return useQuery<Task[]>({
    queryKey: ["tasks", { isHabit: true }],
    queryFn: async () => {
      const res = await fetch(buildTasksUrl({ isHabit: true }))
      if (!res.ok) throw new Error("Failed to fetch habits")
      const tasks: Omit<Task, "priorityScore">[] = await res.json()
      return withPriorityScores(tasks)
    },
  })
}
