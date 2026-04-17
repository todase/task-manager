// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useRef } from "react"
import { fireEvent } from "@testing-library/react"
import { useClickOutside } from "./useClickOutside"

describe("useClickOutside", () => {
  let div: HTMLDivElement

  beforeEach(() => {
    div = document.createElement("div")
    document.body.appendChild(div)
  })

  afterEach(() => {
    if (div.parentNode) div.parentNode.removeChild(div)
  })

  function setup(handler: () => void, enabled = true) {
    return renderHook(() => {
      const ref = useRef<HTMLDivElement>(div)
      useClickOutside(ref, handler, enabled)
    })
  }

  it("calls handler on pointerdown outside the element", () => {
    const handler = vi.fn()
    setup(handler)
    fireEvent.pointerDown(document.body)
    expect(handler).toHaveBeenCalledOnce()
  })

  it("does NOT call handler on pointerdown inside the element", () => {
    const handler = vi.fn()
    setup(handler)
    fireEvent.pointerDown(div)
    expect(handler).not.toHaveBeenCalled()
  })

  it("does NOT call handler when enabled is false", () => {
    const handler = vi.fn()
    setup(handler, false)
    fireEvent.pointerDown(document.body)
    expect(handler).not.toHaveBeenCalled()
  })

  it("removes listener after unmount — handler not called", () => {
    const handler = vi.fn()
    const { unmount } = setup(handler)
    unmount()
    fireEvent.pointerDown(document.body)
    expect(handler).not.toHaveBeenCalled()
  })
})
