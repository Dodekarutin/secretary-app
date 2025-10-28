import type { Task, Id } from "@/types/domain"

export type WbsNode = {
  id: Id
  task: Task
  children: WbsNode[]
  level: number
  indexAmongSiblings: number
}

export function buildTree(tasks: Task[]): WbsNode[] {
  const byId = new Map<string, Task>()
  for (const t of tasks) byId.set(t.id, t)
  const childrenMap = new Map<string, Task[]>()
  const roots: Task[] = []
  for (const t of tasks) {
    const pid = t.parentId
    if (pid && byId.has(pid)) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, [])
      childrenMap.get(pid)!.push(t)
    } else {
      roots.push(t)
    }
  }
  const sortByIndex = (a: Task, b: Task) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0)
  roots.sort(sortByIndex)
  for (const [, arr] of childrenMap) arr.sort(sortByIndex)

  function toNode(t: Task, level: number, index: number): WbsNode {
    const kids = (childrenMap.get(t.id) ?? []).map((c, i) => toNode(c, level + 1, i))
    return { id: t.id, task: t, children: kids, level, indexAmongSiblings: index }
  }

  return roots.map((t, i) => toNode(t, 0, i))
}

export function wbsNumber(node: WbsNode, parentNumber?: string): string {
  const self = String(node.indexAmongSiblings + 1)
  return parentNumber ? `${parentNumber}.${self}` : self
}

export function rollupEstimatedHours(node: WbsNode): number {
  const self = node.task.estimatedHours ?? 0
  if (node.children.length === 0) return self
  return self + node.children.reduce((sum, c) => sum + rollupEstimatedHours(c), 0)
}

export function rollupDates(node: WbsNode): { start?: string; due?: string } {
  const dates = [] as { start?: string; due?: string }[]
  for (const c of node.children) dates.push(rollupDates(c))
  dates.push({ start: node.task.startDate, due: node.task.dueDate })
  const starts = dates.map(d => d.start).filter(Boolean) as string[]
  const dues = dates.map(d => d.due).filter(Boolean) as string[]
  const start = starts.length ? starts.sort()[0] : undefined
  const due = dues.length ? dues.sort()[dues.length - 1] : undefined
  return { start, due }
}

export function rollupProgressWeighted(node: WbsNode): number {
  // weight by estimatedHours (default 1)
  let sum = 0
  let weight = 0
  function visit(n: WbsNode) {
    const w = (n.task.estimatedHours ?? 1)
    const p = Math.max(0, Math.min(100, n.task.progress ?? 0))
    sum += p * w
    weight += w
    for (const c of n.children) visit(c)
  }
  visit(node)
  return weight === 0 ? 0 : Math.round((sum / weight) * 100) / 100
}

export function reindexSiblings(nodes: Task[], gap = 1000): Task[] {
  const next = [...nodes]
  next.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
  let idx = gap
  for (const n of next) {
    n.sortIndex = idx
    idx += gap
  }
  return next
}

