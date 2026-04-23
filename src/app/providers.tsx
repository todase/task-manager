"use client"

import { SessionProvider } from "next-auth/react"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { queryClient } from "@/lib/queryClient"
import { persister } from "@/lib/persister"

const CACHE_BUSTER = process.env.NEXT_PUBLIC_CACHE_VERSION ?? "1"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER }}
    >
      <SessionProvider>{children}</SessionProvider>
    </PersistQueryClientProvider>
  )
}
