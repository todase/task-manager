import { resolveUrl } from "./tempIdMap"

export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const resolved = typeof input === "string" ? resolveUrl(input) : input
  const res = await fetch(resolved, init)
  if (res.status === 401) throw new Error("401 Unauthorized")
  return res
}
