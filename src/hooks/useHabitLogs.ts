import { useQuery } from "@tanstack/react-query"
import type { HabitLog } from "@/types"

export function useHabitLogs(taskId: string) {
  return useQuery<HabitLog[]>({
    queryKey: ["habitLogs", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/habit-logs`)
      if (!res.ok) throw new Error("Failed to fetch habit logs")
      const data = await res.json()
      return data.logs
    },
    enabled: Boolean(taskId),
  })
}
