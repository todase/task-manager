import { describe, it, expect } from "vitest"
import { filterTasks } from "./useTasks"
import type { Task } from "@/types"

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1",
    title: "Test",
    done: false,
    dueDate: null,
    recurrence: null,
    description: null,
    order: 0,
    project: null,
    subtasks: [],
    tags: [],
    priorityScore: 1,
    ...overrides,
  }
}

describe("filterTasks", () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const in10Days = new Date(today)
  in10Days.setDate(today.getDate() + 10)

  it("returns all tasks when filter is 'all' and no project", () => {
    const tasks = [makeTask({ id: "1" }), makeTask({ id: "2" })]
    expect(filterTasks(tasks, "all", null)).toHaveLength(2)
  })

  it("filters by project", () => {
    const tasks = [
      makeTask({ id: "1", project: { id: "p1", title: "A" } }),
      makeTask({ id: "2", project: { id: "p2", title: "B" } }),
    ]
    expect(filterTasks(tasks, "all", "p1")).toHaveLength(1)
    expect(filterTasks(tasks, "all", "p1")[0].id).toBe("1")
  })

  it("filters 'today': includes tasks due today, excludes others", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: today.toISOString() }),
      makeTask({ id: "2", dueDate: tomorrow.toISOString() }),
      makeTask({ id: "3", dueDate: null }),
    ]
    const result = filterTasks(tasks, "today", null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("filters 'week': includes tasks from tomorrow through 7 days", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: today.toISOString() }),
      makeTask({ id: "2", dueDate: tomorrow.toISOString() }),
      makeTask({ id: "3", dueDate: in10Days.toISOString() }),
    ]
    const result = filterTasks(tasks, "week", null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("filters 'someday': includes tasks due 7+ days from today", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: tomorrow.toISOString() }),
      makeTask({ id: "2", dueDate: in10Days.toISOString() }),
    ]
    const result = filterTasks(tasks, "someday", null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })
})
