import { openDB, DBSchema, IDBPDatabase } from "idb";
import type {
  Project,
  Task,
  Column,
  Tag,
  Comment,
  ChecklistItem,
  User,
  Member,
  TaskDependency,
} from "@/types/domain";

const DB_NAME = "secretary-app";
const DB_VERSION = 1;

// DecomposerDraft 型定義（将来的に decomposer.ts から import）
export type DecomposerDraft = {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  originalInput: string;
  tasks: any[]; // DecomposedTaskWithMeta[]
  selected: string[];
  targetColumnId: string;
  defaultDue?: string;
  title?: string;
};

// IndexedDB スキーマ定義
export interface SecretaryDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  tasks: {
    key: string;
    value: Task;
    indexes: {
      projectId: string;
      columnId: string;
      parentId: string;
      dueDate: string;
    };
  };
  columns: {
    key: string;
    value: Column;
    indexes: { boardId: string };
  };
  tags: {
    key: string;
    value: Tag;
    indexes: { projectId: string };
  };
  comments: {
    key: string;
    value: Comment;
    indexes: { taskId: string };
  };
  checklist: {
    key: string;
    value: ChecklistItem;
    indexes: { taskId: string };
  };
  users: {
    key: string;
    value: User;
  };
  members: {
    key: string;
    value: Member;
    indexes: { projectId: string; userId: string };
  };
  dependencies: {
    key: string;
    value: TaskDependency;
    indexes: { taskId: string; dependsOnTaskId: string };
  };
  decomposerDrafts: {
    key: string;
    value: DecomposerDraft;
    indexes: {
      projectId: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}

let dbInstance: IDBPDatabase<SecretaryDB> | null = null;

/**
 * IndexedDB データベースを取得（シングルトン）
 */
export async function getDB(): Promise<IDBPDatabase<SecretaryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SecretaryDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading DB from v${oldVersion} to v${newVersion}`);

      // projects ストア
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }

      // tasks ストア
      if (!db.objectStoreNames.contains("tasks")) {
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("projectId", "projectId", { unique: false });
        taskStore.createIndex("columnId", "columnId", { unique: false });
        taskStore.createIndex("parentId", "parentId", { unique: false });
        taskStore.createIndex("dueDate", "dueDate", { unique: false });
      }

      // columns ストア
      if (!db.objectStoreNames.contains("columns")) {
        const columnStore = db.createObjectStore("columns", { keyPath: "id" });
        columnStore.createIndex("boardId", "boardId", { unique: false });
      }

      // tags ストア
      if (!db.objectStoreNames.contains("tags")) {
        const tagStore = db.createObjectStore("tags", { keyPath: "id" });
        tagStore.createIndex("projectId", "projectId", { unique: false });
      }

      // comments ストア
      if (!db.objectStoreNames.contains("comments")) {
        const commentStore = db.createObjectStore("comments", {
          keyPath: "id",
        });
        commentStore.createIndex("taskId", "taskId", { unique: false });
      }

      // checklist ストア
      if (!db.objectStoreNames.contains("checklist")) {
        const checklistStore = db.createObjectStore("checklist", {
          keyPath: "id",
        });
        checklistStore.createIndex("taskId", "taskId", { unique: false });
      }

      // users ストア
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "id" });
      }

      // members ストア
      if (!db.objectStoreNames.contains("members")) {
        const memberStore = db.createObjectStore("members", { keyPath: "id" });
        memberStore.createIndex("projectId", "projectId", { unique: false });
        memberStore.createIndex("userId", "userId", { unique: false });
      }

      // dependencies ストア
      if (!db.objectStoreNames.contains("dependencies")) {
        const depStore = db.createObjectStore("dependencies", {
          keyPath: "id",
        });
        depStore.createIndex("taskId", "taskId", { unique: false });
        depStore.createIndex("dependsOnTaskId", "dependsOnTaskId", {
          unique: false,
        });
      }

      // decomposerDrafts ストア
      if (!db.objectStoreNames.contains("decomposerDrafts")) {
        const draftStore = db.createObjectStore("decomposerDrafts", {
          keyPath: "id",
        });
        draftStore.createIndex("projectId", "projectId", { unique: false });
        draftStore.createIndex("createdAt", "createdAt", { unique: false });
        draftStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    },
  });

  return dbInstance;
}

/**
 * データベースを閉じる
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * 既存の localStorage モックデータを削除
 */
export function clearLocalStorageMock(): void {
  const LOCALSTORAGE_KEY = "secretary.local.adapter.v1";
  localStorage.removeItem(LOCALSTORAGE_KEY);
  console.log("Cleared localStorage mock data");
}

/**
 * 最小シードデータを投入
 */
export async function seedMinimalData(): Promise<void> {
  const db = await getDB();

  // プロジェクトが既に存在する場合はスキップ
  const existingProjects = await db.getAll("projects");
  if (existingProjects.length > 0) {
    console.log("Projects already exist, skipping seed");
    return;
  }

  const projectId = crypto.randomUUID();
  const boardId = crypto.randomUUID();
  const userId = "u1";
  const now = new Date().toISOString();

  // トランザクション開始
  const tx = db.transaction(
    ["projects", "columns", "users", "members"],
    "readwrite"
  );

  // User を作成
  await tx.objectStore("users").add({
    id: userId,
    email: "user@example.com",
    displayName: "ユーザー",
    createdAt: now,
  });

  // Project を作成
  await tx.objectStore("projects").add({
    id: projectId,
    name: "Secretary",
    description: "タスク管理プロジェクト",
    createdAt: now,
    createdBy: userId,
  });

  // Member を作成
  await tx.objectStore("members").add({
    id: crypto.randomUUID(),
    projectId: projectId,
    userId: userId,
    role: "admin",
    joinedAt: now,
  });

  // Columns を作成
  const columns = [
    { name: "To Do", sortIndex: 1000 },
    { name: "Doing", sortIndex: 2000 },
    { name: "Done", sortIndex: 3000 },
  ];

  for (const col of columns) {
    await tx.objectStore("columns").add({
      id: crypto.randomUUID(),
      boardId: boardId,
      name: col.name,
      sortIndex: col.sortIndex,
    });
  }

  await tx.done;

  console.log("Seeded minimal data:", {
    projectId,
    boardId,
    columnsCount: columns.length,
  });
}
