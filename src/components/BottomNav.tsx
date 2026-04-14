"use client"

import { usePathname } from "next/navigation"

type Props = {
  onAddClick: () => void
}

export function BottomNav({ onAddClick }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200">
      <div className="flex items-stretch h-16">
        {/* Projects — scrolls to project tabs at top of page */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 min-h-[44px]"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          Проекты
        </button>

        {/* Add — focuses the task title input */}
        <button
          onClick={onAddClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-gray-500 min-h-[44px]"
        >
          <span className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-light leading-none">
            +
          </span>
        </button>

        {/* Tasks — scrolls to task list */}
        <button
          onClick={() => document.getElementById("task-list")?.scrollIntoView({ behavior: "smooth" })}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs min-h-[44px] ${
            pathname === "/tasks" ? "text-blue-500" : "text-gray-500"
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Задачи
        </button>
      </div>
      {/* Safe area inset for iOS home indicator */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  )
}
