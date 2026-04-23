// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, act, cleanup } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { OfflineBanner } from "./OfflineBanner"

function makeWrapper(qc = new QueryClient()) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("OfflineBanner", () => {
  afterEach(() => {
    cleanup()
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
  })

  it("renders nothing when online", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
    const { container } = render(<OfflineBanner />, { wrapper: makeWrapper() })
    expect(container.firstChild).toBeNull()
  })

  it("renders offline message when offline event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true })
    render(<OfflineBanner />, { wrapper: makeWrapper() })
    act(() => { window.dispatchEvent(new Event("offline")) })
    expect(screen.getByText(/Офлайн/)).toBeInTheDocument()
  })
})
