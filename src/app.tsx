import React, { useMemo, useState } from "react"
import { decomposeWithGemini } from "@/lib/decomposer"

type Todo = {
  id: string
  title: string
  done: boolean
}

export const App: React.FC = () => {
  const [input, setInput] = useState("")
  const [todos, setTodos] = useState<Todo[]>([])
  const [theme, setTheme] = useState<"system" | "dark" | "light">("system")
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const htmlClass = useMemo(() => {
    if (theme === "system") return undefined
    return theme === "dark" ? "dark" : ""
  }, [theme])

  const completedCount = useMemo(
    () => todos.filter((t) => t.done).length,
    [todos]
  )
  const progress = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0

  const themeOptions: { value: typeof theme; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
  ]

  const onDecompose = async () => {
    if (input.trim().length === 0) return
    setError(null)
    setLoading(true)
    try {
      const items = await decomposeWithGemini(input)
      setTodos(
        items.map((t, i) => ({
          id: `${Date.now()}-${i}`,
          title: t,
          done: false
        }))
      )
    } catch (e: any) {
      setError(e?.message ?? "分解に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    )
  }

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className={htmlClass}>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-100 via-white to-zinc-200 text-zinc-900 transition-colors dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-50">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-[120px]" />
          <div className="absolute bottom-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-400/20 blur-[120px]" />
          <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-emerald-400/20 blur-[120px]" />
        </div>

        <div className="relative">
          <header className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300/70 bg-white/70 px-3 py-1 text-xs font-medium backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live prototype
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Secretary
              </h1>
              <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                やりたいことを雑に投げても、AI が瞬時に分解してあらゆるタスクをハンドリング。集中すべきことにフォーカスできる、軽やかなモダンワークスペースです。
              </p>
            </div>

            <div className="hidden flex-col items-end gap-4 text-right md:flex">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
                Theme
              </div>
              <div className="flex rounded-full border border-zinc-300/70 bg-white/70 p-1 text-xs font-medium backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70">
                {themeOptions.map((option) => {
                  const isActive = option.value === theme
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      type="button"
                      className={`relative rounded-full px-3 py-1 transition ${
                        isActive
                          ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <a
                className="text-xs text-zinc-500 underline-offset-4 transition hover:text-zinc-900 dark:hover:text-zinc-100"
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
                Theme
              </div>
              <div className="inline-flex rounded-full border border-zinc-300/70 bg-white/70 p-1 text-xs font-medium backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/70">
                {themeOptions.map((option) => {
                  const isActive = option.value === theme
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      type="button"
                      className={`relative rounded-full px-3 py-1 transition ${
                        isActive
                          ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <a
                className="text-xs text-zinc-500 underline-offset-4 transition hover:text-zinc-900 dark:hover:text-zinc-100"
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </header>

          <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 lg:flex-row">
            <section className="w-full space-y-6 lg:w-7/12">
              <div className="rounded-[2rem] border border-zinc-200/70 bg-white/80 p-6 shadow-2xl shadow-zinc-900/5 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/60 dark:shadow-black/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">タスクを雑に投げてください</h2>
                  <span className="rounded-full bg-zinc-900/90 px-3 py-1 text-xs font-medium text-white dark:bg-white/90 dark:text-zinc-900">
                    AI Decompose
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  コードの実装からリリース準備まで、思いつくままに書き出してみましょう。Secretary が最適なタスクリストを提案します。
                </p>
                <textarea
                  className="mt-6 h-60 w-full resize-none rounded-2xl border border-zinc-200 bg-white/60 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-300/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:focus:border-zinc-600 dark:focus:ring-zinc-800/50"
                  placeholder="例: ユーザ登録を作る。メール認証。フォームのバリデーション。成功時にトースト。"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <button
                    onClick={onDecompose}
                    disabled={loading || input.trim().length === 0}
                    className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:shadow-white/20"
                  >
                    <span className="inline-flex h-2 w-2 items-center justify-center">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    </span>
                    {loading ? "分解中..." : "AI で分解する"}
                  </button>
                  <button
                    onClick={() => setInput("")}
                    className="inline-flex items-center rounded-full border border-zinc-300/80 px-4 py-2 text-sm font-medium text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700/60 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                  >
                    クリア
                  </button>
                  {error && (
                    <span className="ml-2 text-xs text-red-500">{error}</span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-300/70 bg-white/70 p-4 backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/60">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                    Total Tasks
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{todos.length}</div>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    AI が生成したサブタスクの総数です
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-300/70 bg-white/70 p-4 backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/60">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                    Done
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{completedCount}</div>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    完了済みタスクの数をリアルタイムで反映
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-300/70 bg-white/70 p-4 backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-400">
                    Progress
                    <span className="text-[10px] text-zinc-400">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-zinc-200/70 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all dark:from-emerald-500 dark:to-sky-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    完了率は自動で計算されます
                  </p>
                </div>
              </div>
            </section>

            <section className="w-full space-y-6 lg:w-5/12">
              <div className="rounded-[2rem] border border-zinc-200/70 bg-white/80 p-6 shadow-2xl shadow-zinc-900/5 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/60 dark:shadow-black/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">TODO ボード</h2>
                  <span className="text-xs text-zinc-400">{todos.length} Items</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  完了済みの項目は控えめなスタイルで表示され、進行中のタスクに集中できます。
                </p>

                <div className="mt-6 space-y-3">
                  {todos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300/80 bg-white/60 px-6 py-10 text-center text-sm text-zinc-500 backdrop-blur dark:border-zinc-700/60 dark:bg-zinc-900/40">
                      <div className="text-lg">✨</div>
                      <p className="mt-3 font-medium text-zinc-600 dark:text-zinc-300">
                        まだ項目がありません
                      </p>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        左のフォームからタスクを投げると、ここに美しく整理されて表示されます。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todos.map((t) => (
                        <div
                          key={t.id}
                          className="group flex items-start gap-3 rounded-2xl border border-transparent bg-white/70 p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                        >
                          <button
                            aria-label="toggle"
                            type="button"
                            onClick={() => toggleTodo(t.id)}
                            className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                              t.done
                                ? "border-emerald-400 bg-emerald-400/20 text-emerald-400"
                                : "border-zinc-300 text-transparent hover:border-zinc-400 dark:border-zinc-700"
                            }`}
                          >
                            <span className="text-lg leading-none">✓</span>
                          </button>
                          <div className="flex-1">
                            <div
                              className={`text-sm font-medium tracking-tight ${
                                t.done
                                  ? "text-zinc-400 line-through"
                                  : "text-zinc-800 dark:text-zinc-100"
                              }`}
                            >
                              {t.title}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                              {t.done ? "Completed" : "In Progress"}
                              <span className="hidden h-1 w-1 rounded-full bg-zinc-400 md:inline-flex" />
                              <span className="text-zinc-300 dark:text-zinc-600">
                                {t.done ? "Nice work" : "Tap to mark done"}
                              </span>
                            </div>
                          </div>
                          <button
                            aria-label="remove"
                            onClick={() => removeTodo(t.id)}
                            className="rounded-full border border-transparent px-3 py-1 text-xs text-zinc-400 opacity-0 transition hover:border-red-200 hover:text-red-400 group-hover:opacity-100 dark:hover:border-red-500/30"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200/70 bg-white/70 p-6 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/60">
                <h3 className="text-sm font-semibold tracking-tight">
                  今日のフォーカス
                </h3>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  朝の数分でタスクを整理し、午後からはアウトプットに集中。Secretary が優先順位付けを支援します。
                </p>
                <ul className="mt-4 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    粒度の細かいタスクは一括分解で素早く洗い出し
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
                    完了済みのタスクは自動でスタイルが変わり視覚的にフィードバック
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                    手触りの良い UI でフロー状態を維持
                  </li>
                </ul>
              </div>
            </section>
          </main>

          <footer className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 pb-12 text-xs text-zinc-500 md:flex-row md:justify-between">
            <span>© {new Date().getFullYear()} Secretary</span>
            <div className="flex gap-3">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Contact</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
