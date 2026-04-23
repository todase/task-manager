"use client"

import { useMutationState } from "@tanstack/react-query"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const pendingCount = useMutationState({
    filters: { status: "pending" },
    select: (m) => m.state.isPaused,
  }).filter(Boolean).length

  if (isOnline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-sm text-center py-1.5 px-4">
      Офлайн
      {pendingCount > 0 && ` — ${pendingCount} ${pendingCount === 1 ? "изменение ожидает" : "изменений ожидают"} синхронизации`}
    </div>
  )
}
