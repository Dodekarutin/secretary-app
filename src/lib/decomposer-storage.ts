import { getDB } from "./db";
import type { DecomposerDraft } from "./db";
import type { DecomposedTask } from "./decomposer";

/**
 * 下書きを保存（新規作成または更新）
 */
export async function saveDraft(
  draft: Partial<DecomposerDraft> & { projectId: string }
): Promise<DecomposerDraft> {
  const db = await getDB();
  const now = new Date().toISOString();

  const fullDraft: DecomposerDraft = {
    id: draft.id || crypto.randomUUID(),
    projectId: draft.projectId,
    createdAt: draft.createdAt || now,
    updatedAt: now,
    originalInput: draft.originalInput || "",
    tasks: draft.tasks || [],
    selected: draft.selected || [],
    targetColumnId: draft.targetColumnId || "",
    defaultDue: draft.defaultDue,
    title: draft.title,
  };

  await db.put("decomposerDrafts", fullDraft);
  return fullDraft;
}

/**
 * 下書きを更新
 */
export async function updateDraft(
  id: string,
  updates: Partial<DecomposerDraft>
): Promise<DecomposerDraft | null> {
  const db = await getDB();
  const existing = await db.get("decomposerDrafts", id);

  if (!existing) return null;

  const updated: DecomposerDraft = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await db.put("decomposerDrafts", updated);
  return updated;
}

/**
 * 下書きを取得
 */
export async function loadDraft(id: string): Promise<DecomposerDraft | null> {
  const db = await getDB();
  const draft = await db.get("decomposerDrafts", id);
  return draft || null;
}

/**
 * 全下書きを取得（更新日降順）
 */
export async function listDrafts(
  projectId?: string
): Promise<DecomposerDraft[]> {
  const db = await getDB();

  if (projectId) {
    // プロジェクトでフィルタ
    const drafts = await db.getAllFromIndex(
      "decomposerDrafts",
      "projectId",
      projectId
    );
    return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  // 全件取得
  const drafts = await db.getAll("decomposerDrafts");
  return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * 下書きを検索
 */
export async function searchDrafts(query: string): Promise<DecomposerDraft[]> {
  const db = await getDB();
  const allDrafts = await db.getAll("decomposerDrafts");

  const lowerQuery = query.toLowerCase();
  return allDrafts
    .filter(
      (d) =>
        d.title?.toLowerCase().includes(lowerQuery) ||
        d.originalInput.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * 下書きを削除
 */
export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("decomposerDrafts", id);
}

/**
 * 古い下書きを自動削除（最大件数を超えた場合）
 */
export async function cleanupOldDrafts(maxCount: number = 50): Promise<void> {
  const db = await getDB();
  const allDrafts = await db.getAll("decomposerDrafts");

  if (allDrafts.length <= maxCount) return;

  // 更新日でソートして古いものを削除
  const sorted = allDrafts.sort((a, b) =>
    a.updatedAt.localeCompare(b.updatedAt)
  );
  const toDelete = sorted.slice(0, allDrafts.length - maxCount);

  const tx = db.transaction("decomposerDrafts", "readwrite");
  for (const draft of toDelete) {
    await tx.store.delete(draft.id);
  }
  await tx.done;
}

/**
 * 最後に編集した下書きを取得
 */
export async function getLastDraft(
  projectId: string
): Promise<DecomposerDraft | null> {
  const drafts = await listDrafts(projectId);
  return drafts.length > 0 ? drafts[0] : null;
}

/**
 * 下書きのタイトルを自動生成
 */
export function generateDraftTitle(
  input: string,
  tasks: DecomposedTask[]
): string {
  // 入力テキストの最初の50文字を使用
  if (input.trim().length > 0) {
    const firstLine = input.trim().split("\n")[0];
    return firstLine.length > 50 ? firstLine.slice(0, 50) + "..." : firstLine;
  }

  // タスクがある場合は最初のタスク名を使用
  if (tasks.length > 0) {
    const firstTask = tasks[0].title;
    return firstTask.length > 50 ? firstTask.slice(0, 50) + "..." : firstTask;
  }

  return "無題の下書き";
}
