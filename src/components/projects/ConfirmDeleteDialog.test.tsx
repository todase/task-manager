// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog"

afterEach(cleanup)

describe("ConfirmDeleteDialog", () => {
  it("renders confirmation text and both buttons", () => {
    render(
      <ConfirmDeleteDialog
        onCancel={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )
    expect(screen.getByText(/удалить проект/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /отмена/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /удалить/i })).toBeInTheDocument()
  })

  it("calls onCancel when Отмена is clicked", () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDeleteDialog
        onCancel={onCancel}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /отмена/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("disables both buttons and shows 'Удаление...' while request is in flight", async () => {
    let resolveDelete!: () => void
    const onConfirm = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => { resolveDelete = resolve })
    )
    render(<ConfirmDeleteDialog onCancel={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole("button", { name: /удалить/i }))

    const loadingBtn = screen.getByRole("button", { name: /удаление/i })
    expect(loadingBtn).toBeDisabled()
    expect(screen.getByRole("button", { name: /отмена/i })).toBeDisabled()

    resolveDelete()
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce())
  })

  it("prevents double-submit — onConfirm called exactly once even if button clicked twice", async () => {
    let resolveDelete!: () => void
    const onConfirm = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => { resolveDelete = resolve })
    )
    render(<ConfirmDeleteDialog onCancel={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole("button", { name: /удалить/i }))
    fireEvent.click(screen.getByRole("button", { name: /удаление/i }))

    resolveDelete()
    await waitFor(() => {})
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("shows error message when onConfirm rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Network error"))
    render(<ConfirmDeleteDialog onCancel={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole("button", { name: /удалить/i }))

    await waitFor(() => {
      expect(screen.getByText(/не удалось удалить/i)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /удалить/i })).not.toBeDisabled()
  })
})
