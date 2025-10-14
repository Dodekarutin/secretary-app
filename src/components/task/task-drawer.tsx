import React, { useEffect, useRef, useState } from "react"
import type { ChecklistItem, Comment, Project, Task, Tag, Member, User } from "@/types/domain"
import { useAdapter } from "@/adapters/adapter-context"
import { t } from "@/lib/i18n"

export type TaskDrawerProps = {
  open: boolean
  task: Task | null
  onClose: () => void
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({ open, task, onClose }) => {
  const { adapter } = useAdapter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newChecklist, setNewChecklist] = useState("")
  const [newComment, setNewComment] = useState("")
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)
  const [dateError, setDateError] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [taskTags, setTaskTags] = useState<Tag[]>([])
  const [savingAll, setSavingAll] = useState(false)
  const [savedMsg, setSavedMsg] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [assignees, setAssignees] = useState<User[]>([])
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!task) return
      setTitle(task.title)
      setDescription(task.description ?? "")
      setStartDate(task.startDate)
      setDueDate(task.dueDate)
      const [cl, cm] = await Promise.all([
        adapter.listChecklist(task.id),
        adapter.listComments(task.id),
      ])
      setChecklist(cl)
      setComments(cm)
      const tags = await adapter.listProjectTags(task.projectId)
      setAvailableTags(tags)
      const ttags = await adapter.listTaskTags(task.id)
      setTaskTags(ttags)
      const mem = await adapter.listProjectMembers(task.projectId)
      setMembers(mem)
      const assignedIds = await adapter.listTaskAssignees(task.id)
      const users: User[] = []
      for (const uid of assignedIds) {
        const u = await adapter.getUser(uid)
        if (u) users.push(u)
      }
      setAssignees(users)
    }
    run()
  }, [task])

  useEffect(() => {
    if (!open) return
    setTimeout(() => titleRef.current?.focus(), 0)
  }, [open])

  if (!open || !task) return null

  async function saveTitle() {
    if (!task) return
    const updated = await adapter.updateTask(task.id, { title })
  }
  async function saveDescription() {
    if (!task) return
    const updated = await adapter.updateTask(task.id, { description })
  }
  async function saveDates() {
    if (!task) return
    setDateError(null)
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      setDateError(t("task.drawer.invalidDate"))
      return
    }
    await adapter.updateTask(task.id, { startDate, dueDate })
  }
  async function saveAll() {
    if (!task) return
    setSavedMsg("")
    setSavingAll(true)
    setDateError(null)
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      setDateError(t("task.drawer.invalidDate"))
      setSavingAll(false)
      return
    }
    await adapter.updateTask(task.id, {
      title,
      description,
      startDate,
      dueDate,
    })
    setSavingAll(false)
    setSavedMsg(t("common.saved"))
    setTimeout(() => setSavedMsg(""), 2000)
  }
  async function addChecklist() {
    if (!task || !newChecklist.trim()) return
    const item = await adapter.addChecklist(task.id, newChecklist.trim())
    setChecklist((prev) => [...prev, item])
    setNewChecklist("")
  }
  async function toggleChecklist(itemId: string, done: boolean) {
    const it = await adapter.toggleChecklist(itemId, done)
    if (!it) return
    setChecklist((prev) => prev.map((x) => (x.id === it.id ? it : x)))
  }
  async function removeChecklist(itemId: string) {
    await adapter.removeChecklist(itemId)
    setChecklist((prev) => prev.filter((x) => x.id !== itemId))
  }
  async function addComment() {
    if (!task || !newComment.trim()) return
    const cm = await adapter.addComment(task.id, newComment.trim())
    setComments((prev) => [...prev, cm])
    setNewComment("")
  }
  async function removeComment(commentId: string) {
    await adapter.removeComment(commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  async function addAssignee(userId: string) {
    if (!task || !userId) return
    await adapter.assignTask(task.id, userId)
    const u = await adapter.getUser(userId)
    if (u && !assignees.find((x) => x.id === u.id)) setAssignees((prev) => [...prev, u])
  }
  async function removeAssignee(userId: string) {
    if (!task) return
    await adapter.unassignTask(task.id, userId)
    setAssignees((prev) => prev.filter((u) => u.id !== userId))
  }

  async function addTag(tagId: string) {
    if (!task || !tagId) return
    await adapter.addTagToTask(task.id, tagId)
    const ttags = await adapter.listTaskTags(task.id)
    setTaskTags(ttags)
  }
  async function removeTag(tagId: string) {
    if (!task) return
    await adapter.removeTagFromTask(task.id, tagId)
    setTaskTags((prev) => prev.filter((t) => t.id !== tagId))
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-full max-w-xl overflow-auto border-l border-zinc-200 bg-white p-6 shadow-float outline-none dark:border-zinc-800 dark:bg-zinc-900"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation()
            onClose()
            return
          }
          if (e.key !== "Tab") return
          const root = drawerRef.current
          if (!root) return
          const focusables = Array.from(root.querySelectorAll<HTMLElement>('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'))
          if (focusables.length === 0) return
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault()
              last.focus()
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault()
              first.focus()
            }
          }
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <input
              className="w-full border-b border-transparent bg-transparent text-xl font-semibold outline-none focus:border-zinc-300 dark:focus:border-zinc-700"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              ref={titleRef}
            />
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <label className="block">
                <div className="text-xs">{t("task.drawer.start")}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={startDate ?? ""}
                    onChange={(e) => setStartDate(e.target.value || undefined)}
                    onBlur={saveDates}
                  />
                  {startDate && (
                    <button type="button" className="text-xs text-zinc-500" onClick={() => { setStartDate(undefined); void saveDates() }}>{t("task.drawer.clear")}</button>
                  )}
                  <button type="button" className="text-xs text-zinc-500" onClick={() => { setStartDate(new Date().toISOString().slice(0,10)); void saveDates() }}>{t("date.today")}</button>
                </div>
              </label>
              <label className="block">
                <div className="text-xs">{t("task.drawer.due")}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={dueDate ?? ""}
                    onChange={(e) => setDueDate(e.target.value || undefined)}
                    onBlur={saveDates}
                  />
                  {dueDate && (
                    <button type="button" className="text-xs text-zinc-500" onClick={() => { setDueDate(undefined); void saveDates() }}>{t("task.drawer.clear")}</button>
                  )}
                  <button type="button" className="text-xs text-zinc-500" onClick={() => { const d=new Date(); d.setDate(d.getDate()+1); setDueDate(d.toISOString().slice(0,10)); void saveDates() }}>{t("date.tomorrow")}</button>
                  <button type="button" className="text-xs text-zinc-500" onClick={() => { const d=new Date(); const day=d.getDay(); const diff=(6-day+7)%7; d.setDate(d.getDate()+diff); setDueDate(d.toISOString().slice(0,10)); void saveDates() }}>{t("date.endOfWeek")}</button>
                  <button type="button" className="text-xs text-zinc-500" onClick={() => { const d=new Date(); const day=d.getDay(); const diff=(6-day+7)%7 + 7; d.setDate(d.getDate()+diff); setDueDate(d.toISOString().slice(0,10)); void saveDates() }}>{t("date.endOfNextWeek")}</button>
                  <button type="button" className="text-xs text-zinc-500" onClick={() => { const d=new Date(); d.setMonth(d.getMonth()+1); d.setDate(0); setDueDate(d.toISOString().slice(0,10)); void saveDates() }}>{t("date.endOfMonth")}</button>
                </div>
              </label>
            </div>
            {dateError && (
              <div className="mt-1 text-xs text-red-500">{dateError}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
          >
            {t("task.drawer.close")}
          </button>
        </div>
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{t("task.drawer.focusHint")}</span>
          <button
            type="button"
            onClick={saveAll}
            disabled={savingAll}
            className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {savingAll ? t("common.saving") : t("common.save")}
          </button>
        </div>
        {savedMsg && <div className="mb-2 text-xs text-emerald-600">{savedMsg}</div>}

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium">担当者</h2>
          <div className="mb-2 flex flex-wrap gap-2">
            {assignees.map((u) => (
              <span key={u.id} className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">
                {u.displayName}
                <button className="text-zinc-400" onClick={() => removeAssignee(u.id)}>×</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <select
              className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              onChange={(e) => { if (e.target.value) addAssignee(e.target.value); e.currentTarget.selectedIndex = 0 }}
            >
              <option value="">担当者を追加...</option>
              {members.filter((m) => !assignees.find((u) => u.id === m.userId)).map((m) => (
                <option key={m.id} value={m.userId}>{m.userId}</option>
              ))}
            </select>
            <InlineNewAssignee onCreated={async (userId)=>{
              await addAssignee(userId)
            }} />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium">{t("task.drawer.description")}</h2>
          <textarea
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
          />
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium">タグ</h2>
          <div className="mb-2 flex flex-wrap gap-2">
            {taskTags.map((tg) => (
              <span key={tg.id} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs" style={{ backgroundColor: `${tg.color}22`, color: tg.color }}>
                {tg.name}
                <button className="text-zinc-400" onClick={() => removeTag(tg.id)}>×</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <select className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" onChange={(e) => { if (e.target.value) addTag(e.target.value); e.currentTarget.selectedIndex = 0 }}>
              <option value="">タグを追加...</option>
              {availableTags.filter((x) => !taskTags.find((t) => t.id === x.id)).map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium">{t("task.drawer.checklist")}</h2>
          <div className="mb-2 flex gap-2">
            <input
              className="flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder={t("task.drawer.checklist.placeholder")}
              value={newChecklist}
              onChange={(e) => setNewChecklist(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addChecklist()
              }}
            />
            <button className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white" onClick={addChecklist}>{t("task.drawer.add")}</button>
          </div>
          <ul className="space-y-2 text-sm">
            {checklist.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center gap-2">
                <input type="checkbox" checked={it.done} onChange={(e) => toggleChecklist(it.id, e.target.checked)} />
                <input
                  className="min-w-[140px] flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={it.title}
                  onChange={(e) => {
                    const next = e.target.value
                    setChecklist((prev)=>prev.map((x)=> x.id===it.id ? { ...x, title: next } : x))
                  }}
                  onBlur={async (e) => { await adapter.updateChecklist(it.id, { title: e.target.value }) }}
                />
                <input
                  type="date"
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                  value={it.dueDate ?? ""}
                  onChange={async (e)=>{ await adapter.updateChecklist(it.id, { dueDate: e.target.value || undefined }); setChecklist((prev)=>prev.map((x)=> x.id===it.id ? { ...x, dueDate: e.target.value || undefined } : x)) }}
                />
                <select
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  value={it.assigneeId ?? ""}
                  onChange={async (e)=>{ await adapter.updateChecklist(it.id, { assigneeId: e.target.value || undefined }); setChecklist((prev)=>prev.map((x)=> x.id===it.id ? { ...x, assigneeId: e.target.value || undefined } : x)) }}
                >
                  <option value="">担当者</option>
                  {members.map((m)=>(
                    <option key={m.id} value={m.userId}>{m.userId}</option>
                  ))}
                </select>
                <button className="ml-auto rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" onClick={() => removeChecklist(it.id)}>
                  {t("task.drawer.delete")}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium">{t("task.drawer.comments")}</h2>
          <div className="mb-2 flex gap-2">
            <input
              className="flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder={t("task.drawer.comments.placeholder")}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { addComment() }
                else if (e.key === "Enter" && !e.shiftKey) { addComment() }
              }}
            />
            <button className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white" onClick={addComment}>{t("task.drawer.add")}</button>
          </div>
          <ul className="space-y-3 text-sm">
            {comments.map((c) => (
              <li key={c.id} className="rounded border border-zinc-200 p-2 dark:border-zinc-700">
                <div className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleString("ja-JP")}</div>
                <div>{c.body}</div>
                <button className="mt-1 rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" onClick={() => removeComment(c.id)}>
                  {t("task.drawer.delete")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}

const InlineNewAssignee: React.FC<{ onCreated: (userId: string) => void }> = ({ onCreated }) => {
  const { adapter } = useAdapter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <div className="inline-flex items-center gap-2">
      {!open ? (
        <button type="button" className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" onClick={()=>setOpen(true)}>新規担当者を作成</button>
      ) : (
        <>
          <input className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800" placeholder="氏名" value={name} onChange={(e)=>setName(e.target.value)} />
          <input className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800" placeholder="メール" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <button type="button" disabled={busy || !name.trim() || !email.trim()} className="rounded bg-brand-600 px-2 py-1 text-xs text-white disabled:opacity-50" onClick={async ()=>{
            setBusy(true)
            try {
              const u = await adapter.addUser(email.trim(), name.trim())
              // 既定ロール editor で現在のプロジェクトへ追加するには呼び出し元でprojectが必要だが、ここではユーザー作成のみとして、assign時にmemberでなくても許容
              onCreated(u.id)
              setOpen(false)
              setName("")
              setEmail("")
            } finally {
              setBusy(false)
            }
          }}>作成</button>
          <button type="button" className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" onClick={()=>setOpen(false)}>キャンセル</button>
        </>
      )}
    </div>
  )
}

