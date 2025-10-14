import React, { useEffect, useMemo, useState } from "react"
import { t } from "@/lib/i18n"
import { decomposeWithGemini, decomposeRequirements } from "@/lib/decomposer"
import { useAdapter } from "@/adapters/adapter-context"
import type { Column, Id, Project } from "@/types/domain"
import { getRuntimeGeminiApiKey } from "@/lib/aiClient"
import { navigate } from "@/lib/router"

export const DecomposerRoot: React.FC = () => {
  const { adapter } = useAdapter()
  const [project, setProject] = useState<Project | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [targetColumnId, setTargetColumnId] = useState<Id | "">("")

  const [text, setText] = useState("")
  const [items, setItems] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [defaultDue, setDefaultDue] = useState<string | "">("")
  const [goKanban, setGoKanban] = useState(true)

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject()
      setProject(p)
      const cols = await adapter.getBoardColumns(p.id)
      setColumns(cols)
      setTargetColumnId(cols[0]?.id ?? "")
      // parse columnId from hash query if present
      const hash = window.location.hash
      const qIndex = hash.indexOf("?")
      if (qIndex >= 0) {
        const qs = new URLSearchParams(hash.slice(qIndex + 1))
        const col = qs.get("columnId")
        if (col && cols.some((c) => c.id === col)) setTargetColumnId(col)
      }
    }
    run()
  }, [])

  function toggleAll(next: boolean) {
    if (next) {
      setSelected(new Set(items.map((_, i) => i)))
    } else {
      setSelected(new Set())
    }
  }

  function toggleIndex(i: number) {
    setSelected(prev => {
      const s = new Set(prev)
      if (s.has(i)) s.delete(i)
      else s.add(i)
      return s
    })
  }

  async function runDecompose() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      let out: string[] = []
      try {
        out = await decomposeWithGemini(text)
      } catch (e) {
        setError(t("decompose.error"))
        out = decomposeRequirements(text)
      }
      setItems(out)
      setSelected(new Set(out.map((_, i) => i)))
    } finally {
      setLoading(false)
    }
  }

  async function addTasks(indices: number[]) {
    if (!project || !targetColumnId) return
    const list = indices.map(i => items[i]).filter(Boolean)
    for (const title of list) {
      const t = await adapter.addTask(project.id, targetColumnId, title)
      if (defaultDue) {
        await adapter.updateTask(t.id, { dueDate: defaultDue })
      }
    }
    // feedback: clear selection
    setSelected(new Set())
    if (goKanban) navigate("/kanban")
  }

  const canAdd = project && targetColumnId && selected.size > 0

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("decompose.title")}</h1>
      {!getRuntimeGeminiApiKey() && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
          Gemini API キーが未設定です。ローカル分解で継続します。<button className="ml-2 underline" onClick={() => navigate("/settings")}>設定を開く</button>
        </div>
      )}
      <div className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <textarea
          className="w-full rounded border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          rows={5}
          placeholder={t("decompose.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={runDecompose}
            className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={loading || !text.trim()}
          >
            {loading ? t("decompose.loading") : t("decompose.run")}
          </button>
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">{t("decompose.results")}</div>
          <div className="flex items-center gap-2 text-xs">
            <button type="button" className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800" onClick={() => toggleAll(true)}>{t("decompose.selectAll")}</button>
            <button type="button" className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800" onClick={() => toggleAll(false)}>{t("decompose.clear")}</button>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">{t("dashboard.none")}</div>
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-2">
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggleIndex(i)} />
                <div className="text-sm">{it}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span>{t("decompose.targetColumn")}:</span>
            <select
              className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={targetColumnId}
              onChange={(e) => setTargetColumnId(e.target.value)}
            >
              {columns.sort((a,b)=>a.sortIndex-b.sortIndex).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span>{t("decompose.defaultDue")}:</span>
            <input
              type="date"
              className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={defaultDue}
              onChange={(e) => setDefaultDue(e.target.value)}
            />
            <button type="button" className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" onClick={() => setDefaultDue(new Date().toISOString().slice(0,10))}>{t("date.today")}</button>
            <button type="button" className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" onClick={() => { const d=new Date(); d.setDate(d.getDate()+1); setDefaultDue(d.toISOString().slice(0,10)) }}>{t("date.tomorrow")}</button>
            <button type="button" className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800" onClick={() => { const d=new Date(); const day=d.getDay(); const diff=(6-day+7)%7; d.setDate(d.getDate()+diff); setDefaultDue(d.toISOString().slice(0,10)) }}>{t("date.endOfWeek")}</button>
          </label>
          <label className="ml-auto flex items-center gap-2">
            <input type="checkbox" checked={goKanban} onChange={(e) => setGoKanban(e.target.checked)} />
            <span>{t("decompose.goKanban")}</span>
          </label>
          <button
            type="button"
            disabled={!canAdd}
            className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            onClick={() => addTasks(Array.from(selected))}
          >
            {t("decompose.addSelected")}
          </button>
          <button
            type="button"
            disabled={!project || !targetColumnId || items.length === 0}
            className="rounded bg-accent-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            onClick={() => addTasks(items.map((_, i) => i))}
          >
            {t("decompose.addAll")}
          </button>
        </div>
      </div>
    </div>
  )
}
