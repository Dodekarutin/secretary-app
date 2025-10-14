import React, { useEffect, useMemo, useState } from "react"
import type { Project, Task } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { buildTree, rollupEstimatedHours, rollupDates, rollupProgressWeighted, wbsNumber, type WbsNode } from "@/lib/wbs-utils"
import { TreeTable } from "@/components/wbs/tree-table"
import { t } from "@/lib/i18n"

export const WbsRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      const list = await adapter.listTasks({ projectId: p.id })
      setTasks(list)
    }
    run()
  }, [])

  const tree = useMemo(() => buildTree(tasks), [tasks])

  function isExpanded(id: string): boolean {
    return expanded[id] ?? true
  }
  function toggleExpand(id: string, next?: boolean) {
    setExpanded((prev) => ({ ...prev, [id]: typeof next === "boolean" ? next : !(prev[id] ?? true) }))
  }
  function expandAll(next: boolean) {
    const dict: Record<string, boolean> = {}
    function visit(n: WbsNode) {
      dict[n.id] = next
      for (const c of n.children) visit(c)
    }
    for (const r of tree) visit(r)
    setExpanded(dict)
  }

  async function addChild(parent: Task) {
    const t = await adapter.addSubtask?.(parent.id, "New task")
    if (t) {
      setTasks(await adapter.listTasks({ projectId: parent.projectId }))
      toggleExpand(parent.id, true)
    }
  }
  async function addSibling(node: Task) {
    if (!node.parentId) {
      // top-level task: add another top-level in same column
      const created = await adapter.addTask(node.projectId, node.columnId, "New task")
      if (created) setTasks(await adapter.listTasks({ projectId: node.projectId }))
    } else {
      const created = await adapter.addSubtask?.(node.parentId, "New task")
      if (created) setTasks(await adapter.listTasks({ projectId: node.projectId }))
    }
  }
  async function updateTitle(task: Task, title: string) {
    await adapter.updateTask(task.id, { title })
    setTasks(await adapter.listTasks({ projectId: task.projectId }))
  }
  async function indent(node: Task) {
    // make previous visible sibling the new parent
    const siblings = tasks.filter(t => (t.parentId ?? "") === (node.parentId ?? "") && t.columnId === node.columnId)
    siblings.sort((a,b)=> (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    const index = siblings.findIndex(t => t.id === node.id)
    if (index <= 0) return
    const newParent = siblings[index - 1]
    await adapter.updateTask(node.id, { parentId: newParent.id })
    setTasks(await adapter.listTasks({ projectId: node.projectId }))
    toggleExpand(newParent.id, true)
  }
  async function outdent(node: Task) {
    if (!node.parentId) return
    const parent = tasks.find(t => t.id === node.parentId)
    if (!parent) return
    const grandParentId = parent.parentId
    await adapter.updateTask(node.id, { parentId: grandParentId })
    setTasks(await adapter.listTasks({ projectId: node.projectId }))
  }

  async function moveUp(node: Task) {
    const sameParent = tasks.filter(t => (t.parentId ?? "") === (node.parentId ?? "") && t.columnId === node.columnId)
    sameParent.sort((a,b)=> (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    const idx = sameParent.findIndex(t => t.id === node.id)
    if (idx <= 0) return
    const reordered = [...sameParent]
    const tmp = reordered[idx-1]
    reordered[idx-1] = reordered[idx]
    reordered[idx] = tmp
    // reassign sortIndex with 1000 gap
    let pos = 1000
    for (const t of reordered) {
      if (t.sortIndex !== pos) await adapter.updateTask(t.id, { sortIndex: pos })
      pos += 1000
    }
    setTasks(await adapter.listTasks({ projectId: node.projectId }))
  }

  async function moveDown(node: Task) {
    const sameParent = tasks.filter(t => (t.parentId ?? "") === (node.parentId ?? "") && t.columnId === node.columnId)
    sameParent.sort((a,b)=> (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    const idx = sameParent.findIndex(t => t.id === node.id)
    if (idx < 0 || idx >= sameParent.length - 1) return
    const reordered = [...sameParent]
    const tmp = reordered[idx+1]
    reordered[idx+1] = reordered[idx]
    reordered[idx] = tmp
    let pos = 1000
    for (const t of reordered) {
      if (t.sortIndex !== pos) await adapter.updateTask(t.id, { sortIndex: pos })
      pos += 1000
    }
    setTasks(await adapter.listTasks({ projectId: node.projectId }))
  }

  const columns = [
    { key: "wbs", title: "#", width: 80 },
    { key: "title", title: t("wbs.title"), flex: 1 },
    { key: "hours", title: t("wbs.hours"), width: 100 },
    { key: "dates", title: `${t("wbs.start")}~${t("wbs.due")}` , width: 180 },
    { key: "progress", title: t("wbs.progress"), width: 100 },
  ] as const

  function renderRow(node: WbsNode): Record<string, React.ReactNode> {
    const number = wbsNumber(node, undefined)
    const rollHours = rollupEstimatedHours(node)
    const { start, due } = rollupDates(node)
    const rollProgress = rollupProgressWeighted(node)
    return {
      wbs: number,
      title: node.task.title,
      hours: rollHours || "",
      dates: [start ?? "?", due ?? "?"].join(" ~ "),
      progress: `${Math.round(rollProgress)}%`,
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("wbs.title")}</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800" onClick={() => expandAll(true)}>{t("wbs.expandAll")}</button>
          <button className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800" onClick={() => expandAll(false)}>{t("wbs.collapseAll")}</button>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200/70 bg-white/70 p-2 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <TreeTable
          tree={tree}
          isExpanded={isExpanded}
          onToggle={toggleExpand}
          renderRow={renderRow}
          onAddChild={addChild}
          onAddSibling={addSibling}
          onRename={updateTitle}
          onIndent={indent}
          onOutdent={outdent}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      </div>
    </div>
  )
}
