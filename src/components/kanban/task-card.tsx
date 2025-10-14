import React from "react"
import type { Task, Tag } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"

export type TaskCardProps = {
  task: Task
  onClick: (taskId: string) => void
  onDragStart?: (taskId: string) => void
  onDragEnd?: () => void
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDragStart, onDragEnd }) => {
  const { adapter } = useAdapter()
  const [tags, setTags] = React.useState<Tag[]>([])
  React.useEffect(() => {
    let ignore = false
    ;(async () => {
      const t = await adapter.listTaskTags(task.id)
      if (!ignore) setTags(t)
    })()
    return () => { ignore = true }
  }, [adapter, task.id])
  return (
    <article
      className="cursor-pointer rounded-md border border-zinc-200/80 bg-white p-3 text-sm shadow-sm transition hover:shadow-md dark:border-zinc-700/60 dark:bg-zinc-800"
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
      <div className="mb-1 font-medium text-zinc-800 dark:text-zinc-100">
        {task.title}
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
