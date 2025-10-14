import React, { useMemo, useState } from "react"
import type { Column, Task } from "@/types/domain"
import { KanbanColumn } from "./kanban-column"
import { t } from "@/lib/i18n"

export type KanbanBoardProps = {
  projectId: string
  columns: Column[]
  tasksByColumn: Record<string, Task[]>
  onTaskMove: (taskId: string, toColumnId: string, toIndex: number) => Promise<void>
  onColumnReorder: (ordered: { columnId: string, sortIndex: number }[]) => Promise<void>
  onAddTask: (columnId: string) => void
  filters?: {
    assigneeId?: string
    tagId?: string
    q?: string
  }
  loading?: boolean
  onOpenTask: (taskId: string) => void
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasksByColumn,
  onAddTask,
  onTaskMove,
  onColumnReorder,
  onOpenTask,
}) => {
  const [dragColId, setDragColId] = useState<string | null>(null)

  const orderedColumns = useMemo(
    () => [...columns].sort((a, b) => a.sortIndex - b.sortIndex),
    [columns]
  )

  function reorderByIndex(sourceId: string, targetIndex: number) {
    const arr = [...orderedColumns]
    const srcIdx = arr.findIndex((c) => c.id === sourceId)
    if (srcIdx < 0) return
    const [moved] = arr.splice(srcIdx, 1)
    const clamped = Math.max(0, Math.min(targetIndex, arr.length))
    arr.splice(clamped, 0, moved)
    const ordered = arr.map((c, i) => ({ columnId: c.id, sortIndex: (i + 1) * 1000 }))
    void onColumnReorder(ordered)
  }

  function moveColumn(colId: string, dir: -1 | 1) {
    const arr = [...orderedColumns]
    const idx = arr.findIndex((c) => c.id === colId)
    const swapWith = arr[idx + dir]
    if (!swapWith) return
    const [moved] = arr.splice(idx, 1)
    arr.splice(idx + dir, 0, moved)
    const ordered = arr.map((c, i) => ({ columnId: c.id, sortIndex: (i + 1) * 1000 }))
    void onColumnReorder(ordered)
  }
  return (
    <div
      className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto p-4"
      role="list"
      aria-label="kanban-columns"
    >
      {orderedColumns.map((col, idx) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={(tasksByColumn[col.id] ?? []).sort(
              (a, b) => a.sortIndex - b.sortIndex
            )}
            onTaskDrop={(taskId, toIndex) => void onTaskMove(taskId, col.id, toIndex)}
            onAddTask={() => onAddTask(col.id)}
            onEditColumn={() => {}}
            onHeaderDragStart={(columnId) => setDragColId(columnId)}
            onHeaderDragOver={() => { /* no-op for now, but prevents defaults in child */ }}
            onHeaderDrop={() => {
              if (!dragColId) return
              reorderByIndex(dragColId, idx)
              setDragColId(null)
            }}
            onHeaderKeyReorder={(columnId, dir) => moveColumn(columnId, dir)}
            onOpenTask={onOpenTask}
          />
        ))}
      {/* 簡易的な列並べ替えUI（キーボード操作可能） */}
      <div className="sr-only" aria-live="polite">{t("kanban.reorderHint")}</div>
      <div className="fixed bottom-4 right-4 flex gap-2">
        {orderedColumns.map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <button
              type="button"
              className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
              onClick={() => moveColumn(c.id, -1)}
            >
              ← {c.name}
            </button>
            <button
              type="button"
              className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
              onClick={() => moveColumn(c.id, 1)}
            >
              {c.name} →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
