import React, { useEffect, useState, useRef, type ChangeEvent } from "react";
import type { Project, Member, User, Role } from "@/types/domain";
import { useAdapter } from "@/adapters/adapter-context";
import { t } from "@/lib/i18n";
import { TagsSettings } from "@/features/settings/tags-settings";
import {
  downloadBackup,
  downloadLocalStorageBackup,
  importFromFile,
} from "@/lib/backup";

export const ProjectSettingsRoot: React.FC = () => {
  const { adapter, kind } = useAdapter();
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

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
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

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70 opacity-60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            プロジェクト切替 / 作成
          </h2>
          <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            近日公開
          </span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 cursor-not-allowed"
            value={currentProjectId}
            disabled
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
            className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800 cursor-not-allowed"
            disabled
          >
            営業管理テンプレート
          </button>
          <button
            type="button"
            className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800 cursor-not-allowed"
            disabled
          >
            顧客対応テンプレート
          </button>
          <button
            type="button"
            className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800 cursor-not-allowed"
            disabled
          >
            採用管理テンプレート
          </button>
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          テンプレートを作成後、上のセレクトで切り替えると全画面の対象プロジェクトが変更されます。
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70 opacity-60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {t("settings.members")}
          </h2>
          <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            近日公開
          </span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <input
            className="w-48 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 cursor-not-allowed"
            placeholder="氏名"
            value={newMemberName}
            disabled
          />
          <input
            className="w-64 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 cursor-not-allowed"
            placeholder="メールアドレス"
            value={newMemberEmail}
            disabled
          />
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 cursor-not-allowed"
            value={newMemberRole}
            disabled
          >
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            type="button"
            className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white cursor-not-allowed opacity-50"
            disabled
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
                  className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900 cursor-not-allowed"
                  value={m.role}
                  disabled
                >
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <button
                  type="button"
                  className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800 cursor-not-allowed"
                  disabled
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200/70 bg-white/70 p-4 shadow-soft dark:border-zinc-700/60 dark:bg-zinc-900/70 opacity-60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            タグ
          </h2>
          <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            近日公開
          </span>
        </div>
        <div className="pointer-events-none">
          <TagsSettings />
        </div>
      </section>
    </div>
  );
};
