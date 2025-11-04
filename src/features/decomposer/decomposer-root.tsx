import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { Sparkles } from "lucide-react";
import {
  addTaskHierarchy,
  type DecomposedTaskWithMeta,
} from "@/lib/task-hierarchy";
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  getLastDraft,
  generateDraftTitle,
  listDrafts,
} from "@/lib/decomposer-storage";

export const DecomposerRoot: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
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

  // 下書き管理
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showDraftsList, setShowDraftsList] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);

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
      const todoCol =
        cols.find((c) => c.name.toLowerCase() === "to do") ||
        cols.find((c) => c.name.toLowerCase() === "todo") ||
        null;
      setTargetColumnId(todoCol?.id ?? cols[0]?.id ?? "");

      // 最後の下書きを復元
      const lastDraft = await getLastDraft(p.id);
      if (lastDraft) {
        setText(lastDraft.originalInput);
        setItems(lastDraft.tasks as DecomposedTask[]);
        setSelected(new Set(lastDraft.selected));
        const todoColDraft =
          cols.find((c) => c.name.toLowerCase() === "to do") ||
          cols.find((c) => c.name.toLowerCase() === "todo") ||
          null;
        setTargetColumnId(todoColDraft?.id || cols[0]?.id || "");
        setDefaultDue(lastDraft.defaultDue || "");
        setCurrentDraftId(lastDraft.id);
      }
    };
    run();
  }, []);

  // 自動保存機能（debounce付き）
  useEffect(() => {
    if (!autoSaveEnabled || !project) return;
    if (items.length === 0 && !text.trim()) return;

    const timeoutId = setTimeout(async () => {
      try {
        const title = generateDraftTitle(text, items);
        const draft = await saveDraft({
          id: currentDraftId || undefined,
          projectId: project.id,
          originalInput: text,
          tasks: items,
          selected: Array.from(selected),
          targetColumnId: targetColumnId as string,
          defaultDue: defaultDue || undefined,
          title,
        });

        if (!currentDraftId) {
          setCurrentDraftId(draft.id);
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [
    text,
    items,
    selected,
    targetColumnId,
    defaultDue,
    autoSaveEnabled,
    project,
    currentDraftId,
  ]);

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
        console.log("Gemini structured result:", out);
      } catch (e) {
        console.error("Gemini decomposition failed:", e);
        setError(`分解エラー: ${(e as any)?.message || "不明なエラー"}`);
        const flatTasks = decomposeRequirements(text);
        out = flatTasks.map((title) => ({ title }));
      }
      setItems(out);
      setSelected(new Set(getAllPaths(out)));
    } finally {
      setLoading(false);
    }
  }

  async function addTasks(paths: string[], isAddAll = false) {
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

    // ルートレベルのタスクのみを抽出（親子関係は addTaskHierarchy で処理）
    const rootPaths = paths.filter((path) => {
      // 他のパスの子でないものをルートとする
      return !paths.some(
        (otherPath) => path !== otherPath && path.startsWith(otherPath + ".")
      );
    });

    const tasksToAdd: DecomposedTask[] = [];
    rootPaths.forEach((path) => {
      const task = getTaskByPath(items, path);
      if (task) tasksToAdd.push(task);
    });

    // 階層構造を保ったままタスクを追加
    for (const task of tasksToAdd) {
      const taskWithMeta: DecomposedTaskWithMeta = {
        title: task.title,
        startDate: (task as any).startDate,
        dueDate: (task as any).dueDate,
        children: task.children as DecomposedTaskWithMeta[] | undefined,
      };

      await addTaskHierarchy(adapter, project.id, targetColumnId, taskWithMeta);
    }

    // 全て追加の場合は、分解結果を空にする
    if (isAddAll) {
      setItems([]);
    } else {
      // 追加したタスクを分解結果から削除
      const removeTasksByPaths = (
        tasks: DecomposedTask[],
        pathsToRemove: string[]
      ): DecomposedTask[] => {
        const pathsSet = new Set(pathsToRemove);
        
        const filterTasks = (
          taskList: DecomposedTask[],
          currentPath: string
        ): DecomposedTask[] => {
          return taskList
            .map((task, idx) => {
              const taskPath = currentPath ? `${currentPath}.${idx}` : `${idx}`;
              
              // このタスク自体が削除対象かチェック
              if (pathsSet.has(taskPath)) {
                return null;
              }
              
              // 子要素を再帰的にフィルタ
              if (task.children && task.children.length > 0) {
                const filteredChildren = filterTasks(task.children, taskPath);
                return {
                  ...task,
                  children: filteredChildren.length > 0 ? filteredChildren : undefined,
                };
              }
              
              return task;
            })
            .filter((task): task is DecomposedTask => task !== null);
        };
        
        return filterTasks(tasks, "");
      };

      // 追加したタスクを分解結果から削除（rootPathsを削除すると、その子孫も自動的に削除される）
      const updatedItems = removeTasksByPaths(items, rootPaths);
      setItems(updatedItems);
    }

    // 選択状態をクリア
    setSelected(new Set());
    
    // モーダルを閉じる
    if (onClose) {
      onClose();
    }
    
    // カンバン画面に遷移（オプション）
    if (goKanban) navigate("/kanban");
  }

  async function handleClearDraft() {
    if (currentDraftId) {
      await deleteDraft(currentDraftId);
    }
    setText("");
    setItems([]);
    setSelected(new Set());
    setDefaultDue("");
    setCurrentDraftId(null);
    setError(null);
  }

  async function loadDrafts() {
    if (!project) return;
    const allDrafts = await listDrafts(project.id);
    setDrafts(allDrafts);
  }

  async function handleLoadDraft(draftId: string) {
    const draft = await loadDraft(draftId);
    if (!draft) return;

    setText(draft.originalInput);
    setItems(draft.tasks as DecomposedTask[]);
    setSelected(new Set(draft.selected));
    const todoCol =
      columns.find((c) => c.name.toLowerCase() === "to do") ||
      columns.find((c) => c.name.toLowerCase() === "todo") ||
      null;
    setTargetColumnId(todoCol?.id || columns[0]?.id || "");
    setDefaultDue(draft.defaultDue || "");
    setCurrentDraftId(draft.id);
    setShowDraftsList(false);
  }

  async function handleDeleteDraft(draftId: string) {
    await deleteDraft(draftId);
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
    }
    await loadDrafts();
  }

  async function toggleDraftsList() {
    if (!showDraftsList) {
      await loadDrafts();
    }
    setShowDraftsList(!showDraftsList);
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
    // 録音時間が短すぎる場合は自動キャンセル
    if (recorder.duration < 2) {
      recorder.cancelRecording();
      setError("録音時間が短すぎます（最低2秒）");
      return;
    }

    try {
      setTranscribing(true);
      setError(null);
      const audioBlob = await recorder.stopRecording();
      const transcribed = await transcribeAudio(audioBlob);

      // 文字起こし結果が空または無意味な場合は追加しない
      const trimmed = transcribed.trim();
      const isValid =
        trimmed &&
        trimmed.length > 0 &&
        !trimmed.match(
          /^(ご視聴ありがとうございました|thank you for watching|\.+|…+)$/i
        );

      if (isValid) {
        setText((prev) => (prev ? `${prev}\n${trimmed}` : trimmed));
      } else {
        setError("音声を認識できませんでした");
      }
    } catch (err) {
      console.error("音声認識エラー:", err);
      setError(t("decompose.voiceError"));
    } finally {
      setTranscribing(false);
    }
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
      {/* タイトルはモーダルのヘッダーで表示されるので削除 */}
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

          {recorder.state === "idle" ? (
            <button
              type="button"
              onClick={handleVoiceInput}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-accent-700 hover:to-accent-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={transcribing || !hasOpenAIKey}
              title={!hasOpenAIKey ? t("decompose.voiceNoKey") : ""}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              {transcribing
                ? t("decompose.voiceTranscribing")
                : t("decompose.voiceInput")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-red-700 hover:to-red-800 hover:shadow-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              {t("decompose.voiceStop")}
            </button>
          )}

          {recorder.state === "recording" && (
            <span className="inline-flex items-center gap-2 text-sm text-red-600 font-medium dark:text-red-400">
              <svg
                className="h-3 w-3 animate-pulse"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              {t("decompose.voiceRecording")} {recorder.duration}秒
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDraftsList}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              📋 下書き一覧
            </button>

            {(items.length > 0 || text.trim()) && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                クリア
              </button>
            )}
          </div>

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
          {/* 期日はGeminiが自動設定（追加先・期日選択UIを撤廃） */}
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
            onClick={() => addTasks(getAllPaths(items), true)}
          >
            {t("decompose.addAll")}
          </button>
        </div>
      </div>

      {/* 下書き一覧モーダル */}
      {showDraftsList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">下書き一覧</h2>
              <button
                type="button"
                onClick={() => setShowDraftsList(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {drafts.length === 0 ? (
              <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                下書きはありません
              </p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoadDraft(draft.id)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {draft.title || "無題の下書き"}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(draft.updatedAt).toLocaleString("ja-JP")} •{" "}
                        {draft.tasks.length} タスク
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(draft.id)}
                      className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
