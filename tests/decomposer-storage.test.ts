import { describe, it, expect, beforeEach } from "vitest";
import {
  saveDraft,
  updateDraft,
  loadDraft,
  listDrafts,
  searchDrafts,
  deleteDraft,
  cleanupOldDrafts,
  getLastDraft,
  generateDraftTitle,
} from "@/lib/decomposer-storage";
import { getDB, clearLocalStorageMock, seedMinimalData } from "@/lib/db";
import type { DecomposedTask } from "@/lib/decomposer";
import "fake-indexeddb/auto";

describe("decomposer storage", () => {
  let projectId: string;

  beforeEach(async () => {
    // Clear localStorage and IndexedDB
    localStorage.clear();
    clearLocalStorageMock();

    // Clear all IndexedDB stores
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

    // Get project ID
    const projects = await db.getAll("projects");
    projectId = projects[0].id;
  });

  it("saves a new draft", async () => {
    const tasks: DecomposedTask[] = [
      { title: "タスク1", children: [] },
      { title: "タスク2", children: [] },
    ];

    const draft = await saveDraft({
      projectId,
      originalInput: "テスト入力",
      tasks,
      selected: ["0", "1"],
      targetColumnId: "col-1",
      title: "テスト下書き",
    });

    expect(draft.id).toBeTruthy();
    expect(draft.projectId).toBe(projectId);
    expect(draft.originalInput).toBe("テスト入力");
    expect(draft.tasks).toEqual(tasks);
    expect(draft.selected).toEqual(["0", "1"]);
    expect(draft.createdAt).toBeTruthy();
    expect(draft.updatedAt).toBeTruthy();
  });

  it("updates an existing draft", async () => {
    const draft = await saveDraft({
      projectId,
      originalInput: "元の入力",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    // Wait a bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = await updateDraft(draft.id, {
      originalInput: "更新された入力",
      tasks: [{ title: "新しいタスク", children: [] }],
    });

    expect(updated).not.toBeNull();
    expect(updated!.originalInput).toBe("更新された入力");
    expect(updated!.tasks.length).toBe(1);
    expect(updated!.updatedAt).not.toBe(draft.updatedAt);
  });

  it("loads a draft by ID", async () => {
    const draft = await saveDraft({
      projectId,
      originalInput: "ロードテスト",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    const loaded = await loadDraft(draft.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(draft.id);
    expect(loaded!.originalInput).toBe("ロードテスト");
  });

  it("lists all drafts sorted by updated date", async () => {
    await saveDraft({
      projectId,
      originalInput: "下書き1",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    await saveDraft({
      projectId,
      originalInput: "下書き2",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    const drafts = await listDrafts(projectId);

    expect(drafts.length).toBe(2);
    // Most recent first
    expect(drafts[0].originalInput).toBe("下書き2");
    expect(drafts[1].originalInput).toBe("下書き1");
  });

  it("searches drafts by query", async () => {
    await saveDraft({
      projectId,
      originalInput: "重要なタスクを作成",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
      title: "重要タスク",
    });

    await saveDraft({
      projectId,
      originalInput: "普通のタスク",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
      title: "普通",
    });

    const results = await searchDrafts("重要");

    expect(results.length).toBe(1);
    expect(results[0].title).toBe("重要タスク");
  });

  it("deletes a draft", async () => {
    const draft = await saveDraft({
      projectId,
      originalInput: "削除テスト",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    await deleteDraft(draft.id);

    const loaded = await loadDraft(draft.id);
    expect(loaded).toBeNull();
  });

  it("cleans up old drafts", async () => {
    // Create 10 drafts
    for (let i = 0; i < 10; i++) {
      await saveDraft({
        projectId,
        originalInput: `下書き${i}`,
        tasks: [],
        selected: [],
        targetColumnId: "col-1",
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    // Keep only 5 most recent
    await cleanupOldDrafts(5);

    const remaining = await listDrafts(projectId);
    expect(remaining.length).toBe(5);
    // Most recent should still exist
    expect(remaining[0].originalInput).toBe("下書き9");
  });

  it("gets the last draft", async () => {
    await saveDraft({
      projectId,
      originalInput: "古い下書き",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await saveDraft({
      projectId,
      originalInput: "新しい下書き",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    const last = await getLastDraft(projectId);

    expect(last).not.toBeNull();
    expect(last!.originalInput).toBe("新しい下書き");
  });

  it("generates draft title from input", () => {
    const title1 = generateDraftTitle("これはテスト入力です", []);
    expect(title1).toBe("これはテスト入力です");

    const longInput = "a".repeat(100);
    const title2 = generateDraftTitle(longInput, []);
    expect(title2.length).toBeLessThanOrEqual(53); // 50 chars + "..."

    const title3 = generateDraftTitle("", [
      { title: "タスク名", children: [] },
    ]);
    expect(title3).toBe("タスク名");

    const title4 = generateDraftTitle("", []);
    expect(title4).toBe("無題の下書き");
  });

  it("handles multiple projects", async () => {
    const db = await getDB();
    const project2Id = crypto.randomUUID();
    await db.add("projects", {
      id: project2Id,
      name: "Project 2",
      createdAt: new Date().toISOString(),
      createdBy: "u1",
    });

    await saveDraft({
      projectId,
      originalInput: "プロジェクト1",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    await saveDraft({
      projectId: project2Id,
      originalInput: "プロジェクト2",
      tasks: [],
      selected: [],
      targetColumnId: "col-1",
    });

    const project1Drafts = await listDrafts(projectId);
    const project2Drafts = await listDrafts(project2Id);

    expect(project1Drafts.length).toBe(1);
    expect(project2Drafts.length).toBe(1);
    expect(project1Drafts[0].originalInput).toBe("プロジェクト1");
    expect(project2Drafts[0].originalInput).toBe("プロジェクト2");
  });
});
