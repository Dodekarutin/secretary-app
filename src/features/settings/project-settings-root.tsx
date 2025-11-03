import React, { useEffect, useState, useRef } from "react";
import type { Project, Member, User, Role } from "@/types/domain";
import { useAdapter } from "@/adapters/adapter-context";
import { t } from "@/lib/i18n";
import { getSettings, updateSettings, clearSetting } from "@/lib/settings";
import { TagsSettings } from "@/features/settings/tags-settings";
import { FF_TASK_BACKEND } from "@/lib/flags";
import {
  downloadBackup,
  downloadLocalStorageBackup,
  importFromFile,
} from "@/lib/backup";

export const ProjectSettingsRoot: React.FC = () => {
  const { adapter, kind, setKind } = useAdapter();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiApiKeyVisible, setOpenaiApiKeyVisible] = useState(false);
  const [model, setModel] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<Role>("editor");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const run = async () => {
      const p = await adapter.getDefaultProject();
      setProject(p);
      setName(p.name);
      setDescription(p.description ?? "");
      const s = getSettings();
      setApiKey(s.geminiApiKey ?? "");
      setOpenaiApiKey(s.openaiApiKey ?? "");
      setModel(s.geminiModel ?? "");
      const mem = await adapter.listProjectMembers(p.id);
      setMembers(mem);
      const dict: Record<string, User> = {};
      for (const m of mem) {
        const u = await adapter.getUser(m.userId);
        if (u) dict[u.id] = u;
      }
      setUsersById(dict);
      setProjects(await adapter.listProjects());
      setCurrentProjectIdState(p.id);
    };
    run();
  }, []);

  async function savePatch(patch: { name?: string; description?: string }) {
    if (!project) return;
    setSaving(true);
    try {
      const updated = await adapter.updateProject(project.id, patch);
      setProject(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      if (kind === "local") {
        downloadLocalStorageBackup(
          `secretary-backup-${new Date().toISOString().slice(0, 10)}.json`
        );
      } else {
        await downloadBackup(
          `secretary-backup-${new Date().toISOString().slice(0, 10)}.json`
        );
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert(t("settings.backup.importError"));
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await importFromFile(file, kind === "local");
      alert(t("settings.backup.importSuccess"));
      window.location.reload();
    } catch (error) {
      console.error("Import failed:", error);
      alert(t("settings.backup.importError"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">{t("settings.project")}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-zinc-600 dark:text-zinc-400">
              {t("settings.project.name")}
            </div>
            <input
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => savePatch({ name })}
            />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-zinc-600 dark:text-zinc-400">
              {t("settings.project.description")}
            </div>
            <textarea
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => savePatch({ description })}
            />
          </label>
        </div>
        {saving && (
          <div className="mt-2 text-xs text-zinc-500">{t("common.saving")}</div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">プロジェクト切替 / 作成</h2>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={currentProjectId}
            onChange={async (e) => {
              const id = e.target.value;
              setCurrentProjectIdState(id);
              const { setCurrentProjectId } = await import("@/lib/settings");
              setCurrentProjectId(id);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
            onClick={async () => {
              if (!adapter) return;
              const p = await adapter.createProject("営業管理プロジェクト");
              await adapter.createColumns(p.id, [
                "問い合わせ",
                "商談",
                "見積もり",
                "受注",
              ]);
              setProjects(await adapter.listProjects());
            }}
          >
            営業管理テンプレート
          </button>
          <button
            type="button"
            className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
            onClick={async () => {
              const p = await adapter.createProject("顧客対応プロジェクト");
              await adapter.createColumns(p.id, [
                "未対応",
                "対応中",
                "対応済み",
                "保留",
              ]);
              setProjects(await adapter.listProjects());
            }}
          >
            顧客対応テンプレート
          </button>
          <button
            type="button"
            className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
            onClick={async () => {
              const p = await adapter.createProject("中途採用プロジェクト");
              await adapter.createColumns(p.id, [
                "書類選考",
                "一次面談",
                "最終面談",
                "採用",
              ]);
              setProjects(await adapter.listProjects());
            }}
          >
            採用管理テンプレート
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          テンプレートを作成後、上のセレクトで切り替えると全画面の対象プロジェクトが変更されます。
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">データ初期化 / デモ補充</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className="rounded bg-red-600 px-3 py-1.5 text-white"
            onClick={async () => {
              if (!project || !adapter.clearProjectTasks) return;
              await adapter.clearProjectTasks(project.id);
              // 画面側のステートもクリアに寄せる
              alert("タスクをすべて削除しました");
            }}
          >
            すべてのタスクを削除
          </button>
          <button
            type="button"
            className="rounded bg-accent-600 px-3 py-1.5 text-white"
            onClick={async () => {
              if (!project || !adapter.seedDemoTasks) return;
              await adapter.seedDemoTasks(project.id, 30);
              alert("デモデータ（30件）を補充しました");
            }}
          >
            デモデータを30件補充
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          削除・補充は現在選択中のプロジェクトに対して実行されます。
        </div>
      </section>
      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">{t("settings.dataSource")}</h2>
        <div className="mb-2 flex flex-col gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="data-source"
              checked={kind === "local"}
              onChange={() => setKind("local")}
            />
            {t("settings.dataSource.local")}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="data-source"
              checked={kind === "indexeddb"}
              onChange={() => setKind("indexeddb")}
            />
            {t("settings.dataSource.indexeddb")}
          </label>
          <label className="inline-flex items-center gap-2 opacity-100">
            <input
              type="radio"
              name="data-source"
              checked={kind === "http"}
              onChange={() => setKind("http")}
              disabled={!FF_TASK_BACKEND}
            />
            {t("settings.dataSource.http")}
          </label>
        </div>
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <div className="font-medium mb-1">現在のオリジン:</div>
          <div className="font-mono">{window.location.origin}</div>
          <div className="mt-2">{t("settings.dataSource.originWarning")}</div>
        </div>
        {!FF_TASK_BACKEND && (
          <div className="mt-2 text-xs text-zinc-500">
            {t("settings.dataSource.httpDisabled")}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">{t("settings.backup")}</h2>
        <p className="mb-3 text-xs text-zinc-500">
          {t("settings.backup.description")}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
            onClick={handleExport}
          >
            {t("settings.backup.export")}
          </button>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              className="hidden"
              id="backup-file-input"
            />
            <label
              htmlFor="backup-file-input"
              className="cursor-pointer rounded bg-accent-600 px-4 py-2 text-white hover:bg-accent-700"
            >
              {importing
                ? t("settings.backup.importing")
                : t("settings.backup.import")}
            </label>
          </div>
        </div>
      </section>
      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">{t("settings.members")}</h2>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <input
            className="w-48 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="氏名"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
          />
          <input
            className="w-64 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="メールアドレス"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
          />
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as Role)}
          >
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            type="button"
            className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white"
            onClick={async () => {
              if (!project || !newMemberEmail.trim() || !newMemberName.trim())
                return;
              const u = await adapter.addUser(
                newMemberEmail.trim(),
                newMemberName.trim()
              );
              const m = await adapter.addProjectMember(
                project.id,
                u.id,
                newMemberRole
              );
              setMembers((prev) => [...prev, m]);
              setUsersById((prev) => ({ ...prev, [u.id]: u }));
              setNewMemberEmail("");
              setNewMemberName("");
            }}
          >
            追加
          </button>
        </div>
        <ul className="divide-y divide-zinc-200/70 text-sm dark:divide-zinc-700/60">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">
                  {usersById[m.userId]?.displayName ?? m.userId}
                </div>
                <div className="text-xs text-zinc-500">
                  {usersById[m.userId]?.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  value={m.role}
                  onChange={async (e) => {
                    // ローカルアダプタは role 更新API未実装のため、remove->add で代替
                    await adapter.removeProjectMember(m.id);
                    const nm = await adapter.addProjectMember(
                      project!.id,
                      m.userId,
                      e.target.value as Role
                    );
                    setMembers((prev) =>
                      prev.map((x) => (x.id === m.id ? nm : x))
                    );
                  }}
                >
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <button
                  type="button"
                  className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800"
                  onClick={async () => {
                    await adapter.removeProjectMember(m.id);
                    setMembers((prev) => prev.filter((x) => x.id !== m.id));
                  }}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">Gemini API</h2>
        <p className="mb-2 text-xs text-zinc-500">
          ブラウザにのみ保存されます。公開環境ではサーバープロキシの利用を推奨します。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type={apiKeyVisible ? "text" : "password"}
            className="min-w-[280px] flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={() =>
              updateSettings({ geminiApiKey: apiKey.trim() || undefined })
            }
          />
          <button
            type="button"
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800"
            onClick={() => setApiKeyVisible((v) => !v)}
          >
            {apiKeyVisible ? "隠す" : "表示"}
          </button>
          <button
            type="button"
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800"
            onClick={() => {
              clearSetting("geminiApiKey");
              setApiKey("");
            }}
          >
            クリア
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          分解ページのAI呼び出しで使用します。未設定時はローカル分解にフォールバックします。
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">{t("settings.ai")}</h2>
        <div className="flex items-center gap-2 text-sm">
          <label
            className="text-zinc-600 dark:text-zinc-400"
            htmlFor="ai-model"
          >
            {t("settings.ai.model")}:
          </label>
          <select
            id="ai-model"
            className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={model || "gemini-2.5-flash"}
            onChange={(e) => {
              setModel(e.target.value);
              updateSettings({ geminiModel: e.target.value });
            }}
          >
            <option value="gemini-2.5-flash">
              {t("settings.ai.model.flash")}
            </option>
            <option value="gemini-1.5-pro">{t("settings.ai.model.pro")}</option>
          </select>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">OpenAI API（音声入力）</h2>
        <p className="mb-2 text-xs text-zinc-500">
          Whisper APIを使った音声入力で使用します。ブラウザにのみ保存されます。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type={openaiApiKeyVisible ? "text" : "password"}
            className="min-w-[280px] flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="sk-..."
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            onBlur={() =>
              updateSettings({ openaiApiKey: openaiApiKey.trim() || undefined })
            }
          />
          <button
            type="button"
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800"
            onClick={() => setOpenaiApiKeyVisible((v) => !v)}
          >
            {openaiApiKeyVisible ? "隠す" : "表示"}
          </button>
          <button
            type="button"
            className="rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800"
            onClick={() => {
              clearSetting("openaiApiKey");
              setOpenaiApiKey("");
            }}
          >
            クリア
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          タスク分解ページの音声入力で使用します。未設定時は音声入力ボタンが無効になります。
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70">
        <h2 className="mb-2 text-sm font-medium">タグ</h2>
        <TagsSettings />
      </section>
    </div>
  );
};
