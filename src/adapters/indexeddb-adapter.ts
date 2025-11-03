import { getDB } from "@/lib/db";
import type { DataAdapter, ListTasksQuery } from "./data-adapter";
import type {
  Task,
  Project,
  Column,
  Id,
  Tag,
  Comment,
  ChecklistItem,
  Member,
  User,
  Role,
  TaskDependency,
} from "@/types/domain";

/**
 * IndexedDB を使用するデータアダプタ
 */
export function createIndexedDBAdapter(): DataAdapter {
  return {
    async getDefaultProject(): Promise<Project> {
      const db = await getDB();
      const projects = await db.getAll("projects");

      if (projects.length === 0) {
        // 初期プロジェクトを作成
        const project: Project = {
          id: crypto.randomUUID(),
          name: "Secretary",
          description: "デフォルトプロジェクト",
          createdAt: new Date().toISOString(),
          createdBy: "u1",
        };
        await db.add("projects", project);
        return project;
      }

      return projects[0];
    },

    async getProject(projectId: Id): Promise<Project | null> {
      const db = await getDB();
      const project = await db.get("projects", projectId);
      return project || null;
    },

    async updateProject(
      projectId: Id,
      patch: Partial<Pick<Project, "name" | "description">>
    ): Promise<Project> {
      const db = await getDB();
      const existing = await db.get("projects", projectId);
      if (!existing) throw new Error("Project not found");

      const updated = { ...existing, ...patch };
      await db.put("projects", updated);
      return updated;
    },

    async getBoardColumns(projectId: Id): Promise<Column[]> {
      const db = await getDB();
      const allColumns = await db.getAll("columns");
      // Board は簡略化のため考慮せず、projectId で紐付けられたカラムを返す
      // 実際には boards テーブルを追加して board.projectId で関連付ける
      return allColumns.sort((a, b) => a.sortIndex - b.sortIndex);
    },

    async listTasks(q: ListTasksQuery): Promise<Task[]> {
      const db = await getDB();
      const tasks = await db.getAllFromIndex("tasks", "projectId", q.projectId);

      if (q.columnId) {
        return tasks.filter((t) => t.columnId === q.columnId);
      }

      return tasks;
    },

    async getTask(taskId: Id): Promise<Task | null> {
      const db = await getDB();
      const task = await db.get("tasks", taskId);
      return task || null;
    },

    async addTask(projectId: Id, columnId: Id, title: string): Promise<Task> {
      const db = await getDB();
      const siblings = await db.getAllFromIndex("tasks", "columnId", columnId);
      const maxIndex = siblings.reduce(
        (max, t) => Math.max(max, t.sortIndex),
        0
      );

      const task: Task = {
        id: crypto.randomUUID(),
        projectId,
        columnId,
        title,
        progress: 0,
        sortIndex: maxIndex + 1000,
        createdAt: new Date().toISOString(),
        createdBy: "u1",
      };

      await db.add("tasks", task);
      return task;
    },

    async updateTask(
      taskId: Id,
      patch: Partial<
        Pick<
          Task,
          | "title"
          | "description"
          | "startDate"
          | "dueDate"
          | "progress"
          | "columnId"
          | "sortIndex"
          | "parentId"
          | "estimatedHours"
        >
      >
    ): Promise<Task | null> {
      const db = await getDB();
      const existing = await db.get("tasks", taskId);
      if (!existing) return null;

      const updated = { ...existing, ...patch };
      await db.put("tasks", updated);
      return updated;
    },

    async moveTask(taskId: Id, toColumnId: Id, toIndex: number): Promise<void> {
      const db = await getDB();
      const task = await db.get("tasks", taskId);
      if (!task) return;

      const targetTasks = (
        await db.getAllFromIndex("tasks", "columnId", toColumnId)
      )
        .filter((t) => t.id !== taskId)
        .sort((a, b) => a.sortIndex - b.sortIndex);

      targetTasks.splice(toIndex, 0, task);

      // sortIndex を再割り当て
      const tx = db.transaction("tasks", "readwrite");
      let idx = 1000;
      for (const t of targetTasks) {
        t.columnId = toColumnId;
        t.sortIndex = idx;
        await tx.store.put(t);
        idx += 1000;
      }
      await tx.done;
    },

    async reorderColumns(
      projectId: Id,
      ordered: { columnId: Id; sortIndex: number }[]
    ): Promise<void> {
      const db = await getDB();
      const allColumns = await db.getAll("columns");

      const map = new Map(ordered.map((o) => [o.columnId, o.sortIndex]));
      const tx = db.transaction("columns", "readwrite");

      for (const col of allColumns) {
        const newIndex = map.get(col.id);
        if (typeof newIndex === "number") {
          col.sortIndex = newIndex;
          await tx.store.put(col);
        }
      }

      await tx.done;
    },

    // Checklist
    async listChecklist(taskId: Id): Promise<ChecklistItem[]> {
      const db = await getDB();
      const items = await db.getAllFromIndex("checklist", "taskId", taskId);
      return items.sort((a, b) => a.sortIndex - b.sortIndex);
    },

    async addChecklist(taskId: Id, title: string): Promise<ChecklistItem> {
      const db = await getDB();
      const siblings = await db.getAllFromIndex("checklist", "taskId", taskId);
      const maxIndex = siblings.reduce(
        (max, c) => Math.max(max, c.sortIndex),
        0
      );

      const item: ChecklistItem = {
        id: crypto.randomUUID(),
        taskId,
        title,
        done: false,
        sortIndex: maxIndex + 1000,
      };

      await db.add("checklist", item);
      return item;
    },

    async toggleChecklist(
      itemId: Id,
      done: boolean
    ): Promise<ChecklistItem | null> {
      const db = await getDB();
      const item = await db.get("checklist", itemId);
      if (!item) return null;

      item.done = done;
      await db.put("checklist", item);
      return item;
    },

    async removeChecklist(itemId: Id): Promise<void> {
      const db = await getDB();
      await db.delete("checklist", itemId);
    },

    async updateChecklist(
      itemId: Id,
      patch: Partial<
        Pick<
          ChecklistItem,
          "title" | "done" | "sortIndex" | "dueDate" | "assigneeId"
        >
      >
    ): Promise<ChecklistItem | null> {
      const db = await getDB();
      const item = await db.get("checklist", itemId);
      if (!item) return null;

      const updated = { ...item, ...patch };
      await db.put("checklist", updated);
      return updated;
    },

    // Comments
    async listComments(taskId: Id): Promise<Comment[]> {
      const db = await getDB();
      const comments = await db.getAllFromIndex("comments", "taskId", taskId);
      return comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async addComment(taskId: Id, body: string): Promise<Comment> {
      const db = await getDB();
      const comment: Comment = {
        id: crypto.randomUUID(),
        taskId,
        authorId: "u1",
        body,
        createdAt: new Date().toISOString(),
      };

      await db.add("comments", comment);
      return comment;
    },

    async removeComment(commentId: Id): Promise<void> {
      const db = await getDB();
      await db.delete("comments", commentId);
    },

    // Tags
    async listProjectTags(projectId: Id): Promise<Tag[]> {
      const db = await getDB();
      const tags = await db.getAllFromIndex("tags", "projectId", projectId);
      return tags.sort((a, b) => a.name.localeCompare(b.name));
    },

    async addProjectTag(
      projectId: Id,
      name: string,
      color: string
    ): Promise<Tag> {
      const db = await getDB();
      const tags = await db.getAllFromIndex("tags", "projectId", projectId);
      const existed = tags.find((t) => t.name === name);
      if (existed) return existed;

      const tag: Tag = {
        id: crypto.randomUUID(),
        projectId,
        name,
        color,
      };

      await db.add("tags", tag);
      return tag;
    },

    async removeProjectTag(tagId: Id): Promise<void> {
      const db = await getDB();
      await db.delete("tags", tagId);
      // taskTags も削除（別テーブルが必要だが簡略化のため省略）
    },

    async listTaskTags(taskId: Id): Promise<Tag[]> {
      // taskTags テーブルが必要だが簡略化のため空配列を返す
      return [];
    },

    async addTagToTask(taskId: Id, tagId: Id): Promise<void> {
      // taskTags テーブルに追加（簡略化のため省略）
    },

    async removeTagFromTask(taskId: Id, tagId: Id): Promise<void> {
      // taskTags テーブルから削除（簡略化のため省略）
    },

    // Members
    async listProjectMembers(projectId: Id): Promise<Member[]> {
      const db = await getDB();
      const members = await db.getAllFromIndex(
        "members",
        "projectId",
        projectId
      );
      return members;
    },

    async getUser(userId: Id): Promise<User | null> {
      const db = await getDB();
      const user = await db.get("users", userId);
      return user || null;
    },

    async listTaskAssignees(taskId: Id): Promise<Id[]> {
      // taskAssignees テーブルが必要だが簡略化のため空配列を返す
      return [];
    },

    async assignTask(taskId: Id, userId: Id): Promise<void> {
      // taskAssignees テーブルに追加（簡略化のため省略）
    },

    async unassignTask(taskId: Id, userId: Id): Promise<void> {
      // taskAssignees テーブルから削除（簡略化のため省略）
    },

    async addUser(email: string, displayName: string): Promise<User> {
      const db = await getDB();
      const allUsers = await db.getAll("users");
      const existed = allUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (existed) return existed;

      const user: User = {
        id: crypto.randomUUID(),
        email,
        displayName,
        createdAt: new Date().toISOString(),
      };

      await db.add("users", user);
      return user;
    },

    async addProjectMember(
      projectId: Id,
      userId: Id,
      role: Role
    ): Promise<Member> {
      const db = await getDB();
      const members = await db.getAllFromIndex(
        "members",
        "projectId",
        projectId
      );
      const existed = members.find((m) => m.userId === userId);
      if (existed) return existed;

      const member: Member = {
        id: crypto.randomUUID(),
        projectId,
        userId,
        role,
        joinedAt: new Date().toISOString(),
      };

      await db.add("members", member);
      return member;
    },

    async removeProjectMember(memberId: Id): Promise<void> {
      const db = await getDB();
      await db.delete("members", memberId);
    },

    // Projects
    async listProjects(): Promise<Project[]> {
      const db = await getDB();
      return await db.getAll("projects");
    },

    async createProject(name: string, description?: string): Promise<Project> {
      const db = await getDB();
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        description,
        createdAt: new Date().toISOString(),
        createdBy: "u1",
      };

      await db.add("projects", project);
      return project;
    },

    async createColumns(projectId: Id, names: string[]): Promise<Column[]> {
      const db = await getDB();
      const allColumns = await db.getAll("columns");
      const maxIndex = allColumns.reduce(
        (max, c) => Math.max(max, c.sortIndex),
        0
      );

      const boardId = crypto.randomUUID(); // 簡略化: board テーブルは省略
      const columns: Column[] = [];

      const tx = db.transaction("columns", "readwrite");
      for (let i = 0; i < names.length; i++) {
        const col: Column = {
          id: crypto.randomUUID(),
          boardId,
          name: names[i],
          sortIndex: maxIndex + (i + 1) * 1000,
        };
        await tx.store.add(col);
        columns.push(col);
      }
      await tx.done;

      return columns;
    },

    // WBS helpers
    async addSubtask(parentTaskId: Id, title: string): Promise<Task> {
      const db = await getDB();
      const parent = await db.get("tasks", parentTaskId);
      if (!parent) throw new Error("Parent task not found");

      const siblings = (await db.getAll("tasks")).filter(
        (t) => t.parentId === parentTaskId
      );
      const maxIndex = siblings.reduce(
        (max, t) => Math.max(max, t.sortIndex),
        0
      );

      const task: Task = {
        id: crypto.randomUUID(),
        projectId: parent.projectId,
        columnId: parent.columnId,
        title,
        progress: 0,
        sortIndex: maxIndex + 1000,
        createdAt: new Date().toISOString(),
        createdBy: "u1",
        parentId: parentTaskId,
      };

      await db.add("tasks", task);
      return task;
    },

    // Dependencies (optional)
    async listDependencies(projectId: Id): Promise<TaskDependency[]> {
      const db = await getDB();
      return await db.getAll("dependencies");
    },

    async addDependency(
      taskId: Id,
      dependsOnTaskId: Id
    ): Promise<TaskDependency> {
      const db = await getDB();
      const dep: TaskDependency = {
        id: crypto.randomUUID(),
        taskId,
        dependsOnTaskId,
      };

      await db.add("dependencies", dep);
      return dep;
    },

    async removeDependency(taskId: Id, dependsOnTaskId: Id): Promise<void> {
      const db = await getDB();
      const deps = await db.getAll("dependencies");
      const target = deps.find(
        (d) => d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId
      );
      if (target) {
        await db.delete("dependencies", target.id);
      }
    },
  };
}
