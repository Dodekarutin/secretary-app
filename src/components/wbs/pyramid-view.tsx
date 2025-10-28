import React, { useMemo, useState } from "react"
import type { Task } from "@/types/domain"
import type { WbsNode } from "@/lib/wbs-utils"
import { t } from "@/lib/i18n"

type RenderDetails = (node: WbsNode, number: string) => React.ReactNode

export type PyramidViewProps = {
  tree: WbsNode[]
  onAddChild: (task: Task) => void
  onAddSibling: (task: Task) => void
  onRename: (task: Task, title: string) => void
  onIndent: (task: Task) => void
  onOutdent: (task: Task) => void
  onMoveUp?: (task: Task) => void
  onMoveDown?: (task: Task) => void
  renderDetails?: RenderDetails
}

type Grouped = {
  levels: WbsNode[][]
  numbers: Record<string, string>
}

function groupTree(tree: WbsNode[]): Grouped {
  const levels: WbsNode[][] = []
  const numbers: Record<string, string> = {}

  function visit(node: WbsNode, parentNumber?: string) {
    const number = parentNumber ? `${parentNumber}.${node.indexAmongSiblings + 1}` : String(node.indexAmongSiblings + 1)
    numbers[node.id] = number
    if (!levels[node.level]) levels[node.level] = []
    levels[node.level].push(node)
    for (const child of node.children) visit(child, number)
  }

  for (const root of tree) visit(root)

  return { levels, numbers }
}

export const PyramidView: React.FC<PyramidViewProps> = ({
  tree,
  onAddChild,
  onAddSibling,
  onRename,
  onIndent,
  onOutdent,
  onMoveUp,
  onMoveDown,
  renderDetails,
}) => {
  const { levels, numbers } = useMemo(() => groupTree(tree), [tree])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

  function startEdit(node: WbsNode) {
    setEditingId(node.id)
    setEditingValue(node.task.title)
  }

  async function commitEdit(node: WbsNode) {
    if (editingId !== node.id) return
    const next = editingValue.trim()
    setEditingId(null)
    if (next && next !== node.task.title) onRename(node.task, next)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingValue("")
  }

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>, node: WbsNode) {
    if (e.key === "Tab") {
      e.preventDefault()
      if (e.shiftKey) onOutdent(node.task)
      else onIndent(node.task)
      return
    }
    if ((e.altKey || e.metaKey) && (e.key === "ArrowUp" || e.key === "Up")) {
      e.preventDefault()
      onMoveUp?.(node.task)
      return
    }
    if ((e.altKey || e.metaKey) && (e.key === "ArrowDown" || e.key === "Down")) {
      e.preventDefault()
      onMoveDown?.(node.task)
      return
    }
  }

  if (tree.length === 0) {
    return (
      <div className="rounded border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {t("dashboard.none")}
      </div>
    )
  }

  function formatLevelHeading(levelIndex: number): string {
    const template = t("wbs.levelHeading")
    if (template === "wbs.levelHeading") return `Level ${levelIndex + 1}`
    return template.replace("%n", String(levelIndex + 1))
  }

  function formatLevelBadge(levelIndex: number): string {
    const template = t("wbs.levelShort")
    if (template === "wbs.levelShort") return `L${levelIndex + 1}`
    return template.replace("%n", String(levelIndex + 1))
  }

  return (
    <div className="space-y-8">
      {levels.map((row, level) => (
        <section key={level} className="space-y-3">
          <header className="text-center text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {formatLevelHeading(level)}
          </header>
          <div className="flex flex-wrap items-stretch justify-center gap-4">
            {row.map((node) => {
              const number = numbers[node.id]
              const details = renderDetails?.(node, number)
              return (
                <div
                  key={node.id}
                  className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white p-4 text-sm shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900"
                  tabIndex={0}
                  onKeyDown={(e) => handleKey(e, node)}
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                    <span className="font-mono">{number}</span>
                    <span>{formatLevelBadge(node.level)}</span>
                  </div>
                  {editingId === node.id ? (
                    <input
                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => commitEdit(node)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(node)
                        if (e.key === "Escape") cancelEdit()
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left text-base font-medium leading-tight hover:underline"
                      onClick={() => startEdit(node)}
                    >
                      {node.task.title}
                    </button>
                  )}
                  {details && <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{details}</div>}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={() => onAddChild(node.task)}
                    >
                      {t("wbs.addChild")}
                    </button>
                    <button
                      type="button"
                      className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={() => onAddSibling(node.task)}
                    >
                      {t("wbs.addSibling")}
                    </button>
                    <button
                      type="button"
                      className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={() => onIndent(node.task)}
                    >
                      {t("wbs.indent")}
                    </button>
                    <button
                      type="button"
                      className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={() => onOutdent(node.task)}
                    >
                      {t("wbs.outdent")}
                    </button>
                    {onMoveUp && (
                      <button
                        type="button"
                        className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        onClick={() => onMoveUp(node.task)}
                      >
                        ↑
                      </button>
                    )}
                    {onMoveDown && (
                      <button
                        type="button"
                        className="rounded bg-zinc-100 px-2 py-1 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        onClick={() => onMoveDown(node.task)}
                      >
                        ↓
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
