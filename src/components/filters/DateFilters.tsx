"use client"

import type { DateFilter } from "@/types"

interface DateFiltersProps {
  value: DateFilter
  onChange: (filter: DateFilter) => void
}

const LABELS: Record<DateFilter, string> = {
  today: "Сегодня",
  week: "Неделя",
  all: "Все",
  someday: "Потом",
}

const FILTERS: DateFilter[] = ["today", "week", "all", "someday"]

export function DateFilters({ value, onChange }: DateFiltersProps) {
  return (
    <div className="flex bg-gray-200 rounded-lg p-1 mb-4">
      {FILTERS.map((filter) => (
        <button
          key={filter}
          onClick={() => onChange(filter)}
          className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${
            value === filter
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {LABELS[filter]}
        </button>
      ))}
    </div>
  )
}
