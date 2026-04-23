"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { Archive, LogOut, Menu, Search, X } from "lucide-react"
import { useClickOutside } from "@/hooks/useClickOutside"
import { queryClient } from "@/lib/queryClient"
import { persister } from "@/lib/persister"

interface BurgerMenuProps {
  onSearch?: () => void
}

export function BurgerMenu({ onSearch }: BurgerMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)

  function close() {
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Меню"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[180px] py-1">
          {onSearch && (
            <>
              <button
                onClick={() => {
                  close()
                  onSearch()
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Search className="w-4 h-4 text-gray-400" />
                Поиск
              </button>
              <div className="my-1 border-t border-gray-100" />
            </>
          )}
          <Link
            href="/archive"
            onClick={close}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Archive className="w-4 h-4 text-gray-400" />
            Архив
          </Link>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={async () => {
                queryClient.clear()
                await persister.removeClient()
                signOut({ callbackUrl: "/login" })
              }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
