import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query"

function dispatch401() {
  window.dispatchEvent(new Event("session-expired"))
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof Error && error.message.includes("401")) dispatch401()
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (error instanceof Error && error.message.includes("401")) dispatch401()
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
