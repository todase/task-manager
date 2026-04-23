import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 30_000,
      gcTime: 86_400_000,
      retry: 1,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
})
