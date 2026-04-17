export function TaskSkeleton() {
  return (
    <ul className="flex flex-col gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
      ))}
    </ul>
  )
}
