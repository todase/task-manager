"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/apiFetch"

interface ReflectionModalProps {
  taskId: string
  onClose: () => void
}

const DIFFICULTY_OPTIONS: [1 | 2 | 3, string, string][] = [
  [1, "😊", "Легко"],
  [2, "😐", "Нормально"],
  [3, "😤", "Сложно"],
]

const MOOD_OPTIONS: ["energized" | "neutral" | "tired", string][] = [
  ["energized", "зарядился"],
  ["neutral", "нейтрально"],
  ["tired", "устал"],
]

export function ReflectionModal({ taskId, onClose }: ReflectionModalProps) {
  const [notes, setNotes] = useState("")
  const [timeMinutes, setTimeMinutes] = useState("")
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | null>(null)
  const [mood, setMood] = useState<"energized" | "neutral" | "tired" | null>(null)
  const [nextStepTitle, setNextStepTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/reflection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || undefined,
          timeMinutes: (() => { const n = Number(timeMinutes); return timeMinutes && Number.isFinite(n) ? n : undefined })(),
          difficulty: difficulty ?? undefined,
          mood: mood ?? undefined,
          nextStepTitle: nextStepTitle || undefined,
        }),
      })
      if (!res.ok) {
        setSaveError("Не удалось сохранить. Попробуйте ещё раз.")
        return
      }
      await queryClient.invalidateQueries({ queryKey: ["tasks"] })
      onClose()
    } catch {
      setSaveError("Не удалось сохранить. Попробуйте ещё раз.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      data-testid="reflection-overlay"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm mx-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800">Рефлексия</h2>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Что узнал, что удивило, что пошло не так..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg p-2 text-sm text-gray-700 resize-none outline-none focus:border-blue-400"
        />

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={timeMinutes}
            onChange={(e) => setTimeMinutes(e.target.value)}
            placeholder="0"
            min={0}
            max={1440}
            aria-label="мин"
            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
          />
          <span className="text-sm text-gray-500">мин</span>
        </div>

        <div className="flex gap-2">
          {DIFFICULTY_OPTIONS.map(([val, emoji, label]) => (
            <button
              key={val}
              type="button"
              aria-label={label}
              onClick={() => setDifficulty(difficulty === val ? null : val)}
              className={`text-xl px-3 py-1.5 rounded-lg border transition-colors ${
                difficulty === val
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {MOOD_OPTIONS.map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setMood(mood === val ? null : val)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                mood === val
                  ? "border-blue-400 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={nextStepTitle}
            onChange={(e) => setNextStepTitle(e.target.value)}
            placeholder="Следующий шаг..."
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-400">Появится в том же проекте</p>
        </div>

        {saveError && (
          <p className="text-xs text-red-500">{saveError}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-600 disabled:opacity-60"
          >
            Сохранить рефлексию
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:border-gray-400"
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}
