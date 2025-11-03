import { getDB } from "./db";

const LOCALSTORAGE_KEY = "secretary.local.adapter.v1";

/**
 * IndexedDB のデータをエクスポート（JSON）
 */
export async function exportData(): Promise<string> {
  const db = await getDB();

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: await db.getAll("projects"),
    tasks: await db.getAll("tasks"),
    columns: await db.getAll("columns"),
    tags: await db.getAll("tags"),
    comments: await db.getAll("comments"),
    checklist: await db.getAll("checklist"),
    users: await db.getAll("users"),
    members: await db.getAll("members"),
    dependencies: await db.getAll("dependencies"),
    decomposerDrafts: await db.getAll("decomposerDrafts"),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * localStorage のデータをエクスポート（JSON）
 */
export function exportLocalStorageData(): string {
  const raw = localStorage.getItem(LOCALSTORAGE_KEY);
  if (!raw) {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: null,
    }, null, 2);
  }

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: JSON.parse(raw),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * JSON データをインポート（IndexedDB）
 */
export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  const db = await getDB();

  const stores = [
    "projects",
    "tasks",
    "columns",
    "tags",
    "comments",
    "checklist",
    "users",
    "members",
    "dependencies",
    "decomposerDrafts",
  ] as const;

  const tx = db.transaction(stores, "readwrite");

  // 既存データをクリア
  for (const storeName of stores) {
    await tx.objectStore(storeName).clear();
  }

  // データをインポート
  if (data.projects) {
    for (const project of data.projects) {
      await tx.objectStore("projects").put(project);
    }
  }

  if (data.tasks) {
    for (const task of data.tasks) {
      await tx.objectStore("tasks").put(task);
    }
  }

  if (data.columns) {
    for (const column of data.columns) {
      await tx.objectStore("columns").put(column);
    }
  }

  if (data.tags) {
    for (const tag of data.tags) {
      await tx.objectStore("tags").put(tag);
    }
  }

  if (data.comments) {
    for (const comment of data.comments) {
      await tx.objectStore("comments").put(comment);
    }
  }

  if (data.checklist) {
    for (const item of data.checklist) {
      await tx.objectStore("checklist").put(item);
    }
  }

  if (data.users) {
    for (const user of data.users) {
      await tx.objectStore("users").put(user);
    }
  }

  if (data.members) {
    for (const member of data.members) {
      await tx.objectStore("members").put(member);
    }
  }

  if (data.dependencies) {
    for (const dep of data.dependencies) {
      await tx.objectStore("dependencies").put(dep);
    }
  }

  if (data.decomposerDrafts) {
    for (const draft of data.decomposerDrafts) {
      await tx.objectStore("decomposerDrafts").put(draft);
    }
  }

  await tx.done;
}

/**
 * localStorage にデータをインポート
 */
export function importLocalStorageData(jsonData: string): void {
  const parsed = JSON.parse(jsonData);
  if (parsed.data) {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(parsed.data));
  }
}

/**
 * ダウンロード用の Blob を生成（IndexedDB）
 */
export async function downloadBackup(
  filename: string = "secretary-backup.json"
): Promise<void> {
  const jsonData = await exportData();
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * ダウンロード用の Blob を生成（localStorage）
 */
export function downloadLocalStorageBackup(
  filename: string = "secretary-local-backup.json"
): void {
  const jsonData = exportLocalStorageData();
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * ファイルからインポート（汎用）
 */
export async function importFromFile(
  file: File,
  isLocalStorage: boolean
): Promise<void> {
  const text = await file.text();
  if (isLocalStorage) {
    importLocalStorageData(text);
  } else {
    await importData(text);
  }
}
