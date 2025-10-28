import React, { useEffect, useMemo, useState } from "react";
import { t } from "@/lib/i18n";
import {
  decomposeWithGemini,
  decomposeRequirements,
  decomposeWithGeminiStructured,
  flattenTasks,
  type DecomposedTask,
} from "@/lib/decomposer";
import { useAdapter } from "@/adapters/adapter-context";
import type { Column, Id, Project } from "@/types/domain";
import {
  getRuntimeGeminiApiKey,
  getRuntimeOpenAIApiKey,
  transcribeAudio,
} from "@/lib/aiClient";
import { navigate } from "@/lib/router";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { Sparkles, Mic, Square, X, Circle } from "lucide-react";

export const DecomposerRoot: React.FC = () => {
  const { adapter } = useAdapter();
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [targetColumnId, setTargetColumnId] = useState<Id | "">("");

  const [text, setText] = useState("");
  const [items, setItems] = useState<DecomposedTask[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // インデックスからパスに変更
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultDue, setDefaultDue] = useState<string | "">("");
  const [goKanban, setGoKanban] = useState(true);

  // 音声入力
  const recorder = useAudioRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const hasOpenAIKey = !!getRuntimeOpenAIApiKey();

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject();
      setProject(p);
      const cols = await adapter.getBoardColumns(p.id);
      setColumns(cols);
      setTargetColumnId(cols[0]?.id ?? "");
      // parse columnId from hash query if present
      const hash = window.location.hash;
      const qIndex = hash.indexOf("?");
      if (qIndex >= 0) {
        const qs = new URLSearchParams(hash.slice(qIndex + 1));
        const col = qs.get("columnId");
        if (col && cols.some((c) => c.id === col)) setTargetColumnId(col);
      }
    };
    run();
  }, []);

  // 全タスクのパスを取得
  const getAllPaths = (tasks: DecomposedTask[], prefix = ""): string[] => {
    const paths: string[] = [];
    tasks.forEach((task, idx) => {
      const path = prefix ? `${prefix}.${idx}` : `${idx}`;
      paths.push(path);
      if (task.children) {
        paths.push(...getAllPaths(task.children, path));
      }
    });
    return paths;
  };

  function toggleAll(next: boolean) {
    if (next) {
      setSelected(new Set(getAllPaths(items)));
    } else {
      setSelected(new Set());
    }
  }

  function togglePath(path: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(path)) {
        // 選択解除: 自分と子孫を全て解除
        s.delete(path);
        const childPrefix = path + ".";
        Array.from(s).forEach((p) => {
          if (p.startsWith(childPrefix)) s.delete(p);
        });
      } else {
        // 選択: 自分を追加
        s.add(path);
      }
      return s;
    });
  }

  async function runDecompose() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let out: DecomposedTask[] = [];
      try {
        out = await decomposeWithGeminiStructured(text);
      } catch (e) {
        setError(t("decompose.error"));
        const flatTasks = decomposeRequirements(text);
        out = flatTasks.map((title) => ({ title }));
      }
      setItems(out);
      setSelected(new Set(getAllPaths(out)));
    } finally {
      setLoading(false);
    }
  }

  async function addTasks(paths: string[]) {
    if (!project || !targetColumnId) return;

    // パスからタスクを取得
    const getTaskByPath = (
      tasks: DecomposedTask[],
      path: string
    ): DecomposedTask | null => {
      const indices = path.split(".").map(Number);
      let current: DecomposedTask[] = tasks;
      for (const idx of indices) {
        if (!current[idx]) return null;
        if (idx === indices[indices.length - 1]) {
          return current[idx];
        }
        current = current[idx].children || [];
      }
      return null;
    };

    const tasksToAdd: string[] = [];
    paths.forEach((path) => {
      const task = getTaskByPath(items, path);
      if (task) tasksToAdd.push(task.title);
    });

    for (const title of tasksToAdd) {
      const t = await adapter.addTask(project.id, targetColumnId, title);
      if (defaultDue) {
        await adapter.updateTask(t.id, { dueDate: defaultDue });
      }
    }
    // feedback: clear selection
    setSelected(new Set());
    if (goKanban) navigate("/kanban");
  }

  async function handleVoiceInput() {
    if (!hasOpenAIKey) {
      setError(t("decompose.voiceNoKey"));
      return;
    }

    try {
      await recorder.startRecording();
      setError(null);
    } catch (err) {
      console.error("録音開始エラー:", err);
      setError(t("decompose.voiceError"));
    }
  }

  async function handleStopRecording() {
    try {
      setTranscribing(true);
      setError(null);
      const audioBlob = await recorder.stopRecording();
      const transcribed = await transcribeAudio(audioBlob);
      setText((prev) => (prev ? `${prev}\n${transcribed}` : transcribed));
    } catch (err) {
      console.error("音声認識エラー:", err);
      setError(t("decompose.voiceError"));
    } finally {
      setTranscribing(false);
    }
  }

  function handleCancelRecording() {
    recorder.cancelRecording();
    setError(null);
  }

  const canAdd = project && targetColumnId && selected.size > 0;

  // 階層表示用のコンポーネント
  const TaskTreeItem: React.FC<{
    task: DecomposedTask;
    path: string;
    level: number;
  }> = ({ task, path, level }) => {
    const isSelected = selected.has(path);
    const hasChildren = task.children && task.children.length > 0;
    const [isExpanded, setIsExpanded] = useState(true);

    return (
      <li className="mb-2">
        <div
          className="flex items-start gap-2"
          style={{ paddingLeft: `${level * 20}px` }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          )}
          {!hasChildren && <span className="w-4" />}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => togglePath(path)}
            className="mt-0.5"
          />
          <div
            className={`text-sm flex-1 ${level === 0 ? "font-semibold" : ""}`}
          >
            {task.title}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <ul className="mt-1">
            {task.children!.map((child, idx) => (
              <TaskTreeItem
                key={`${path}.${idx}`}
                task={child}
                path={`${path}.${idx}`}
                level={level + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("decompose.title")}</h1>
      {!getRuntimeGeminiApiKey() && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
          Gemini API キーが未設定です。ローカル分解で継続します。
          <button
            className="ml-2 underline"
            onClick={() => navigate("/settings")}
          >
            設定を開く
          </button>
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
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-brand-700 hover:to-brand-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !text.trim()}
          >
            <Sparkles className="h-4 w-4" />
            {loading ? t("decompose.loading") : t("decompose.run")}
          </button>

          {recorder.state === "idle" && (
            <button
              type="button"
              onClick={handleVoiceInput}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-accent-700 hover:to-accent-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={transcribing || !hasOpenAIKey}
              title={!hasOpenAIKey ? t("decompose.voiceNoKey") : ""}
            >
              <Mic className="h-4 w-4" />
              {transcribing
                ? t("decompose.voiceTranscribing")
                : t("decompose.voiceInput")}
            </button>
          )}

          {recorder.state === "recording" && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-red-600 font-medium">
                <Circle className="h-3 w-3 fill-red-600 animate-pulse" />
                {t("decompose.voiceRecording")} {recorder.duration}秒
              </span>
              <button
                type="button"
                onClick={handleStopRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-green-700 hover:to-green-800 hover:shadow-lg"
              >
                <Square className="h-4 w-4" />
                {t("decompose.voiceStop")}
              </button>
              <button
                type="button"
                onClick={handleCancelRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-zinc-500 to-zinc-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-zinc-600 hover:to-zinc-700 hover:shadow-lg"
              >
                <X className="h-4 w-4" />
                {t("decompose.voiceCancel")}
              </button>
            </div>
          )}

          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">{t("decompose.results")}</div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
              onClick={() => toggleAll(true)}
            >
              {t("decompose.selectAll")}
            </button>
            <button
              type="button"
              className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
              onClick={() => toggleAll(false)}
            >
              {t("decompose.clear")}
            </button>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">{t("dashboard.none")}</div>
        ) : (
          <ul className="space-y-1">
            {items.map((task, idx) => (
              <TaskTreeItem key={idx} task={task} path={`${idx}`} level={0} />
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
              {columns
                .sort((a, b) => a.sortIndex - b.sortIndex)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
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
            <button
              type="button"
              className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
              onClick={() =>
                setDefaultDue(new Date().toISOString().slice(0, 10))
              }
            >
              {t("date.today")}
            </button>
            <button
              type="button"
              className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                setDefaultDue(d.toISOString().slice(0, 10));
              }}
            >
              {t("date.tomorrow")}
            </button>
            <button
              type="button"
              className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
              onClick={() => {
                const d = new Date();
                const day = d.getDay();
                const diff = (6 - day + 7) % 7;
                d.setDate(d.getDate() + diff);
                setDefaultDue(d.toISOString().slice(0, 10));
              }}
            >
              {t("date.endOfWeek")}
            </button>
          </label>
          <label className="ml-auto flex items-center gap-2">
            <input
              type="checkbox"
              checked={goKanban}
              onChange={(e) => setGoKanban(e.target.checked)}
            />
            <span>{t("decompose.goKanban")}</span>
          </label>
          <button
            type="button"
            disabled={!canAdd}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-brand-700 hover:to-brand-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => addTasks(Array.from(selected))}
          >
            {t("decompose.addSelected")}
          </button>
          <button
            type="button"
            disabled={!project || !targetColumnId || items.length === 0}
            className="rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-accent-700 hover:to-accent-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => addTasks(getAllPaths(items))}
          >
            {t("decompose.addAll")}
          </button>
        </div>
      </div>
    </div>
  );
};
