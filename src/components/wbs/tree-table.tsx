import React, { useMemo, useState } from "react"
import type { Task } from "@/types/domain"
import type { WbsNode } from "@/lib/wbs-utils"
import { t } from "@/lib/i18n"

type Column = { key: string; title: string; width?: number; flex?: number }

export const TreeTable: React.FC<{
  tree: WbsNode[]
  isExpanded: (id: string) => boolean
  onToggle: (id: string, next?: boolean) => void
  renderRow: (node: WbsNode) => Record<string, React.ReactNode>
  onAddChild: (task: Task) => void
  onAddSibling: (task: Task) => void
  onRename: (task: Task, title: string) => void
  onIndent: (task: Task) => void
  onOutdent: (task: Task) => void
  columns?: Column[]
  onMoveUp?: (task: Task) => void
  onMoveDown?: (task: Task) => void
}> = ({ tree, isExpanded, onToggle, renderRow, onAddChild, onAddSibling, onRename, onIndent, onOutdent, onMoveUp, onMoveDown, columns: inputColumns }) => {
  const columns = inputColumns ?? [
    { key: "wbs", title: "#", width: 80 },
    { key: "title", title: "Title", flex: 1 },
  ]

  const flat = useMemo(() => {
    const out: WbsNode[] = []
    function walk(n: WbsNode) {
      out.push(n)
      if (isExpanded(n.id)) {
        for (const c of n.children) walk(c)
      }
    }
    for (const r of tree) walk(r)
    return out
  }, [tree, isExpanded])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")

  function startEdit(n: WbsNode) {
    setEditingId(n.id)
    setEditingValue(n.task.title)
  }
  async function commitEdit(n: WbsNode) {
    if (editingId !== n.id) return
    const v = editingValue.trim()
    setEditingId(null)
    if (v && v !== n.task.title) onRename(n.task, v)
  }

  function onKeyDownRow(e: React.KeyboardEvent, n: WbsNode) {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) onOutdent(n.task)
      else onIndent(n.task)
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'Up')) {
      e.preventDefault()
      onMoveUp?.(n.task)
    } else if (e.altKey && (e.key === 'ArrowDown' || e.key === 'Down')) {
      e.preventDefault()
      onMoveDown?.(n.task)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className="text-left text-xs font-medium text-zinc-500" style={{ width: col.width, minWidth: col.width }}>
                {col.title}
              </th>
            ))}
            <th className="text-left text-xs font-medium text-zinc-500" style={{ width: 220 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {flat.map((n) => {
            const data = renderRow(n)
            return (
              <tr key={n.id} className="rounded bg-white/80 align-top shadow-sm dark:bg-zinc-800/70" tabIndex={0} onKeyDown={(e) => onKeyDownRow(e, n)}>
                {columns.map((col, idx) => (
                  <td key={col.key} className="px-2 py-1 text-sm">
                    {idx === 1 ? (
                      <div className="flex items-center gap-2">
                        <div className="shrink-0" style={{ width: n.level * 16 }} />
                        {n.children.length > 0 && (
                          <button className="rounded px-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700" onClick={() => onToggle(n.id)} aria-label={isExpanded(n.id) ? "Collapse" : "Expand"}>
                            {isExpanded(n.id) ? "▾" : "▸"}
                          </button>
                        )}
                        {editingId === n.id ? (
                          <input
                            className="min-w-[160px] flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => commitEdit(n)}
                            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(n); if (e.key === "Escape") setEditingId(null) }}
                            autoFocus
                          />
                        ) : (
                          <button className="flex-1 text-left hover:underline" onClick={() => startEdit(n)}>{data[col.key]}</button>
                        )}
                      </div>
                    ) : (
                      <div className="px-1">{data[col.key]}</div>
                    )}
                  </td>
                ))}
                <td className="px-2 py-1 text-xs">
                  <div className="flex flex-wrap gap-1">
                    <button className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600" onClick={() => onAddChild(n.task)}>{t("wbs.addChild")}</button>
                    <button className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600" onClick={() => onAddSibling(n.task)}>{t("wbs.addSibling")}</button>
                    <button className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600" onClick={() => onIndent(n.task)}>{t("wbs.indent")}</button>
                    <button className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600" onClick={() => onOutdent(n.task)}>{t("wbs.outdent")}</button>
                    {onMoveUp && <button className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600" onClick={() => onMoveUp(n.task)}>↑</button>}
                    {onMoveDown && <button className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600" onClick={() => onMoveDown(n.task)}>↓</button>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
