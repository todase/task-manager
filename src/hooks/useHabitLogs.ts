import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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

export function useToggleHabitLog(taskId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ date }: { date: string; isCurrentlyLogged: boolean }) => {
      const res = await fetch(`/api/tasks/${taskId}/habit-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) throw new Error("Failed to toggle habit log")
      return res.json() as Promise<{ created: boolean }>
    },
    onMutate: async ({ date, isCurrentlyLogged }) => {
      await qc.cancelQueries({ queryKey: ["habitLogs", taskId] })
      const prev = qc.getQueryData<HabitLog[]>(["habitLogs", taskId])
      qc.setQueryData<HabitLog[]>(["habitLogs", taskId], (old = []) => {
        if (isCurrentlyLogged) {
          return old.filter((l) => l.date.slice(0, 10) !== date)
        }
        return [...old, { id: `tmp_${date}`, taskId, date: `${date}T00:00:00.000Z`, reflection: null }]
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(["habitLogs", taskId], ctx.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["habitLogs", taskId] })
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
