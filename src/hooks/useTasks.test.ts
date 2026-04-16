import { describe, it, expect } from "vitest"
import { filterTasks, withPriorityScores } from "./useTasks"
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
      makeTask({ id: "1", project: { id: "p1", title: "A", icon: "folder" } }),
      makeTask({ id: "2", project: { id: "p2", title: "B", icon: "folder" } }),
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

  it("filters 'someday': includes tasks with null dueDate", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: null }),
      makeTask({ id: "2", dueDate: tomorrow.toISOString() }),
    ]
    const result = filterTasks(tasks, "someday", null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })
})

describe("withPriorityScores", () => {
  function makeRaw(id: string, order: number): Omit<Task, "priorityScore"> {
    return {
      id,
      title: "T",
      done: false,
      dueDate: null,
      recurrence: null,
      description: null,
      order,
      project: null,
      subtasks: [],
      tags: [],
    }
  }

  it("returns score 1 for a single task", () => {
    const [t] = withPriorityScores([makeRaw("1", 0)])
    expect(t.priorityScore).toBe(1)
  })

  it("first task gets score 1, last gets score 0", () => {
    const result = withPriorityScores([makeRaw("1", 0), makeRaw("2", 1)])
    expect(result[0].priorityScore).toBe(1)
    expect(result[1].priorityScore).toBe(0)
  })

  it("interpolates scores for 3 tasks", () => {
    const result = withPriorityScores([
      makeRaw("1", 0),
      makeRaw("2", 1),
      makeRaw("3", 2),
    ])
    expect(result[0].priorityScore).toBeCloseTo(1)
    expect(result[1].priorityScore).toBeCloseTo(0.5)
    expect(result[2].priorityScore).toBeCloseTo(0)
  })
})
