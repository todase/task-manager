// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { ReflectionModal } from "./ReflectionModal"
import { apiFetch } from "@/lib/apiFetch"
import { useQueryClient } from "@tanstack/react-query"

vi.mock("@/lib/apiFetch")
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}))

const mockApiFetch = vi.mocked(apiFetch)
const mockUseQueryClient = vi.mocked(useQueryClient)

afterEach(cleanup)

describe("ReflectionModal", () => {
  const onClose = vi.fn()
  const invalidateQueries = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response)
    mockUseQueryClient.mockReturnValue({ invalidateQueries } as never)
  })

  it("renders all form fields", () => {
    render(<ReflectionModal taskId="task-1" onClose={onClose} />)
    expect(screen.getByPlaceholderText(/Что узнал/)).toBeInTheDocument()
    expect(screen.getByLabelText("мин")).toBeInTheDocument()
    expect(screen.getByText("😊")).toBeInTheDocument()
    expect(screen.getByText("😐")).toBeInTheDocument()
    expect(screen.getByText("😤")).toBeInTheDocument()
    expect(screen.getByText("зарядился")).toBeInTheDocument()
    expect(screen.getByText("нейтрально")).toBeInTheDocument()
    expect(screen.getByText("устал")).toBeInTheDocument()
  })

  it("calls onClose without POST when Пропустить is clicked", () => {
    render(<ReflectionModal taskId="task-1" onClose={onClose} />)
    fireEvent.click(screen.getByText("Пропустить"))
    expect(onClose).toHaveBeenCalled()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it("calls onClose without POST when overlay is clicked", () => {
    render(<ReflectionModal taskId="task-1" onClose={onClose} />)
    fireEvent.click(screen.getByTestId("reflection-overlay"))
    expect(onClose).toHaveBeenCalled()
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it("POSTs, invalidates tasks query, and closes on save", async () => {
    render(<ReflectionModal taskId="task-1" onClose={onClose} />)
    fireEvent.click(screen.getByText("Сохранить рефлексию"))

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/tasks/task-1/reflection",
        expect.objectContaining({ method: "POST" })
      )
    )
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["tasks"] })
    expect(onClose).toHaveBeenCalled()
  })

  it("sends form values in POST body", async () => {
    render(<ReflectionModal taskId="task-1" onClose={onClose} />)

    fireEvent.change(screen.getByPlaceholderText(/Что узнал/), {
      target: { value: "Learned a lot" },
    })
    fireEvent.change(screen.getByLabelText("мин"), { target: { value: "45" } })
    fireEvent.click(screen.getByText("😊"))
    fireEvent.click(screen.getByText("зарядился"))
    fireEvent.click(screen.getByText("Сохранить рефлексию"))

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled())
    const [, init] = mockApiFetch.mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.notes).toBe("Learned a lot")
    expect(body.timeMinutes).toBe(45)
    expect(body.difficulty).toBe(1)
    expect(body.mood).toBe("energized")
  })
})
