// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ArchiveTaskItem } from "./ArchiveTaskItem"
import type { Task, TaskReflection } from "@/types"

afterEach(cleanup)

const makeReflection = (overrides: Partial<TaskReflection> = {}): TaskReflection => ({
  id: "r1",
  taskId: "task-1",
  notes: null,
  timeMinutes: null,
  difficulty: null,
  mood: null,
  createdAt: "2026-04-28T10:00:00.000Z",
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Done task",
  done: true,
  dueDate: null,
  recurrence: null,
  description: null,
  order: 0,
  isHabit: false,
  estimatedMinutes: null,
  weeklyTarget: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  project: null,
  subtasks: [],
  tags: [],
  priorityScore: 0,
  reflections: [],
  ...overrides,
})

describe("ArchiveTaskItem", () => {
  it("shows reflection icon when task has a reflection", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [makeReflection()] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByLabelText("Есть рефлексия")).toBeTruthy()
  })

  it("hides reflection icon when reflections array is empty", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.queryByLabelText("Есть рефлексия")).toBeNull()
  })

  it("hides reflection icon when reflections is undefined", () => {
    const task = makeTask()
    delete task.reflections
    render(
      <ArchiveTaskItem task={task} onRestore={vi.fn()} onDelete={vi.fn()} />
    )
    expect(screen.queryByLabelText("Есть рефлексия")).toBeNull()
  })

  it("expands on row click to show reflection section", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [makeReflection({ notes: "Всё прошло хорошо" })] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.queryByText("Рефлексия")).toBeNull()
    fireEvent.click(screen.getByText("Done task"))
    expect(screen.getByText("Рефлексия")).toBeTruthy()
    expect(screen.getByText("Всё прошло хорошо")).toBeTruthy()
  })

  it("renders only non-empty reflection fields", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({
          reflections: [makeReflection({ notes: "Заметки", timeMinutes: 30 })],
        })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText("Done task"))
    expect(screen.getByText("Заметки")).toBeTruthy()
    expect(screen.getByText("⏱ 30 мин")).toBeTruthy()
    expect(screen.queryByText("😊")).toBeNull()
    expect(screen.queryByText("зарядился")).toBeNull()
  })

  it("does not render reflection section when reflections is empty", () => {
    render(
      <ArchiveTaskItem
        task={makeTask({ reflections: [] })}
        onRestore={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText("Done task"))
    expect(screen.queryByText("Рефлексия")).toBeNull()
  })

  it("calls onRestore with task id and does not toggle expand", () => {
    const onRestore = vi.fn()
    render(
      <ArchiveTaskItem task={makeTask()} onRestore={onRestore} onDelete={vi.fn()} />
    )
    fireEvent.click(screen.getByLabelText("Восстановить"))
    expect(onRestore).toHaveBeenCalledWith("task-1")
    expect(screen.queryByText("Рефлексия")).toBeNull()
  })

  it("calls onDelete with task id and does not toggle expand", () => {
    const onDelete = vi.fn()
    render(
      <ArchiveTaskItem task={makeTask()} onRestore={vi.fn()} onDelete={onDelete} />
    )
    fireEvent.click(screen.getByLabelText("Удалить"))
    expect(onDelete).toHaveBeenCalledWith("task-1")
    expect(screen.queryByText("Рефлексия")).toBeNull()
  })
})
