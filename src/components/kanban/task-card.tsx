import React from "react"
import type { Task, Tag } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { useUndo } from "@/lib/undo-context"
import { CompleteTaskCommand } from "@/lib/commands"
import { t } from "@/lib/i18n"

export type TaskCardProps = {
  task: Task
  onClick: (taskId: string) => void
  onDragStart?: (taskId: string) => void
  onDragEnd?: () => void
  onTaskUpdate?: () => void
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDragStart, onDragEnd, onTaskUpdate }) => {
  const { adapter } = useAdapter()
  const { undoManager } = useUndo()
  const [tags, setTags] = React.useState<Tag[]>([])
  const [columns, setColumns] = React.useState<any[]>([])

  React.useEffect(() => {
    let ignore = false
    ;(async () => {
      const t = await adapter.listTaskTags(task.id)
      if (!ignore) setTags(t)
    })()
    return () => { ignore = true }
  }, [adapter, task.id])

  React.useEffect(() => {
    let ignore = false
    ;(async () => {
      const cols = await adapter.getBoardColumns(task.projectId)
      if (!ignore) setColumns(cols)
    })()
    return () => { ignore = true }
  }, [adapter, task.projectId])

  const isCompleted = task.progress === 100

  const handleToggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const doneColumn = columns.find((c) => c.name === "Done")
    if (!doneColumn) return

    // 完了にする場合は現在の列を保存、未完了にする場合は最初の列（To Do）に戻す
    const targetColumnId = isCompleted 
      ? columns.find((c) => c.name === "To Do")?.id || columns[0]?.id || task.columnId
      : task.columnId

    const command = new CompleteTaskCommand(
      adapter,
      task.id,
      task,
      !isCompleted,
      doneColumn.id,
      targetColumnId
    )

    await undoManager.executeCommand(command)
    onTaskUpdate?.()
  }
  return (
    <article
      className={`cursor-pointer rounded-md border p-3 text-sm shadow-sm transition hover:shadow-md ${
        isCompleted
          ? "border-green-200/80 bg-green-50 dark:border-green-700/60 dark:bg-green-900/20"
          : "border-zinc-200/80 bg-white dark:border-zinc-700/60 dark:bg-zinc-800"
      }`}
      onClick={() => onClick(task.id)}
      aria-label={`task-${task.title}`}
      data-task-id={task.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/task-id", task.id)
        onDragStart?.(task.id)
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className={`flex-1 font-medium ${isCompleted ? "text-zinc-500 line-through dark:text-zinc-400" : "text-zinc-800 dark:text-zinc-100"}`}>
          {task.title}
        </div>
        <button
          onClick={handleToggleComplete}
          className={`flex-shrink-0 rounded p-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
            isCompleted ? "text-green-600 dark:text-green-400" : "text-zinc-400 dark:text-zinc-500"
          }`}
          aria-label={isCompleted ? t("task.uncomplete") : t("task.complete")}
          title={isCompleted ? t("task.uncomplete") : t("task.complete")}
        >
          {isCompleted ? (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
            </svg>
          )}
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {typeof task.progress === "number" && (
          <span className="inline-flex items-center rounded bg-accent-100 px-1.5 py-0.5 text-accent-700">
            {task.progress}%
          </span>
        )}
        {task.dueDate && (
          <span className={(new Date(task.dueDate) < new Date() && (task.progress ?? 0) < 100) ? "text-red-500" : ""}>
            期限: {task.dueDate}
          </span>
        )}
        {tags.length > 0 && (
          <span className="inline-flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tg) => (
              <span key={tg.id} className="inline-flex items-center rounded px-1.5 py-0.5" style={{ backgroundColor: `${tg.color}22`, color: tg.color }}>
                {tg.name}
              </span>
            ))}
            {tags.length > 3 && <span className="text-zinc-400">+{tags.length - 3}</span>}
          </span>
        )}
      </div>
    </article>
  )
}
