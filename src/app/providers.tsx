"use client"

import { useState, useEffect } from "react"
import { SessionProvider, signOut } from "next-auth/react"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { queryClient } from "@/lib/queryClient"
import { persister } from "@/lib/persister"

const CACHE_BUSTER = process.env.NEXT_PUBLIC_CACHE_VERSION ?? "1"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const handler = () => setSessionExpired(true)
    window.addEventListener("session-expired", handler)
    return () => window.removeEventListener("session-expired", handler)
  }, [])

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER }}
    >
      <SessionProvider>
        {children}
        {sessionExpired && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl text-center">
              <p className="text-gray-800 font-medium mb-4">
                Сессия истекла. Несохранённые изменения будут потеряны.
              </p>
              <button
                onClick={async () => {
                  queryClient.clear()
                  await persister.removeClient()
                  signOut({ callbackUrl: "/login" })
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Войти снова
              </button>
            </div>
          </div>
        )}
      </SessionProvider>
    </PersistQueryClientProvider>
  )
}
