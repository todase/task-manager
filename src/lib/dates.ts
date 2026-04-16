export function formatDueDate(dueDate: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  if (due < today) return "просрочено"
  if (due.getTime() === today.getTime()) return "сегодня"
  if (due.getTime() === tomorrow.getTime()) return "завтра"
  return due.toLocaleDateString("ru-RU")
}
