import { useEffect, useRef, type RefObject } from "react"

export function useClickOutside(
  ref: RefObject<Element | null>,
  handler: () => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler })

  useEffect(() => {
    if (!enabled) return
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handlerRef.current()
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [enabled, ref])
}
