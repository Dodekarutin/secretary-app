import type { DataAdapter } from "@/adapters/data-adapter";
import type { Task, Id } from "@/types/domain";

/**
 * メタ情報を含むタスク型（decomposer から使用）
 */
export type DecomposedTaskWithMeta = {
  title: string;
  description?: string;
  estimatedHours?: number;
  startDate?: string;
  dueDate?: string;
  priority?: "high" | "medium" | "low";
  tags?: string[];
  children?: DecomposedTaskWithMeta[];
};

/**
 * デフォルトのタグカラーを取得
 */
function getDefaultColor(): string {
  const colors = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 階層構造のタスクを再帰的にアダプタに追加
 *
 * @param adapter データアダプタ
 * @param projectId プロジェクトID
 * @param columnId カラムID
 * @param task 追加するタスク（階層構造）
 * @param parentId 親タスクID（サブタスクの場合）
 * @returns 作成されたタスク
 */
export async function addTaskHierarchy(
  adapter: DataAdapter,
  projectId: Id,
  columnId: Id,
  task: DecomposedTaskWithMeta,
  parentId?: Id
): Promise<Task> {
  // 1. 親タスクを作成
  let created = await adapter.addTask(projectId, columnId, task.title);

  // 2. メタ情報を更新
  const updated = await adapter.updateTask(created.id, {
    description: task.description,
    estimatedHours: task.estimatedHours,
    startDate: task.startDate,
    dueDate: task.dueDate,
    parentId: parentId,
  });

  if (updated) {
    created = updated;
  }

  // 3. タグを追加
  if (task.tags && task.tags.length > 0) {
    for (const tagName of task.tags) {
      const existingTags = await adapter.listProjectTags(projectId);
      let tag = existingTags.find((t) => t.name === tagName);
      if (!tag) {
        tag = await adapter.addProjectTag(
          projectId,
          tagName,
          getDefaultColor()
        );
      }
      await adapter.addTagToTask(created.id, tag.id);
    }
  }

  // 4. 子タスクを再帰的に追加
  if (task.children && task.children.length > 0) {
    for (const child of task.children) {
      await addTaskHierarchy(adapter, projectId, columnId, child, created.id);
    }
  }

  return created;
}

/**
 * 複数のタスクを階層構造を保ったまま追加
 *
 * @param adapter データアダプタ
 * @param projectId プロジェクトID
 * @param columnId カラムID
 * @param tasks タスクの配列
 * @returns 作成されたルートタスクの配列
 */
export async function addTasksHierarchy(
  adapter: DataAdapter,
  projectId: Id,
  columnId: Id,
  tasks: DecomposedTaskWithMeta[]
): Promise<Task[]> {
  const results: Task[] = [];

  for (const task of tasks) {
    const created = await addTaskHierarchy(
      adapter,
      projectId,
      columnId,
      task,
      undefined
    );
    results.push(created);
  }

  return results;
}

/**
 * タスクの親子関係を取得
 *
 * @param adapter データアダプタ
 * @param projectId プロジェクトID
 * @returns 親子関係のマップ（親ID => 子タスクの配列）
 */
export async function getTaskHierarchyMap(
  adapter: DataAdapter,
  projectId: Id
): Promise<Map<Id | undefined, Task[]>> {
  const allTasks = await adapter.listTasks({ projectId });
  const map = new Map<Id | undefined, Task[]>();

  for (const task of allTasks) {
    const parentId = task.parentId;
    if (!map.has(parentId)) {
      map.set(parentId, []);
    }
    map.get(parentId)!.push(task);
  }

  return map;
}

/**
 * 特定タスクの全子孫を取得（再帰的）
 *
 * @param adapter データアダプタ
 * @param projectId プロジェクトID
 * @param parentId 親タスクID
 * @returns 子孫タスクの配列
 */
export async function getDescendants(
  adapter: DataAdapter,
  projectId: Id,
  parentId: Id
): Promise<Task[]> {
  const allTasks = await adapter.listTasks({ projectId });
  const descendants: Task[] = [];

  function collectDescendants(pid: Id) {
    const children = allTasks.filter((t) => t.parentId === pid);
    for (const child of children) {
      descendants.push(child);
      collectDescendants(child.id);
    }
  }

  collectDescendants(parentId);
  return descendants;
}
