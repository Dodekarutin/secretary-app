import React, { useEffect, useMemo, useState } from "react"
import { KanbanBoard } from "@/components/kanban/kanban-board"
import type { Column, Id, Project, Task } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { t } from "@/lib/i18n"
import { TaskDrawer } from "@/components/task/task-drawer"
import { navigate } from "@/lib/router"

export const KanbanRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const loading = !project

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      const cols = await adapter.getBoardColumns(p.id)
      setColumns(cols)
      const ts = await adapter.listTasks({ projectId: p.id })
      setTasks(ts)
    }
    run()
  }, [])

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const c of columns) map[c.id] = []
    for (const t of tasks) {
      if (!map[t.columnId]) map[t.columnId] = []
      map[t.columnId].push(t)
    }
    return map
  }, [columns, tasks])

  if (loading) {
    return (
      <div className="p-6 text-zinc-600 dark:text-zinc-300">{t("common.loading")}</div>
    )
  }

  async function onAddTask(columnId: Id) {
    if (!project) return
    const title = window.prompt("タスク名を入力")?.trim()
    if (!title) return
    const t = await adapter.addTask(project.id, columnId, title)
    setTasks((prev) => [...prev, t])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">{project?.name} / {t("kanban.title")}</h1>
        <div className="flex items-center gap-2">
          {columns.length > 0 && (
            <button
              type="button"
              className="rounded bg-accent-600 px-3 py-1.5 text-sm text-white"
              onClick={() => navigate(`/decompose?columnId=${columns[0].id}`)}
            >
              分解して追加
            </button>
          )}
        </div>
      </header>
      <KanbanBoard
        projectId={project!.id}
        columns={columns}
        tasksByColumn={tasksByColumn}
        onTaskMove={async (taskId, toColumnId, toIndex) => {
          await adapter.moveTask(taskId, toColumnId, toIndex)
          const ts = await adapter.listTasks({ projectId: project!.id })
          setTasks(ts)
        }}
        onColumnReorder={async (ordered) => {
          await adapter.reorderColumns(project!.id, ordered)
          const cols = await adapter.getBoardColumns(project!.id)
          setColumns(cols)
        }}
        onAddTask={onAddTask}
        onOpenTask={(taskId) => setOpenTaskId(taskId)}
      />
      <TaskDrawer
        open={Boolean(openTaskId)}
        task={tasks.find((t) => t.id === openTaskId) ?? null}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}
