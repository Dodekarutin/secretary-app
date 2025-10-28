import React, { useEffect, useState } from "react"
import type { Project, Task, Column } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { GanttChart } from "@/components/gantt/gantt-chart"
import { t } from "@/lib/i18n"
import { TaskDrawer } from "@/components/task/task-drawer"

export const GanttRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [view, setView] = useState<"day" | "week" | "month">("week")
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [deps, setDeps] = useState<{ taskId: string; dependsOnTaskId: string }[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      const ts = await adapter.listTasks({ projectId: p.id })
      setTasks(ts)
      const cols = await adapter.getBoardColumns(p.id)
      setColumns(cols)
      if (adapter.listDependencies) {
        const d = await adapter.listDependencies(p.id)
        setDeps(d)
      }
    }
    run()
  }, [])

  if (!project) return <div className="p-6">{t("common.loading")}</div>
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold">{project.name} / {t("gantt.title")}</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">{t("gantt.view")}:</span>
            <select
              className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={view}
              onChange={(e) => setView(e.target.value as any)}
            >
              <option value="day">{t("gantt.view.day")}</option>
              <option value="week">{t("gantt.view.week")}</option>
              <option value="month">{t("gantt.view.month")}</option>
            </select>
          </label>
        </div>
      </header>
      {/* ツールバー: 選択タスクに対する操作 */}
      <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3 text-sm">
          <div className="text-zinc-600 dark:text-zinc-400">
            {t("gantt.selected")}:
            {selectedId ? (
              <>
                {" "}{tasks.find((x) => x.id === selectedId)?.title ?? "-"}
              </>
            ) : (
              <span className="text-zinc-400"> なし</span>
            )}
          </div>
          <button
            type="button"
            disabled={!selectedId}
            className="rounded bg-zinc-100 px-2 py-1 disabled:opacity-50 dark:bg-zinc-800"
            onClick={async () => {
              const t = tasks.find((x) => x.id === selectedId)
              if (!t) return
              const start = t.startDate ? new Date(t.startDate) : new Date()
              start.setDate(start.getDate() - 1)
              await adapter.updateTask(t.id, { startDate: start.toISOString().slice(0,10) })
              const ts = await adapter.listTasks({ projectId: project.id })
              setTasks(ts)
            }}
          >{t("gantt.startMinus")}</button>
          <button
            type="button"
            disabled={!selectedId}
            className="rounded bg-zinc-100 px-2 py-1 disabled:opacity-50 dark:bg-zinc-800"
            onClick={async () => {
              const t = tasks.find((x) => x.id === selectedId)
              if (!t) return
              const start = t.startDate ? new Date(t.startDate) : new Date()
              start.setDate(start.getDate() + 1)
              await adapter.updateTask(t.id, { startDate: start.toISOString().slice(0,10) })
              const ts = await adapter.listTasks({ projectId: project.id })
              setTasks(ts)
            }}
          >{t("gantt.startPlus")}</button>
          <button
            type="button"
            disabled={!selectedId}
            className="rounded bg-zinc-100 px-2 py-1 disabled:opacity-50 dark:bg-zinc-800"
            onClick={async () => {
              const t = tasks.find((x) => x.id === selectedId)
              if (!t) return
              const due = t.dueDate ? new Date(t.dueDate) : new Date()
              due.setDate(due.getDate() - 1)
              await adapter.updateTask(t.id, { dueDate: due.toISOString().slice(0,10) })
              const ts = await adapter.listTasks({ projectId: project.id })
              setTasks(ts)
            }}
          >{t("gantt.dueMinus")}</button>
          <button
            type="button"
            disabled={!selectedId}
            className="rounded bg-zinc-100 px-2 py-1 disabled:opacity-50 dark:bg-zinc-800"
            onClick={async () => {
              const t = tasks.find((x) => x.id === selectedId)
              if (!t) return
              const due = t.dueDate ? new Date(t.dueDate) : new Date()
              due.setDate(due.getDate() + 1)
              await adapter.updateTask(t.id, { dueDate: due.toISOString().slice(0,10) })
              const ts = await adapter.listTasks({ projectId: project.id })
              setTasks(ts)
            }}
          >{t("gantt.duePlus")}</button>
          <label className="ml-3 inline-flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">% </span>
            <input
              type="range" min={0} max={100}
              disabled={!selectedId}
              value={Math.max(0, Math.min(100, tasks.find((x)=>x.id===selectedId)?.progress ?? 0))}
              onChange={async (e) => {
                const id = selectedId
                if (!id) return
                await adapter.updateTask(id, { progress: Number(e.target.value) })
                const ts = await adapter.listTasks({ projectId: project.id })
                setTasks(ts)
              }}
            />
          </label>
          <button
            type="button"
            disabled={!selectedId}
            className="rounded bg-accent-600 px-2 py-1 text-white disabled:opacity-50"
            onClick={() => setOpenTaskId(selectedId)}
          >{t("gantt.details")}</button>
        </div>
      </div>
      <GanttChart
        tasks={tasks}
        view={view}
        onDateChange={async (taskId, start, due) => {
          await adapter.updateTask(taskId, { startDate: start, dueDate: due })
          const ts = await adapter.listTasks({ projectId: project.id })
          setTasks(ts)
        }}
        onProgressChange={async (taskId, progress) => {
          await adapter.updateTask(taskId, { progress })
          const ts = await adapter.listTasks({ projectId: project.id })
          setTasks(ts)
        }}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        dependencies={deps}
        groups={columns
          .sort((a,b)=>a.sortIndex-b.sortIndex)
          .map(c=>({ title: c.name, tasks: tasks.filter(t=>t.columnId===c.id) }))}
      />
      <TaskDrawer
        open={Boolean(openTaskId)}
        task={tasks.find((t) => t.id === openTaskId) ?? null}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}
