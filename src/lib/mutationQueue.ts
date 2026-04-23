import { get, set } from "idb-keyval"
import { CACHE_KEY } from "./persister"

export async function remapMutationQueue(tempId: string, realId: string): Promise<void> {
  const raw = await get<string>(CACHE_KEY)
  if (!raw) return
  if (!raw.includes(`"${tempId}"`)) return
  await set(CACHE_KEY, raw.replaceAll(`"${tempId}"`, `"${realId}"`))
}
