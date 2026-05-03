import { useQueries } from "@tanstack/react-query"
import { fetchHabitLogs } from "@/hooks/useHabitLogs"
import type { HabitLog } from "@/types"

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
