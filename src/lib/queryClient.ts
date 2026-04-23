import { QueryClient, MutationCache } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof Error && error.message.includes("401")) {
        window.dispatchEvent(new Event("session-expired"))
      }
    },
  }),
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
