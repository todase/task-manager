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
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handlerRef.current()
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [enabled, ref])
}
