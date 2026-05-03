import { useQueries } from "@tanstack/react-query"
import type { HabitLog } from "@/types"

async function fetchHabitLogs(taskId: string): Promise<HabitLog[]> {
  const res = await fetch(`/api/tasks/${taskId}/habit-logs`)
  if (!res.ok) throw new Error("Failed to fetch habit logs")
  const data = await res.json()
  return data.logs as HabitLog[]
}

export function useAllHabitLogs(habitIds: string[]) {
  const results = useQueries({
    queries: habitIds.map((id) => ({
      queryKey: ["habitLogs", id],
      queryFn: () => fetchHabitLogs(id),
      enabled: Boolean(id),
    })),
  })

  const logsByHabitId: Record<string, HabitLog[]> = {}
  let isLoading = false

  for (let i = 0; i < habitIds.length; i++) {
    const r = results[i]
    logsByHabitId[habitIds[i]] = r.data ?? []
    if (r.isLoading) isLoading = true
  }

  return { logsByHabitId, isLoading }
}
