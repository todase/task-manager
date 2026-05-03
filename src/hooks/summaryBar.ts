import type { HabitLog } from "@/types"

export function computeHabitRate7d(logs: HabitLog[], recurrence: string): number {
  const now = new Date()
  const sevenDaysAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
  )
  const logsIn7d = logs.filter((l) => new Date(l.date) >= sevenDaysAgo)

  if (recurrence === "daily") {
    return Math.min(logsIn7d.length / 7, 1)
  }
  // weekly / monthly: did the habit occur at least once this 7-day window?
  return logsIn7d.length > 0 ? 1 : 0
}
