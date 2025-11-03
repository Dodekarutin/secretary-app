import React, { useEffect, useRef, useState } from "react"
import type { Task } from "@/types/domain"
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
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)
  const [dateError, setDateError] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [savedMsg, setSavedMsg] = useState("")
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!task) return
      setTitle(task.title)
      setDescription(task.description ?? "")
      setStartDate(task.startDate)
      setDueDate(task.dueDate)
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
    await adapter.updateTask(task.id, { title })
  }
  
  async function saveDescription() {
    if (!task) return
    await adapter.updateTask(task.id, { description })
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

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-auto border-l border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/50 shadow-2xl outline-none dark:border-zinc-700/80 dark:from-zinc-900 dark:to-zinc-900/50"
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
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 px-8 py-6 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <input
                className="w-full border-b-2 border-transparent bg-transparent text-2xl font-bold text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                placeholder="タスク名を入力..."
                ref={titleRef}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label="閉じる"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Save Button & Status */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {savedMsg && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {savedMsg}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={saveAll}
              disabled={savingAll}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              {savingAll ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("common.saving")}
                </span>
              ) : (
                t("common.save")
              )}
            </button>
          </div>

          {/* Date Section */}
          <div className="mb-8 rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/50">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              期間
            </h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Start Date */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {t("task.drawer.start")}
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:border-brand-400"
                    value={startDate ?? ""}
                    onChange={(e) => setStartDate(e.target.value || undefined)}
                    onBlur={saveDates}
                  />
                  <div className="flex flex-wrap gap-2">
                    {startDate && (
                      <button
                        type="button"
                        className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        onClick={() => { setStartDate(undefined); void saveDates() }}
                      >
                        {t("task.drawer.clear")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50"
                      onClick={() => { setStartDate(new Date().toISOString().slice(0,10)); void saveDates() }}
                    >
                      {t("date.today")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {t("task.drawer.due")}
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:border-brand-400"
                    value={dueDate ?? ""}
                    onChange={(e) => setDueDate(e.target.value || undefined)}
                    onBlur={saveDates}
                  />
                  <div className="flex flex-wrap gap-2">
                    {dueDate && (
                      <button
                        type="button"
                        className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        onClick={() => { setDueDate(undefined); void saveDates() }}
                      >
                        {t("task.drawer.clear")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50"
                      onClick={() => { const d=new Date(); d.setDate(d.getDate()+1); setDueDate(d.toISOString().slice(0,10)); void saveDates() }}
                    >
                      {t("date.tomorrow")}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50"
                      onClick={() => { const d=new Date(); const day=d.getDay(); const diff=(6-day+7)%7; d.setDate(d.getDate()+diff); setDueDate(d.toISOString().slice(0,10)); void saveDates() }}
                    >
                      {t("date.endOfWeek")}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50"
                      onClick={() => { const d=new Date(); d.setMonth(d.getMonth()+1); d.setDate(0); setDueDate(d.toISOString().slice(0,10)); void saveDates() }}
                    >
                      {t("date.endOfMonth")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {dateError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {dateError}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="mb-8 rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/50">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t("task.drawer.description")}
            </h2>
            <textarea
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:placeholder:text-zinc-600 dark:focus:border-brand-400"
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="タスクの詳細を記述..."
            />
          </div>

          {/* Keyboard Hint */}
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
            <kbd className="rounded bg-zinc-100 px-2 py-1 font-mono dark:bg-zinc-800">Esc</kbd>
            <span>で閉じる</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
