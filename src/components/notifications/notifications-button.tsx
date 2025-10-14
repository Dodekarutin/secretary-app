import React, { useEffect, useMemo, useState } from "react"
import type { Project, Task, Comment as Cmt } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"

type Item = { id: string; type: "due_soon" | "overdue" | "comment"; title: string; at?: string }

export const NotificationsButton: React.FC = () => {
  const { adapter } = useAdapter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      const tasks = await adapter.listTasks({ projectId: p.id })
      const now = new Date()
      const todayISO = now.toISOString()
      const out: Item[] = []
      for (const t of tasks) {
        if (t.dueDate) {
          const due = new Date(t.dueDate)
          const days = Math.floor((due.getTime() - (new Date().setHours(0,0,0,0))) / 86400000)
          if ((t.progress ?? 0) < 100) {
            if (days < 0) out.push({ id: `ov-${t.id}`, type: "overdue", title: `期限超過: ${t.title}`, at: t.dueDate })
            else if (days <= 3) out.push({ id: `ds-${t.id}`, type: "due_soon", title: `期限接近(${days}日): ${t.title}`, at: t.dueDate })
          }
        }
        const cs = await adapter.listComments(t.id)
        const recent = cs.filter((c) => new Date(c.createdAt).getTime() > (Date.now() - 24*60*60*1000))
        for (const c of recent) out.push({ id: `cm-${c.id}`, type: "comment", title: `新しいコメント: ${t.title}`, at: c.createdAt })
      }
      setItems(out)
    }
    run()
  }, [adapter])

  const count = items.length

  return (
    <div className="relative">
      <button type="button" className="rounded-full border border-zinc-300/70 bg-white/70 px-3 py-1 backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70" onClick={() => setOpen((v) => !v)}>
        🔔{count > 0 && <span className="ml-1 rounded bg-red-500 px-1 text-xs text-white">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded border border-zinc-200/70 bg-white p-2 text-sm shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900">
          {items.length === 0 ? (
            <div className="p-2 text-zinc-500">通知はありません</div>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-auto">
              {items.map((it) => (
                <li key={it.id} className="rounded px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <div>{it.title}</div>
                  {it.at && <div className="text-[10px] text-zinc-500">{new Date(it.at).toLocaleString("ja-JP")}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

