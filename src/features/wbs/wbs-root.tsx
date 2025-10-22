import React, { useEffect, useMemo, useState } from "react"
import type { Project, Task } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { PyramidView } from "@/components/wbs/pyramid-view"
import { buildTree, rollupDates, rollupEstimatedHours, rollupProgressWeighted, type WbsNode } from "@/lib/wbs-utils"
import { t } from "@/lib/i18n"

export const WbsRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      setTasks(await adapter.listTasks({ projectId: p.id }))
    }
    run()
  }, [])

  const tree = useMemo(() => buildTree(tasks), [tasks])

  async function reload(projectId: string) {
    setTasks(await adapter.listTasks({ projectId }))
  }

  async function addChild(parent: Task) {
    const created = await adapter.addSubtask?.(parent.id, "New task")
    if (created) await reload(parent.projectId)
  }

  async function addSibling(node: Task) {
    if (!node.parentId) {
      const created = await adapter.addTask(node.projectId, node.columnId, "New task")
      if (created) await reload(node.projectId)
      return
    }
    const created = await adapter.addSubtask?.(node.parentId, "New task")
    if (created) await reload(node.projectId)
  }

  async function updateTitle(task: Task, title: string) {
    await adapter.updateTask(task.id, { title })
    await reload(task.projectId)
  }

  async function indent(task: Task) {
    const siblings = tasks.filter((t) => (t.parentId ?? "") === (task.parentId ?? "") && t.columnId === task.columnId)
    siblings.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    const index = siblings.findIndex((t) => t.id === task.id)
    if (index <= 0) return
    const newParent = siblings[index - 1]
    await adapter.updateTask(task.id, { parentId: newParent.id })
    await reload(task.projectId)
  }

  async function outdent(task: Task) {
    if (!task.parentId) return
    const parent = tasks.find((t) => t.id === task.parentId)
    if (!parent) return
    await adapter.updateTask(task.id, { parentId: parent.parentId })
    await reload(task.projectId)
  }

  async function moveUp(task: Task) {
    const sameParent = tasks.filter((t) => (t.parentId ?? "") === (task.parentId ?? "") && t.columnId === task.columnId)
    sameParent.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    const idx = sameParent.findIndex((t) => t.id === task.id)
    if (idx <= 0) return
    const reordered = [...sameParent]
    const tmp = reordered[idx - 1]
    reordered[idx - 1] = reordered[idx]
    reordered[idx] = tmp
    let pos = 1000
    for (const item of reordered) {
      if (item.sortIndex !== pos) await adapter.updateTask(item.id, { sortIndex: pos })
      pos += 1000
    }
    await reload(task.projectId)
  }

  async function moveDown(task: Task) {
    const sameParent = tasks.filter((t) => (t.parentId ?? "") === (task.parentId ?? "") && t.columnId === task.columnId)
    sameParent.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    const idx = sameParent.findIndex((t) => t.id === task.id)
    if (idx < 0 || idx >= sameParent.length - 1) return
    const reordered = [...sameParent]
    const tmp = reordered[idx + 1]
    reordered[idx + 1] = reordered[idx]
    reordered[idx] = tmp
    let pos = 1000
    for (const item of reordered) {
      if (item.sortIndex !== pos) await adapter.updateTask(item.id, { sortIndex: pos })
      pos += 1000
    }
    await reload(task.projectId)
  }

  function renderDetails(node: WbsNode, _number?: string): React.ReactNode {
    const rollHours = rollupEstimatedHours(node)
    const { start, due } = rollupDates(node)
    const rollProgress = Math.max(0, Math.min(100, Math.round(rollupProgressWeighted(node))))
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span>{t("wbs.hours")}</span>
          <span>{rollHours ? String(rollHours) : "-"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("wbs.start")}</span>
          <span>{start ?? "?"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("wbs.due")}</span>
          <span>{due ?? "?"}</span>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span>{t("wbs.progress")}</span>
            <span>{rollProgress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${rollProgress}%` }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("wbs.pyramidTitle")}</h1>
        {project && <div className="text-sm text-zinc-500 dark:text-zinc-400">{project.name}</div>}
      </div>
      <div className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <PyramidView
          tree={tree}
          onAddChild={addChild}
          onAddSibling={addSibling}
          onRename={updateTitle}
          onIndent={indent}
          onOutdent={outdent}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          renderDetails={renderDetails}
        />
      </div>
    </div>
  )
}
