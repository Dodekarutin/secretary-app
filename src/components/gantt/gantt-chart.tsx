import React from "react"
import type { Task } from "@/types/domain"
import { t } from "@/lib/i18n"

export type GanttChartProps = {
  tasks: Task[]
  view: "month" | "week" | "day"
  onDateChange?: (taskId: string, start?: string, due?: string) => void
  onProgressChange?: (taskId: string, progress: number) => void
  dependencies?: { taskId: string; dependsOnTaskId: string }[]
  selectedId?: string | null
  onSelect?: (taskId: string) => void
  groups?: { title: string; tasks: Task[] }[]
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addDaysISO(iso: string | undefined, delta: number): string | undefined {
  const d = iso ? new Date(iso) : new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function diffDays(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, view, onDateChange, onProgressChange, dependencies = [], selectedId, onSelect, groups }) => {
  const [hovered, setHovered] = React.useState<string | null>(null)
  const related = React.useMemo(() => {
    if (!hovered) return new Set<string>()
    const set = new Set<string>([hovered])
    for (const d of dependencies) {
      if (d.taskId === hovered) set.add(d.dependsOnTaskId)
      if (d.dependsOnTaskId === hovered) set.add(d.taskId)
    }
    return set
  }, [hovered, dependencies])
  const today = startOfDay(new Date())
  // determine timeline range
  let min = today
  let max = startOfDay(new Date(today.getTime() + 86400000 * 14))
  for (const t of tasks) {
    if (t.startDate) {
      const d = startOfDay(new Date(t.startDate))
      if (d < min) min = d
    }
    if (t.dueDate) {
      const d = startOfDay(new Date(t.dueDate))
      if (d > max) max = d
    }
  }
  // pad a bit
  min = startOfDay(new Date(min.getTime() - 86400000 * 3))
  max = startOfDay(new Date(max.getTime() + 86400000 * 3))

  const days = Math.max(1, diffDays(min, max) + 1)
  const dayWidth = view === "day" ? 40 : view === "week" ? 28 : 24
  const headers: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(min.getTime() + 86400000 * i)
    // 月ビューでは日付数字のみ、それ以外でも基本は日付数字
    const label = `${d.getDate()}`
    headers.push(label)
  }

  type MonthGroup = { start: number; span: number; label: string }
  const monthGroups: MonthGroup[] = []
  // 常に「月」単位でのグループを表示
  let gi = 0
  while (gi < days) {
    const d = new Date(min.getTime() + 86400000 * gi)
    const month = d.getMonth()
    let span = 1
    while (gi + span < days) {
      const d2 = new Date(min.getTime() + 86400000 * (gi + span))
      if (d2.getMonth() !== month) break
      span++
    }
    monthGroups.push({ start: gi, span, label: `${d.getFullYear()}/${month + 1}` })
    gi += span
  }

  // 狭い幅のときラベル間引き（重なり防止）
  let dayLabelStep = 1
  if (dayWidth < 26) dayLabelStep = 2
  if (dayWidth < 20) dayLabelStep = 3

  // --- ドラッグで日付変更（開始/期限） ---
  const dayHeaderRef = React.useRef<HTMLDivElement | null>(null)
  const [pxPerDay, setPxPerDay] = React.useState(0)
  React.useEffect(() => {
    function recalc() {
      const el = dayHeaderRef.current
      if (!el) return
      const total = el.clientWidth - 200 // 先頭の固定列分
      if (total > 0) setPxPerDay(total / days)
    }
    recalc()
    window.addEventListener("resize", recalc)
    return () => window.removeEventListener("resize", recalc)
  }, [days])

  const [drag, setDrag] = React.useState<{
    taskId: string
    edge: "start" | "end"
    originX: number
    startIdx: number
    endIdx: number
    curStart: number
    curEnd: number
  } | null>(null)

  React.useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag || !pxPerDay) return
      const deltaDays = Math.round((e.clientX - drag.originX) / pxPerDay)
      let s = drag.startIdx
      let eidx = drag.endIdx
      if (drag.edge === "start") s = drag.startIdx + deltaDays
      else eidx = drag.endIdx + deltaDays
      s = Math.max(0, Math.min(s, eidx))
      eidx = Math.min(days - 1, Math.max(eidx, s))
      setDrag({ ...drag, curStart: s, curEnd: eidx })
    }
    function onUp() {
      if (!drag) return
      const startDate = new Date(min.getTime() + 86400000 * drag.curStart)
      const dueDate = new Date(min.getTime() + 86400000 * drag.curEnd)
      onDateChange?.(drag.taskId, toISODate(startDate), toISODate(dueDate))
      setDrag(null)
    }
    if (drag) {
      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp, { once: true })
    }
    return () => {
      window.removeEventListener("mousemove", onMove)
    }
  }, [drag, pxPerDay, days, min, onDateChange])

  function onStartMinus(task: Task) {
    onDateChange?.(task.id, addDaysISO(task.startDate, -1), task.dueDate)
  }
  function onStartPlus(task: Task) {
    onDateChange?.(task.id, addDaysISO(task.startDate, +1), task.dueDate)
  }
  function onDueMinus(task: Task) {
    onDateChange?.(task.id, task.startDate, addDaysISO(task.dueDate, -1))
  }
  function onDuePlus(task: Task) {
    onDateChange?.(task.id, task.startDate, addDaysISO(task.dueDate, +1))
  }

  return (
    <div className="overflow-auto p-4">
      {/* Timeline header */}
      <div className="sticky top-0 z-10 overflow-hidden rounded border border-zinc-200/70 bg-white/70 backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <div className="border-b border-zinc-200/70 dark:border-zinc-700/60">
          {/* group row */}
          <div
            className="grid text-center text-xs text-zinc-600 dark:text-zinc-400"
            style={{ gridTemplateColumns: `200px repeat(${days}, minmax(${dayWidth}px, 1fr))` }}
          >
            <div className="px-2 py-1 text-left">Task</div>
            {monthGroups.map((g, idx) => (
              <div key={idx} className="px-1 py-1 font-medium border-l border-transparent" style={{ gridColumn: `${g.start + 2} / span ${g.span}` }}>
                {g.label}
              </div>
            ))}
          </div>
          {/* day row */}
          <div
            className="grid border-t border-zinc-200/70 text-center text-[10px] text-zinc-600 dark:border-zinc-700/60 dark:text-zinc-400"
            style={{ gridTemplateColumns: `200px repeat(${days}, minmax(${dayWidth}px, 1fr))` }}
            ref={dayHeaderRef}
          >
            <div className="px-2 py-1 text-left"></div>
            {headers.map((h, i) => (
              <div key={i} className="px-1 py-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {(i % dayLabelStep === 0) ? h : ""}
              </div>
            ))}
          </div>
        </div>
        {/* Rows */}
        <div>
          {(groups && groups.length > 0 ? groups.flatMap(g => [{ __group: true, title: g.title } as any, ...g.tasks]) : tasks).map((entry, idx) => {
            if ((entry as any).__group) {
              const title = (entry as any).title as string
              return (
                <div key={`grp-${idx}`} className="grid items-center bg-zinc-50/60 text-xs font-medium text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300" style={{ gridTemplateColumns: `180px repeat(${days}, minmax(${dayWidth}px, 1fr))` }}>
                  <div className="px-2 py-1">{title}</div>
                  <div className="col-span-full border-b border-zinc-200/70 dark:border-zinc-700/60" />
                </div>
              )
            }
            const task = entry as Task
            const start = task.startDate ? startOfDay(new Date(task.startDate)) : min
            const due = task.dueDate ? startOfDay(new Date(task.dueDate)) : start
            const baseStartIdx = Math.max(0, diffDays(min, start))
            const baseEndIdx = Math.min(days - 1, diffDays(min, due))
            const startIdx = drag && drag.taskId === task.id ? drag.curStart : baseStartIdx
            const endIdx = drag && drag.taskId === task.id ? drag.curEnd : baseEndIdx
            const length = Math.max(1, endIdx - startIdx + 1)
            const overdue = task.dueDate && new Date(task.dueDate) < today && (task.progress ?? 0) < 100
            return (
              <div
                key={task.id}
                className="grid items-center border-t border-zinc-200/70 dark:border-zinc-700/60"
                style={{ gridTemplateColumns: `180px repeat(${days}, minmax(${dayWidth}px, 1fr))` }}
              >
                <div className={`px-2 py-1 ${selectedId === task.id ? "bg-accent-50 dark:bg-zinc-800/50" : ""}`}>
                  <button
                    type="button"
                    className="text-left text-xs font-medium hover:underline"
                    onClick={() => onSelect?.(task.id)}
                  >
                    {task.title}
                  </button>
                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    {(task.startDate ?? "?") + " → "}
                    <span className={overdue ? "text-red-500" : ""}>{task.dueDate ?? "?"}</span>
                  </div>
                </div>
                <div className="col-span-full relative px-1 py-1" onMouseEnter={() => setHovered(task.id)} onMouseLeave={() => setHovered(null)}>
                  <div className="relative h-4">
                    {/* grid underlay */}
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, minmax(${dayWidth}px, 1fr))` }}>
                      {Array.from({ length: days }).map((_, i) => (
                        <div key={i} className="border-l border-zinc-200/70 dark:border-zinc-700/60" />
                      ))}
                    </div>
                    {/* bar container (full duration) */}
                    <div
                      className={`absolute top-0.5 h-3 rounded bg-accent-200 ${overdue ? "ring-2 ring-red-400" : ""}`}
                      style={{ left: `calc((${startIdx} / ${days}) * 100%)`, width: `calc((${length} / ${days}) * 100%)` }}
                      onClick={() => onSelect?.(task.id)}
                    >
                      {/* achieved progress within duration */}
                      <div
                        className={`h-3 rounded ${selectedId === task.id ? "ring-2 ring-accent-400" : ""} ${related.size === 0 || related.has(task.id) ? "bg-brand-600" : "bg-brand-600/40"}`}
                        style={{ width: `${Math.max(0, Math.min(100, task.progress ?? 0))}%` }}
                      />
                      {/* percent label */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white">
                        {Math.max(0, Math.min(100, task.progress ?? 0))}%
                      </div>
                      <div
                        className="absolute left-0 top-0 h-3 w-2 cursor-ew-resize bg-zinc-900/40"
                        onMouseDown={(e) => setDrag({ taskId: task.id, edge: "start", originX: e.clientX, startIdx: baseStartIdx, endIdx: baseEndIdx, curStart: baseStartIdx, curEnd: baseEndIdx })}
                        title="開始日をドラッグで変更"
                      />
                      <div
                        className="absolute right-0 top-0 h-3 w-2 cursor-ew-resize bg-zinc-900/40"
                        onMouseDown={(e) => setDrag({ taskId: task.id, edge: "end", originX: e.clientX, startIdx: baseStartIdx, endIdx: baseEndIdx, curStart: baseStartIdx, curEnd: baseEndIdx })}
                        title="期限をドラッグで変更"
                      />
                    </div>
                    {/* dependency markers (simple) */}
                    {dependencies.filter(d => d.taskId === task.id).map((d, i) => (
                      <div key={i} className="absolute top-0 right-0 h-6 w-0.5 bg-accent-600/70" title={`depends on ${d.dependsOnTaskId}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* per-task controls removed in favor of header toolbar selection */}
    </div>
  )
}
