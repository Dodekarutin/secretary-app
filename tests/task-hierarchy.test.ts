import { describe, it, expect, beforeEach } from "vitest";
import { createIndexedDBAdapter } from "@/adapters/indexeddb-adapter";
import {
  addTaskHierarchy,
  addTasksHierarchy,
  getTaskHierarchyMap,
  getDescendants,
  type DecomposedTaskWithMeta,
} from "@/lib/task-hierarchy";
import { getDB, clearLocalStorageMock, seedMinimalData } from "@/lib/db";
import "fake-indexeddb/auto";

describe("task hierarchy", () => {
  beforeEach(async () => {
    // Clear localStorage and IndexedDB
    localStorage.clear();
    clearLocalStorageMock();

    // Clear all IndexedDB databases
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
    ];
    const tx = db.transaction(stores, "readwrite");
    for (const storeName of stores) {
      await tx.objectStore(storeName as any).clear();
    }
    await tx.done;

    // Seed minimal data
    await seedMinimalData();
  });

  it("adds a single task with hierarchy", async () => {
    const adapter = createIndexedDBAdapter();
    const project = await adapter.getDefaultProject();
    const cols = await adapter.getBoardColumns(project.id);
    const col = cols[0];

    const task: DecomposedTaskWithMeta = {
      title: "親タスク",
      description: "親の説明",
      estimatedHours: 10,
      children: [
        {
          title: "子タスク1",
          estimatedHours: 5,
        },
        {
          title: "子タスク2",
          estimatedHours: 5,
          children: [
            {
              title: "孫タスク",
              estimatedHours: 2,
            },
          ],
        },
      ],
    };

    const created = await addTaskHierarchy(adapter, project.id, col.id, task);

    expect(created.title).toBe("親タスク");
    expect(created.description).toBe("親の説明");
    expect(created.estimatedHours).toBe(10);
    expect(created.parentId).toBeUndefined();

    // 子タスクを確認
    const allTasks = await adapter.listTasks({ projectId: project.id });
    const children = allTasks.filter((t) => t.parentId === created.id);
    expect(children.length).toBe(2);
    expect(children.some((t) => t.title === "子タスク1")).toBe(true);
    expect(children.some((t) => t.title === "子タスク2")).toBe(true);

    // 孫タスクを確認
    const child2 = children.find((t) => t.title === "子タスク2");
    const grandchildren = allTasks.filter((t) => t.parentId === child2?.id);
    expect(grandchildren.length).toBe(1);
    expect(grandchildren[0].title).toBe("孫タスク");
    expect(grandchildren[0].estimatedHours).toBe(2);
  });

  it("adds multiple tasks with hierarchy", async () => {
    const adapter = createIndexedDBAdapter();
    const project = await adapter.getDefaultProject();
    const cols = await adapter.getBoardColumns(project.id);
    const col = cols[0];

    const tasks: DecomposedTaskWithMeta[] = [
      {
        title: "タスクA",
        children: [
          {
            title: "タスクA-1",
          },
        ],
      },
      {
        title: "タスクB",
        children: [
          {
            title: "タスクB-1",
          },
          {
            title: "タスクB-2",
          },
        ],
      },
    ];

    const created = await addTasksHierarchy(adapter, project.id, col.id, tasks);

    expect(created.length).toBe(2);
    expect(created[0].title).toBe("タスクA");
    expect(created[1].title).toBe("タスクB");

    const allTasks = await adapter.listTasks({ projectId: project.id });
    expect(allTasks.length).toBe(5); // 2 parent + 3 children
  });

  it("gets task hierarchy map", async () => {
    const adapter = createIndexedDBAdapter();
    const project = await adapter.getDefaultProject();
    const cols = await adapter.getBoardColumns(project.id);
    const col = cols[0];

    const task: DecomposedTaskWithMeta = {
      title: "親",
      children: [{ title: "子1" }, { title: "子2" }],
    };

    await addTaskHierarchy(adapter, project.id, col.id, task);

    const map = await getTaskHierarchyMap(adapter, project.id);

    // ルートタスク（parentId が undefined）
    const roots = map.get(undefined) || [];
    expect(roots.length).toBeGreaterThan(0);

    // 各親に対する子
    for (const root of roots) {
      const children = map.get(root.id) || [];
      if (root.title === "親") {
        expect(children.length).toBe(2);
      }
    }
  });

  it("gets all descendants", async () => {
    const adapter = createIndexedDBAdapter();
    const project = await adapter.getDefaultProject();
    const cols = await adapter.getBoardColumns(project.id);
    const col = cols[0];

    const task: DecomposedTaskWithMeta = {
      title: "親",
      children: [
        {
          title: "子",
          children: [{ title: "孫" }],
        },
      ],
    };

    const parent = await addTaskHierarchy(adapter, project.id, col.id, task);
    const descendants = await getDescendants(adapter, project.id, parent.id);

    expect(descendants.length).toBe(2); // 子 + 孫
    expect(descendants.some((t) => t.title === "子")).toBe(true);
    expect(descendants.some((t) => t.title === "孫")).toBe(true);
  });

  it("preserves metadata when adding hierarchy", async () => {
    const adapter = createIndexedDBAdapter();
    const project = await adapter.getDefaultProject();
    const cols = await adapter.getBoardColumns(project.id);
    const col = cols[0];

    const task: DecomposedTaskWithMeta = {
      title: "テストタスク",
      description: "詳細説明",
      estimatedHours: 8,
      dueDate: "2025-12-31",
      priority: "high",
    };

    const created = await addTaskHierarchy(adapter, project.id, col.id, task);

    expect(created.title).toBe("テストタスク");
    expect(created.description).toBe("詳細説明");
    expect(created.estimatedHours).toBe(8);
    expect(created.dueDate).toBe("2025-12-31");
  });

  it("adds tasks with deep hierarchy (4+ levels)", async () => {
    const adapter = createIndexedDBAdapter();
    const project = await adapter.getDefaultProject();
    const cols = await adapter.getBoardColumns(project.id);
    const col = cols[0];

    // 5階層のタスク構造を作成（親 > 子 > 孫 > ひ孫 > 玄孫）
    const task: DecomposedTaskWithMeta = {
      title: "プロジェクト全体",
      children: [
        {
          title: "フェーズ1",
          children: [
            {
              title: "モジュールA",
              children: [
                {
                  title: "機能X",
                  children: [
                    {
                      title: "詳細実装タスク",
                      estimatedHours: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const created = await addTaskHierarchy(adapter, project.id, col.id, task);

    expect(created.title).toBe("プロジェクト全体");

    // すべてのタスクを取得
    const allTasks = await adapter.listTasks({ projectId: project.id });
    
    // 5階層分のタスクが作成されているか確認
    expect(allTasks.length).toBeGreaterThanOrEqual(5);
    expect(allTasks.some((t) => t.title === "プロジェクト全体")).toBe(true);
    expect(allTasks.some((t) => t.title === "フェーズ1")).toBe(true);
    expect(allTasks.some((t) => t.title === "モジュールA")).toBe(true);
    expect(allTasks.some((t) => t.title === "機能X")).toBe(true);
    expect(allTasks.some((t) => t.title === "詳細実装タスク")).toBe(true);

    // 最も深い階層のタスクを確認
    const deepestTask = allTasks.find((t) => t.title === "詳細実装タスク");
    expect(deepestTask).toBeDefined();
    expect(deepestTask?.estimatedHours).toBe(2);
    expect(deepestTask?.parentId).toBeDefined();

    // 親子関係が正しく設定されているか確認
    const phase1 = allTasks.find((t) => t.title === "フェーズ1");
    expect(phase1?.parentId).toBe(created.id);

    const moduleA = allTasks.find((t) => t.title === "モジュールA");
    expect(moduleA?.parentId).toBe(phase1?.id);

    const featureX = allTasks.find((t) => t.title === "機能X");
    expect(featureX?.parentId).toBe(moduleA?.id);

    expect(deepestTask?.parentId).toBe(featureX?.id);
  });

  it("gets all descendants for deep hierarchy", async () => {
    const adapter = createIndexedDBAdapter();
    const project = await adapter.getDefaultProject();
    const cols = await adapter.getBoardColumns(project.id);
    const col = cols[0];

    // 4階層のタスク構造を作成
    const task: DecomposedTaskWithMeta = {
      title: "ルート",
      children: [
        {
          title: "レベル1",
          children: [
            {
              title: "レベル2",
              children: [
                {
                  title: "レベル3",
                },
              ],
            },
          ],
        },
      ],
    };

    const root = await addTaskHierarchy(adapter, project.id, col.id, task);
    const descendants = await getDescendants(adapter, project.id, root.id);

    // ルートを除く3つの子孫が取得できるか確認
    expect(descendants.length).toBe(3);
    expect(descendants.some((t) => t.title === "レベル1")).toBe(true);
    expect(descendants.some((t) => t.title === "レベル2")).toBe(true);
    expect(descendants.some((t) => t.title === "レベル3")).toBe(true);
  });
});
