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
  onTaskUpdate?: () => void
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasksByColumn,
  onAddTask,
  onTaskMove,
  onColumnReorder,
  onOpenTask,
  onTaskUpdate,
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
            onTaskUpdate={onTaskUpdate}
          />
        ))}
      {/* 並べ替えUIを削除 */}
    </div>
  )
}
