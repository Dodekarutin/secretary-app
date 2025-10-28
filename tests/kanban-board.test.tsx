import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import React from "react"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import type { Column, Task } from "@/types/domain"

describe("KanbanBoard (display)", () => {
  const columns: Column[] = [
    { id: "c1", boardId: "b1", name: "To Do", sortIndex: 1000 },
    { id: "c2", boardId: "b1", name: "Doing", sortIndex: 2000 },
  ]

  const tasks: Record<string, Task[]> = {
    c1: [
      {
        id: "t1",
        projectId: "p1",
        columnId: "c1",
        title: "仕様を確認する",
        progress: 0,
        sortIndex: 1000,
        createdAt: new Date().toISOString(),
        createdBy: "u1",
      },
    ],
    c2: [
      {
        id: "t2",
        projectId: "p1",
        columnId: "c2",
        title: "UI を実装する",
        progress: 30,
        sortIndex: 1000,
        createdAt: new Date().toISOString(),
        createdBy: "u1",
      },
    ],
  }

  it("列とカードが描画される", () => {
    render(
      <KanbanBoard
        projectId="p1"
        columns={columns}
        tasksByColumn={tasks}
        onTaskMove={async () => {}}
        onColumnReorder={async () => {}}
        onAddTask={() => {}}
        onOpenTask={() => {}}
      />
    )

    expect(screen.getByLabelText("column-To Do")).toBeInTheDocument()
    expect(screen.getByLabelText("column-Doing")).toBeInTheDocument()
    expect(screen.getByLabelText("task-仕様を確認する")).toBeInTheDocument()
    expect(screen.getByLabelText("task-UI を実装する")).toBeInTheDocument()
  })
})
