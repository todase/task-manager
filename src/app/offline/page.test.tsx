// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import OfflinePage from "./page"

afterEach(() => cleanup())

describe("OfflinePage", () => {
  it("renders offline heading", () => {
    render(<OfflinePage />)
    expect(screen.getByRole("heading", { name: /нет подключения/i })).toBeInTheDocument()
  })

  it("renders hint about opening online first", () => {
    render(<OfflinePage />)
    expect(screen.getByText(/откройте приложение онлайн/i)).toBeInTheDocument()
  })

  it("reload button calls window.location.reload", () => {
    const reload = vi.fn()
    Object.defineProperty(window, "location", { value: { reload }, writable: true })
    render(<OfflinePage />)
    fireEvent.click(screen.getByRole("button", { name: /попробовать снова/i }))
    expect(reload).toHaveBeenCalledOnce()
  })
})
