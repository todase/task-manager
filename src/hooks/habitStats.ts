import type { HabitLog } from "@/types"

type Mood = "energized" | "neutral" | "tired"

export type HabitStats = {
  streak: number
  completionRate: number
  moodTrend: Mood[]
}

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function getMondayOf(d: Date): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() - ((r.getUTCDay() || 7) - 1))
  return r
}

export function computeHabitStats(
  logs: HabitLog[],
  recurrence: string,
  createdAt: Date,
  weeklyTarget?: number
): HabitStats {
  const now = new Date()
  const today = utcMidnight(now)
  const createdDay = utcMidnight(createdAt)
  const target = weeklyTarget ?? 1

  // --- Streak (daily only) ---
  let streak = 0
  if (recurrence === "daily") {
    const logDates = new Set(logs.map((l) => l.date.slice(0, 10)))
    const cursor = new Date(today)
    if (!logDates.has(cursor.toISOString().slice(0, 10))) {
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    while (logDates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
  }

  // --- Completion rate ---
  let completionRate = 0

  if (recurrence === "daily") {
    const windowStart = new Date(today)
    windowStart.setUTCDate(windowStart.getUTCDate() - 29)
    const effectiveStart = createdDay > windowStart ? createdDay : windowStart
    const logsInWindow = logs.filter((l) => new Date(l.date) >= effectiveStart)
    const logged = logsInWindow.length
    const todayStr = today.toISOString().slice(0, 10)
    const totalDays = Math.round((today.getTime() - effectiveStart.getTime()) / 86_400_000)
    const todayLogged = logsInWindow.some((l) => l.date.slice(0, 10) === todayStr)
    const expectedDays = todayLogged ? totalDays + 1 : totalDays
    completionRate = expectedDays > 0 ? logged / expectedDays : 0
  } else if (recurrence === "weekly") {
    const thisMonday = getMondayOf(today)
    let completed = 0
    let total = 0
    for (let i = 0; i < 12; i++) {
      const wStart = new Date(thisMonday)
      wStart.setUTCDate(wStart.getUTCDate() - 7 * i)
      if (wStart < createdDay) break
      const wEnd = new Date(wStart)
      wEnd.setUTCDate(wEnd.getUTCDate() + 7)
      total++
      const logsInWeek = logs.filter((l) => {
        const d = new Date(l.date)
        return d >= wStart && d < wEnd
      }).length
      if (logsInWeek >= target) completed++
    }
    completionRate = total > 0 ? completed / total : 0
  } else if (recurrence === "monthly") {
    let completed = 0
    let total = 0
    for (let i = 0; i < 12; i++) {
      const mStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1))
      if (mStart < createdDay) break
      const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 1))
      total++
      if (logs.some((l) => { const d = new Date(l.date); return d >= mStart && d < mEnd })) {
        completed++
      }
    }
    completionRate = total > 0 ? completed / total : 0
  }

  // --- Mood trend ---
  let moodWindowStart: Date | null = null
  if (recurrence === "daily") {
    moodWindowStart = new Date(today)
    moodWindowStart.setUTCDate(moodWindowStart.getUTCDate() - 29)
  } else if (recurrence === "weekly") {
    moodWindowStart = getMondayOf(today)
    moodWindowStart.setUTCDate(moodWindowStart.getUTCDate() - 77)
  } else if (recurrence === "monthly") {
    moodWindowStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1))
  }

  const moodTrend = logs
    .filter((l) => l.reflection?.mood != null && (!moodWindowStart || new Date(l.date) >= moodWindowStart))
    .slice(-10)
    .map((l) => l.reflection!.mood as Mood)

  return { streak, completionRate, moodTrend }
}
