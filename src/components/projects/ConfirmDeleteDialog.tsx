"use client"

import { useState } from "react"

interface ConfirmDeleteDialogProps {
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function ConfirmDeleteDialog({ onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <p className="text-xs text-gray-600">
        Удалить проект? Выполненные задачи попадут в архив, незавершённые открепятся.
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={async () => {
            setError(null)
            setIsPending(true)
            try {
              await onConfirm()
            } catch {
              setError("Не удалось удалить проект. Попробуйте ещё раз.")
              setIsPending(false)
            }
          }}
          className="text-xs px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
        >
          {isPending ? "Удаление..." : "Удалить"}
        </button>
      </div>
    </div>
  )
}
