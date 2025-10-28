import React, { useEffect, useMemo, useState } from "react"
import { useAdapter } from "@/adapters/adapter-context"
import type { Project, Task } from "@/types/domain"
import { t } from "@/lib/i18n"

// adapter provided by AdapterProvider

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return Math.round(diff)
}

export const DashboardRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      const ts = await adapter.listTasks({ projectId: p.id })
      setTasks(ts)
    }
    run()
  }, [])

  const { percent, doneCount, totalCount, dueSoon, overdue } = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => (t.progress ?? 0) >= 100).length
    const pct = total ? Math.round((done / total) * 100) : 0
    const dueSoon = tasks
      .map((t) => ({ t, days: daysUntil(t.dueDate) }))
      .filter((x) => x.days !== null && (x.days as number) >= 0 && (x.days as number) <= 3)
      .sort((a, b) => (a.days as number) - (b.days as number))
      .map((x) => x.t)
    const overdue = tasks
      .map((t) => ({ t, days: daysUntil(t.dueDate) }))
      .filter((x) => (x.days ?? 0) < 0)
      .map((x) => x.t)
    return { percent: pct, doneCount: done, totalCount: total, dueSoon, overdue }
  }, [tasks])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <h2 className="mb-2 text-sm font-medium">{t("dashboard.progressSummary")}</h2>
          <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
            {doneCount}/{totalCount} ({percent}%) 完了
          </div>
          <div className="h-2 w-full rounded bg-zinc-200 dark:bg-zinc-700">
            <div className="h-2 rounded bg-brand-500" style={{ width: `${percent}%` }} />
          </div>
        </section>
        <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
          <h2 className="mb-2 text-sm font-medium">{t("dashboard.dueSoon")}</h2>
          {dueSoon.length === 0 ? (
            <div className="text-sm text-zinc-500">{t("dashboard.none")}</div>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {dueSoon.map((t) => (
                <li key={t.id}>{t.title}（{t.dueDate}）</li>
              ))}
            </ul>
          )}
          <h2 className="mt-4 mb-2 text-sm font-medium">{t("dashboard.overdue")}</h2>
          {overdue.length === 0 ? (
            <div className="text-sm text-zinc-500">{t("dashboard.none")}</div>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {overdue.map((t) => (
                <li key={t.id}>{t.title}（{t.dueDate}）</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
