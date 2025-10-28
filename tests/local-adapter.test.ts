import { describe, it, expect, beforeEach } from "vitest"
import { createLocalAdapter } from "@/adapters/local-adapter"

describe("local adapter", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("moves a task across columns and reindexes", async () => {
    const adapter = createLocalAdapter()
    const project = await adapter.getDefaultProject()
    const cols = await adapter.getBoardColumns(project.id)
    const from = cols[0]
    const to = cols[1]
    const tasksInFrom = await adapter.listTasks({ projectId: project.id, columnId: from.id })
    expect(tasksInFrom.length).toBeGreaterThan(0)
    const t = tasksInFrom[0]
    await adapter.moveTask(t.id, to.id, 0)
    const tasksInTo = await adapter.listTasks({ projectId: project.id, columnId: to.id })
    expect(tasksInTo.find((x) => x.id === t.id)).toBeTruthy()
    expect(tasksInTo[0].sortIndex).toBe(1000)
  })

  it("reorders columns", async () => {
    const adapter = createLocalAdapter()
    const project = await adapter.getDefaultProject()
    const cols = await adapter.getBoardColumns(project.id)
    // swap first two
    const ordered = [...cols]
    const tmp = ordered[0].sortIndex
    ordered[0].sortIndex = ordered[1].sortIndex
    ordered[1].sortIndex = tmp
    await adapter.reorderColumns(
      project.id,
      ordered.map((c) => ({ columnId: c.id, sortIndex: c.sortIndex }))
    )
    const after = await adapter.getBoardColumns(project.id)
    expect(after[0].id).toBe(ordered[0].id)
  })

  it("reorders within same column using index", async () => {
    const adapter = createLocalAdapter()
    const project = await adapter.getDefaultProject()
    const cols = await adapter.getBoardColumns(project.id)
    const col = cols[0]
    // ensure two tasks in same column
    await adapter.addTask(project.id, col.id, "二つ目のタスク")
    const before = await adapter.listTasks({ projectId: project.id, columnId: col.id })
    expect(before.length).toBeGreaterThanOrEqual(2)
    const target = before[before.length - 1] // move last to top
    await adapter.moveTask(target.id, col.id, 0)
    const after = await adapter.listTasks({ projectId: project.id, columnId: col.id })
    expect(after[0].id).toBe(target.id)
    expect(after[0].sortIndex).toBe(1000)
  })

  it("updates project name/description and persists", async () => {
    const adapter = createLocalAdapter()
    const project = await adapter.getDefaultProject()
    const updated = await adapter.updateProject(project.id, { name: "NewName", description: "Desc" })
    expect(updated.name).toBe("NewName")
    expect(updated.description).toBe("Desc")
    const again = await adapter.getProject(project.id)
    expect(again?.name).toBe("NewName")
    expect(again?.description).toBe("Desc")
  })

  it("updates task dates and progress", async () => {
    const adapter = createLocalAdapter()
    const project = await adapter.getDefaultProject()
    const tasks = await adapter.listTasks({ projectId: project.id })
    const t = tasks[0]
    const start = "2025-01-01"
    const due = "2025-01-10"
    await adapter.updateTask(t.id, { startDate: start, dueDate: due, progress: 55 })
    const after = (await adapter.listTasks({ projectId: project.id })).find((x) => x.id === t.id)!
    expect(after.startDate).toBe(start)
    expect(after.dueDate).toBe(due)
    expect(after.progress).toBe(55)
  })

  it("checklist add/toggle/remove works", async () => {
    const adapter = createLocalAdapter()
    const project = await adapter.getDefaultProject()
    const tasks = await adapter.listTasks({ projectId: project.id })
    const t = tasks[0]
    const before = await adapter.listChecklist(t.id)
    const added = await adapter.addChecklist(t.id, "項目A")
    expect(added.title).toBe("項目A")
    const toggled = await adapter.toggleChecklist(added.id, true)
    expect(toggled?.done).toBe(true)
    await adapter.removeChecklist(added.id)
    const after = await adapter.listChecklist(t.id)
    expect(after.find((x) => x.id === added.id)).toBeFalsy()
  })

  it("comments add/remove works", async () => {
    const adapter = createLocalAdapter()
    const project = await adapter.getDefaultProject()
    const tasks = await adapter.listTasks({ projectId: project.id })
    const t = tasks[0]
    const added = await adapter.addComment(t.id, "コメントA")
    expect(added.body).toBe("コメントA")
    const list = await adapter.listComments(t.id)
    expect(list.find((c) => c.id === added.id)).toBeTruthy()
    await adapter.removeComment(added.id)
    const list2 = await adapter.listComments(t.id)
    expect(list2.find((c) => c.id === added.id)).toBeFalsy()
  })
})
