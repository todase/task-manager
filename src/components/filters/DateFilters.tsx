"use client"

import type { DateFilter } from "@/types"

interface DateFiltersProps {
  value: DateFilter
  onChange: (filter: DateFilter) => void
}

const LABELS: Record<DateFilter, string> = {
  all: "Все",
  today: "Сегодня",
  week: "Неделя",
  someday: "Когда-нибудь",
}

export function DateFilters({ value, onChange }: DateFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {(["all", "today", "week", "someday"] as const).map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`text-sm px-3 py-1 rounded-full border ${
            value === filter
              ? "bg-gray-700 text-white border-gray-700"
              : "text-gray-500 hover:border-gray-400"
          }`}
        >
          {LABELS[filter]}
        </button>
      ))}
    </div>
  )
}
