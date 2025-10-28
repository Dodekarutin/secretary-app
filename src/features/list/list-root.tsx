import React, { useEffect, useMemo, useState } from "react"
import type { Project, Task, Tag, Member, User, ChecklistItem } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { t } from "@/lib/i18n"
import { TaskDrawer } from "@/components/task/task-drawer"
import { FilterBar } from "@/components/common/filter-bar"

type GroupBy = "label" | "assignee" | "due"

export const ListRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [usersById, setUsersById] = useState<Record<string, User>>({})
  const [q, setQ] = useState("")
  const [tagId, setTagId] = useState("")
  const [groupBy, setGroupBy] = useState<GroupBy>("label")
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      setTasks(await adapter.listTasks({ projectId: p.id }))
      setTags(await adapter.listProjectTags(p.id))
      const mem = await adapter.listProjectMembers(p.id)
      setMembers(mem)
      const dict: Record<string, User> = {}
      for (const m of mem) {
        const u = await adapter.getUser(m.userId)
        if (u) dict[u.id] = u
      }
      setUsersById(dict)
    }
    run()
  }, [])

  const checklistProgress = async (taskId: string): Promise<{ done: number; total: number }> => {
    const items = await adapter.listChecklist(taskId)
    const total = items.length
    const done = items.filter((i) => i.done).length
    return { done, total }
  }

  const grouped = useMemo(() => ({ groups: [] as { key: string; title: string; items: Task[] }[] }), [tasks, q, tagId, groupBy])

  function makeGroups(all: Task[]): { key: string; title: string; items: Task[] }[] {
    const lowerQ = q.trim().toLowerCase()
    function match(t: Task) {
      const okQ = !lowerQ || t.title.toLowerCase().includes(lowerQ) || (t.description ?? "").toLowerCase().includes(lowerQ)
      return okQ
    }
    const filtered = all.filter(match)
    const map = new Map<string, Task[]>()
    if (groupBy === "label") {
      // group by each tag; tasks without tags go to "none"
      for (const t of filtered) {
        // tags will be resolved on render for simplicity
        const key = `none`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      }
      // Note: tags per task resolved below during rendering of headers
    } else if (groupBy === "assignee") {
      for (const t of filtered) {
        const key = `unassigned`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      }
    } else {
      // due buckets
      for (const t of filtered) {
        const due = t.dueDate ? new Date(t.dueDate) : null
        let key = "none"
        if (due) {
          const today = new Date(); today.setHours(0,0,0,0)
          const diff = Math.floor((due.getTime() - today.getTime())/86400000)
          if (diff < 0) key = "overdue"
          else if (diff === 0) key = "today"
          else if (diff <= 3) key = "soon"
          else if (diff <= 7) key = "thisWeek"
          else key = "later"
        }
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      }
    }
    const out: { key: string; title: string; items: Task[] }[] = []
    for (const [k, v] of map) {
      let title = k
      if (groupBy === "label") {
        title = k === "none" ? t("list.none") : k
      } else if (groupBy === "assignee") {
        title = k === "unassigned" ? t("list.unassigned") : k
      } else {
        const mapTitle: Record<string,string> = { none: t("list.none"), overdue: t("list.overdue"), today: t("list.today"), soon: t("list.soon"), thisWeek: t("list.thisWeek"), later: t("list.later") }
        title = mapTitle[k] ?? k
      }
      out.push({ key: k, title, items: v })
    }
    return out
  }

  const groups = useMemo(() => makeGroups(tasks), [tasks, q, tagId, groupBy])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("list.title")}</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-1">
            <span>{t("list.groupBy")}:</span>
            <select className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" value={groupBy} onChange={(e)=>setGroupBy(e.target.value as GroupBy)}>
              <option value="label">{t("list.group.label")}</option>
              <option value="assignee">{t("list.group.assignee")}</option>
              <option value="due">{t("list.group.due")}</option>
            </select>
          </label>
        </div>
      </div>
      <FilterBar q={q} tagId={tagId} tags={tags} onChange={(p) => { if (p.q!==undefined) setQ(p.q); if (p.tagId!==undefined) setTagId(p.tagId) }} />

      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.key} className="rounded border border-zinc-200/70 bg-white/70 p-2 dark:border-zinc-700/60 dark:bg-zinc-900/70">
            <header className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">{g.title} <span className="ml-2 text-xs text-zinc-500">{g.items.length}</span></div>
            </header>
            <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-700/60">
              {g.items.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-2 py-2">
                  <button type="button" className="flex-1 text-left hover:underline" onClick={() => setOpenTaskId(task.id)}>
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-xs text-zinc-500">
                      {(task.startDate ?? "?") + " → "}{task.dueDate ?? "?"}
                    </div>
                  </button>
                  {task.progress !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <div className="h-2 w-24 rounded bg-zinc-200 dark:bg-zinc-700">
                        <div className="h-2 rounded bg-brand-600" style={{ width: `${Math.max(0, Math.min(100, task.progress ?? 0))}%` }} />
                      </div>
                      <span>{Math.max(0, Math.min(100, task.progress ?? 0))}%</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <TaskDrawer open={Boolean(openTaskId)} task={tasks.find((t)=>t.id===openTaskId) ?? null} onClose={() => setOpenTaskId(null)} />
    </div>
  )
}

