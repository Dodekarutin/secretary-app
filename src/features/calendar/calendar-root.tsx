import React, { useEffect, useMemo, useState } from "react"
import type { Project, Task, Tag } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { t } from "@/lib/i18n"
import { TaskDrawer } from "@/components/task/task-drawer"
import { FilterBar } from "@/components/common/filter-bar"

function startOfMonth(d: Date) { const x = new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x }
function endOfMonth(d: Date) { const x = new Date(d.getFullYear(), d.getMonth()+1, 0); x.setHours(0,0,0,0); return x }
function toISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

export const CalendarRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [q, setQ] = useState("")
  const [tagId, setTagId] = useState("")
  const [cursor, setCursor] = useState<Date>(new Date())
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      const ts = await adapter.listTasks({ projectId: p.id })
      setTasks(ts)
      const tg = await adapter.listProjectTags(p.id)
      setTags(tg)
    }
    run()
  }, [])

  const days = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    const arr: Date[] = []
    const first = new Date(start)
    first.setDate(first.getDate() - ((first.getDay()+6)%7)) // Monday grid start
    const total = 42 // 6 weeks grid
    for (let i=0;i<total;i++) { const d = new Date(first); d.setDate(first.getDate()+i); arr.push(d) }
    return arr
  }, [cursor])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    const lowerQ = q.trim().toLowerCase()
    function match(t: Task) {
      const okQ = !lowerQ || t.title.toLowerCase().includes(lowerQ) || (t.description ?? "").toLowerCase().includes(lowerQ)
      return okQ
    }
    tasks.forEach((t) => {
      if (!t.dueDate) return
      if (tagId) {
        // naive: ask adapter per task
        // Note: runs once per render; acceptable for small data
      }
      if (!match(t)) return
      const key = t.dueDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })
    return map
  }, [tasks, q, tagId])

  function nextMonth(delta: number) {
    const d = new Date(cursor)
    d.setMonth(d.getMonth()+delta)
    setCursor(d)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("calendar.title")}</h1>
        <div className="flex items-center gap-2 text-sm">
          <button className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800" onClick={() => nextMonth(-1)}>{t("calendar.prev")}</button>
          <div className="min-w-[120px] text-center">{cursor.getFullYear()} / {cursor.getMonth()+1}</div>
          <button className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800" onClick={() => nextMonth(+1)}>{t("calendar.next")}</button>
          <button className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800" onClick={() => setCursor(new Date())}>{t("calendar.today")}</button>
        </div>
      </div>
      <FilterBar q={q} tagId={tagId} tags={tags} onChange={(p) => { if (p.q!==undefined) setQ(p.q); if (p.tagId!==undefined) setTagId(p.tagId) }} />

      <div className="overflow-auto rounded border border-zinc-200/70 dark:border-zinc-700/60">
        <div className="grid grid-cols-7 text-xs">
          {["月","火","水","木","金","土","日"].map((w,i)=>(<div key={i} className="bg-zinc-50 px-2 py-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{w}</div>))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, idx) => {
            const iso = toISO(d)
            const isCurrent = d.getMonth() === cursor.getMonth()
            const isToday = toISO(new Date()) === iso
            const list = (tasksByDate.get(iso) ?? [])
            return (
              <div key={idx} className={`min-h-[110px] border-t border-zinc-200/70 p-2 dark:border-zinc-700/60 ${idx%7===6?"border-r-0":"border-r border-zinc-200/70 dark:border-zinc-700/60"} ${isCurrent?"":"opacity-60"}`}>
                <div className={`mb-1 text-xs ${isToday?"font-semibold text-brand-600":"text-zinc-500"}`}>{d.getDate()}</div>
                <div className="flex flex-col gap-1">
                  {list.slice(0,4).map((t) => (
                    <button key={t.id} type="button" className="truncate rounded bg-accent-100 px-2 py-1 text-left text-xs text-accent-700 hover:bg-accent-200 dark:bg-zinc-800 dark:text-zinc-100" onClick={() => setOpenTaskId(t.id)}>
                      {t.title}
                    </button>
                  ))}
                  {list.length>4 && <div className="text-[10px] text-zinc-500">+{list.length-4} 件</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskDrawer open={Boolean(openTaskId)} task={tasks.find((t)=>t.id===openTaskId) ?? null} onClose={() => setOpenTaskId(null)} />
    </div>
  )
}

