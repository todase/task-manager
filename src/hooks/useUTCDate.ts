import { useEffect, useState } from "react"

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function msUntilMidnightUTC(): number {
  const now = new Date()
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return next - now.getTime()
}

export function useUTCDate(): string {
  const [date, setDate] = useState(todayUTC)

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>

    function schedule() {
      id = setTimeout(() => {
        setDate(todayUTC())
        schedule()
      }, msUntilMidnightUTC())
    }

    schedule()
    return () => clearTimeout(id)
  }, [])

  return date
}
