const map = new Map<string, string>()

export function registerTempId(tempId: string, realId: string): void {
  map.set(tempId, realId)
}

export function resolveId(id: string): string {
  return map.get(id) ?? id
}

export function resolveUrl(url: string): string {
  let resolved = url
  for (const [tempId, realId] of map) {
    resolved = resolved.replaceAll(tempId, realId)
  }
  return resolved
}

export function clearTempIds(): void {
  map.clear()
}
