import React, { useMemo, useRef } from "react"
import type { Column, Task } from "@/types/domain"
import { TaskCard } from "./task-card"
import { t } from "@/lib/i18n"

export type KanbanColumnProps = {
  column: Column
  tasks: Task[]
  onTaskDrop: (taskId: string, toIndex: number) => void
  onAddTask: () => void
  onEditColumn: () => void
  onHeaderDragStart?: (columnId: string) => void
  onHeaderDragOver?: (columnId: string, event: React.DragEvent) => void
  onHeaderDrop?: (columnId: string) => void
  onHeaderKeyReorder?: (columnId: string, dir: -1 | 1) => void
  onOpenTask: (taskId: string) => void
  onTaskUpdate?: () => void
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onAddTask,
  onTaskDrop,
  onHeaderDragStart,
  onHeaderDragOver,
  onHeaderDrop,
  onHeaderKeyReorder,
  onOpenTask,
  onTaskUpdate,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null)

  const orderedTasks = useMemo(() => [...tasks].sort((a, b) => a.sortIndex - b.sortIndex), [tasks])

  function computeDropIndex(clientY: number): number {
    const container = listRef.current
    if (!container) return orderedTasks.length
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-task-id]"))
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      if (clientY < mid) return i
    }
    return cards.length
  }

  return (
    <section
      className="flex h-full min-h-[60vh] flex-col rounded-md border border-zinc-200/70 bg-white/70 p-2 shadow-soft backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70"
      role="listitem"
      aria-label={`column-${column.name}`}
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        const taskId = e.dataTransfer.getData("text/task-id")
        if (!taskId) return
        const idx = computeDropIndex(e.clientY)
        onTaskDrop(taskId, idx)
      }}
    >
      <header
        className="mb-2 flex cursor-grab items-center justify-between px-1"
        draggable
        aria-grabbed="false"
        onDragStart={() => onHeaderDragStart?.(column.id)}
        onDragOver={(e) => {
          e.preventDefault()
          onHeaderDragOver?.(column.id, e)
        }}
        onDrop={() => onHeaderDrop?.(column.id)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            onHeaderKeyReorder?.(column.id, -1)
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            onHeaderKeyReorder?.(column.id, 1)
          }
        }}
      >
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {column.name}
        </h3>
        <div className="text-xs text-zinc-500">{orderedTasks.length}</div>
      </header>
      <div ref={listRef} className="flex flex-1 flex-col gap-2">
        {orderedTasks.map((t) => (
          <TaskCard key={t.id} task={t} onClick={onOpenTask} onTaskUpdate={onTaskUpdate} />
        ))}
      </div>
      <button
        type="button"
        onClick={onAddTask}
        className="mt-2 inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        {t("kanban.addTask")}
      </button>
    </section>
  )
}
