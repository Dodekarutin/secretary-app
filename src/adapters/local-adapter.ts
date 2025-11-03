import type {
  Column,
  Id,
  Project,
  Task,
  ChecklistItem,
  Comment,
  Tag,
  TaskDependency,
  User,
  Member,
  Role,
} from "@/types/domain";
import type { DataAdapter, ListTasksQuery } from "./data-adapter";

const STORAGE_KEY = "secretary.local.adapter.v1";

type Db = {
  projects: Project[];
  boards: { id: Id; projectId: Id; name: string; sortIndex: number }[];
  columns: Column[];
  tasks: Task[];
  checklist: ChecklistItem[];
  comments: Comment[];
  tags: Tag[];
  taskTags: { taskId: Id; tagId: Id }[];
  dependencies: TaskDependency[];
  users: User[];
  members: Member[];
  taskAssignees: { taskId: Id; userId: Id }[];
};

function now() {
  return new Date().toISOString();
}

function toISOPlusDays(delta: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function load(): Db {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seed();
  try {
    return JSON.parse(raw) as Db;
  } catch {
    return seed();
  }
}

function save(db: Db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function seed(): Db {
  const projectId: Id = "p1";
  const boardId: Id = "b1";
  const columns: Column[] = [
    { id: "c1", boardId, name: "To Do", sortIndex: 1000 },
    { id: "c2", boardId, name: "Doing", sortIndex: 2000 },
    { id: "c3", boardId, name: "Done", sortIndex: 3000 },
  ];
  const tasks: Task[] = [
    // 階層構造のデモタスク
    {
      id: "t1",
      projectId,
      columnId: "c1",
      title: "新機能開発プロジェクト",
      description: "親タスク：プロジェクト全体",
      progress: 25,
      startDate: now().slice(0, 10),
      dueDate: toISOPlusDays(30),
      sortIndex: 1000,
      createdAt: now(),
      createdBy: "u1",
      estimatedHours: 100,
    },
    {
      id: "t1_1",
      projectId,
      columnId: "c1",
      title: "要件定義フェーズ",
      description: "小タスク：要件定義",
      progress: 60,
      startDate: now().slice(0, 10),
      dueDate: toISOPlusDays(10),
      sortIndex: 1000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1",
      estimatedHours: 30,
    },
    {
      id: "t1_1_1",
      projectId,
      columnId: "c2",
      title: "ユーザーヒアリング",
      description: "孫タスク：ヒアリング実施",
      progress: 100,
      startDate: now().slice(0, 10),
      dueDate: toISOPlusDays(3),
      sortIndex: 1000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1",
      estimatedHours: 8,
    },
    {
      id: "t1_1_1_1",
      projectId,
      columnId: "c3",
      title: "質問項目の作成",
      description: "ひ孫タスク：質問リスト作成",
      progress: 100,
      startDate: now().slice(0, 10),
      dueDate: toISOPlusDays(1),
      sortIndex: 1000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1_1",
      estimatedHours: 2,
    },
    {
      id: "t1_1_1_2",
      projectId,
      columnId: "c3",
      title: "インタビュー実施",
      description: "ひ孫タスク：インタビュー",
      progress: 100,
      startDate: toISOPlusDays(1),
      dueDate: toISOPlusDays(2),
      sortIndex: 2000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1_1",
      estimatedHours: 4,
    },
    {
      id: "t1_1_1_3",
      projectId,
      columnId: "c3",
      title: "結果まとめ",
      description: "ひ孫タスク：結果の整理",
      progress: 100,
      startDate: toISOPlusDays(2),
      dueDate: toISOPlusDays(3),
      sortIndex: 3000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1_1",
      estimatedHours: 2,
    },
    {
      id: "t1_1_2",
      projectId,
      columnId: "c2",
      title: "仕様書作成",
      description: "孫タスク：仕様書を作成",
      progress: 50,
      startDate: toISOPlusDays(3),
      dueDate: toISOPlusDays(7),
      sortIndex: 2000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1",
      estimatedHours: 16,
    },
    {
      id: "t1_1_2_1",
      projectId,
      columnId: "c2",
      title: "画面仕様の記述",
      description: "ひ孫タスク：UI仕様を詳細化",
      progress: 70,
      startDate: toISOPlusDays(3),
      dueDate: toISOPlusDays(5),
      sortIndex: 1000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1_2",
      estimatedHours: 8,
    },
    {
      id: "t1_1_2_2",
      projectId,
      columnId: "c2",
      title: "API仕様の記述",
      description: "ひ孫タスク：API仕様を詳細化",
      progress: 30,
      startDate: toISOPlusDays(5),
      dueDate: toISOPlusDays(7),
      sortIndex: 2000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1_2",
      estimatedHours: 8,
    },
    {
      id: "t1_1_3",
      projectId,
      columnId: "c1",
      title: "承認プロセス",
      description: "孫タスク：承認を得る",
      progress: 0,
      startDate: toISOPlusDays(7),
      dueDate: toISOPlusDays(10),
      sortIndex: 3000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_1",
      estimatedHours: 6,
    },
    {
      id: "t1_2",
      projectId,
      columnId: "c1",
      title: "設計フェーズ",
      description: "小タスク：設計",
      progress: 20,
      startDate: toISOPlusDays(10),
      dueDate: toISOPlusDays(20),
      sortIndex: 2000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1",
      estimatedHours: 40,
    },
    {
      id: "t1_2_1",
      projectId,
      columnId: "c1",
      title: "DB設計",
      description: "孫タスク：データベース設計",
      progress: 30,
      startDate: toISOPlusDays(10),
      dueDate: toISOPlusDays(13),
      sortIndex: 1000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_2",
      estimatedHours: 12,
    },
    {
      id: "t1_2_2",
      projectId,
      columnId: "c1",
      title: "アーキテクチャ設計",
      description: "孫タスク：システム構成設計",
      progress: 10,
      startDate: toISOPlusDays(13),
      dueDate: toISOPlusDays(17),
      sortIndex: 2000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_2",
      estimatedHours: 16,
    },
    {
      id: "t1_2_3",
      projectId,
      columnId: "c1",
      title: "UI/UXデザイン",
      description: "孫タスク：デザイン作成",
      progress: 20,
      startDate: toISOPlusDays(14),
      dueDate: toISOPlusDays(20),
      sortIndex: 3000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1_2",
      estimatedHours: 12,
    },
    {
      id: "t1_3",
      projectId,
      columnId: "c1",
      title: "実装フェーズ",
      description: "小タスク：実装",
      progress: 0,
      startDate: toISOPlusDays(20),
      dueDate: toISOPlusDays(30),
      sortIndex: 3000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t1",
      estimatedHours: 30,
    },
    // 別の親タスク
    {
      id: "t2",
      projectId,
      columnId: "c2",
      title: "バグ修正プロジェクト",
      description: "親タスク：バグ対応",
      progress: 75,
      startDate: now().slice(0, 10),
      dueDate: toISOPlusDays(7),
      sortIndex: 2000,
      createdAt: now(),
      createdBy: "u1",
      estimatedHours: 20,
    },
    {
      id: "t2_1",
      projectId,
      columnId: "c3",
      title: "ログイン画面のバグ",
      description: "小タスク：ログイン不具合",
      progress: 100,
      startDate: now().slice(0, 10),
      dueDate: toISOPlusDays(2),
      sortIndex: 1000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t2",
      estimatedHours: 8,
    },
    {
      id: "t2_2",
      projectId,
      columnId: "c2",
      title: "データ表示の不具合",
      description: "小タスク：表示バグ",
      progress: 50,
      startDate: toISOPlusDays(2),
      dueDate: toISOPlusDays(5),
      sortIndex: 2000,
      createdAt: now(),
      createdBy: "u1",
      parentId: "t2",
      estimatedHours: 12,
    },
  ];
  const db: Db = {
    projects: [
      {
        id: projectId,
        name: "Secretary",
        description: "Jootoのようなタスク管理アプリの開発中",
        createdAt: now(),
        createdBy: "u1",
      },
    ],
    boards: [{ id: boardId, projectId, name: "Default", sortIndex: 1000 }],
    columns,
    tasks,
    checklist: [
      {
        id: "cl1",
        taskId: "t1",
        title: "要件を洗い出す",
        done: false,
        sortIndex: 1000,
        dueDate: toISOPlusDays(2),
      },
    ],
    comments: [
      {
        id: "cm1",
        taskId: "t1",
        authorId: "u1",
        body: "まずはMVPを固めましょう",
        createdAt: now(),
      },
    ],
    tags: [
      { id: "tg1", projectId, name: "優先", color: "#ef4444" },
      { id: "tg2", projectId, name: "検討", color: "#f59e0b" },
    ],
    taskTags: [],
    dependencies: [],
    users: [
      {
        id: "u1",
        email: "user1@example.com",
        displayName: "ユーザー1",
        createdAt: now(),
      },
      {
        id: "u2",
        email: "user2@example.com",
        displayName: "ユーザー2",
        createdAt: now(),
      },
    ],
    members: [
      { id: "m1", projectId, userId: "u1", role: "admin", joinedAt: now() },
      { id: "m2", projectId, userId: "u2", role: "editor", joinedAt: now() },
    ],
    taskAssignees: [{ taskId: "t2", userId: "u2" }],
  };
  save(db);
  return db;
}

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createLocalAdapter(): DataAdapter {
  return {
    async getDefaultProject(): Promise<Project> {
      const db = load();
      const { getCurrentProjectId } = await import("@/lib/settings");
      const pid = getCurrentProjectId();
      const project = pid
        ? db.projects.find((x) => x.id === pid) ?? db.projects[0]
        : db.projects[0];
      // デモデータを補充（当該プロジェクトに30件未満なら追加）
      ensureDemoTasks(db, project.id, 30);
      save(db);
      return project;
    },
    async getProject(projectId: Id): Promise<Project | null> {
      const db = load();
      return db.projects.find((p) => p.id === projectId) ?? null;
    },
    async updateProject(
      projectId: Id,
      patch: Partial<Pick<Project, "name" | "description">>
    ): Promise<Project> {
      const db = load();
      const p = db.projects.find((x) => x.id === projectId);
      if (!p) throw new Error("project not found");
      if (typeof patch.name === "string") p.name = patch.name;
      if (typeof patch.description === "string")
        p.description = patch.description;
      save(db);
      return p;
    },
    async getBoardColumns(projectId: Id): Promise<Column[]> {
      const db = load();
      const board = db.boards.find((b) => b.projectId === projectId);
      if (!board) return [];
      return db.columns.filter((c) => c.boardId === board.id);
    },
    async listTasks(q: ListTasksQuery): Promise<Task[]> {
      const db = load();
      return db.tasks.filter(
        (t) =>
          t.projectId === q.projectId &&
          (!q.columnId || t.columnId === q.columnId)
      );
    },
    async getTask(taskId: Id): Promise<Task | null> {
      const db = load();
      return db.tasks.find((t) => t.id === taskId) ?? null;
    },
    async addTask(projectId: Id, columnId: Id, title: string): Promise<Task> {
      const db = load();
      const siblings = db.tasks.filter((t) => t.columnId === columnId);
      const max = siblings.reduce((m, t) => Math.max(m, t.sortIndex), 0);
      const task: Task = {
        id: nextId("t"),
        projectId,
        columnId,
        title,
        progress: 0,
        sortIndex: max + 1000,
        createdAt: now(),
        createdBy: "u1",
      };
      db.tasks.push(task);
      save(db);
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
      const db = load();
      const t = db.tasks.find((x) => x.id === taskId);
      if (!t) return null;
      if (typeof patch.title === "string") t.title = patch.title;
      if (typeof patch.description === "string")
        t.description = patch.description;
      if (typeof patch.startDate !== "undefined") t.startDate = patch.startDate;
      if (typeof patch.dueDate !== "undefined") t.dueDate = patch.dueDate;
      if (typeof patch.progress === "number")
        t.progress = Math.max(0, Math.min(100, patch.progress));
      if (typeof patch.columnId === "string") t.columnId = patch.columnId;
      if (typeof patch.sortIndex === "number") t.sortIndex = patch.sortIndex;
      if (typeof patch.parentId !== "undefined") t.parentId = patch.parentId;
      if (typeof patch.estimatedHours === "number")
        t.estimatedHours = patch.estimatedHours;
      save(db);
      return t;
    },
    async moveTask(taskId: Id, toColumnId: Id, toIndex: number): Promise<void> {
      const db = load();
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) return;
      // reindex in target column
      const target = db.tasks
        .filter((t) => t.columnId === toColumnId && t.id !== taskId)
        .sort((a, b) => a.sortIndex - b.sortIndex);
      target.splice(toIndex, 0, task);
      // reassign sortIndex with gap
      let idx = 1000;
      for (const t of target) {
        t.columnId = toColumnId;
        t.sortIndex = idx;
        idx += 1000;
      }
      save(db);
    },
    async reorderColumns(
      projectId: Id,
      ordered: { columnId: Id; sortIndex: number }[]
    ): Promise<void> {
      const db = load();
      const board = db.boards.find((b) => b.projectId === projectId);
      if (!board) return;
      const map = new Map(ordered.map((o) => [o.columnId, o.sortIndex]));
      db.columns.forEach((c) => {
        if (c.boardId === board.id) {
          const v = map.get(c.id);
          if (typeof v === "number") c.sortIndex = v;
        }
      });
      save(db);
    },
    async listChecklist(taskId: Id): Promise<ChecklistItem[]> {
      const db = load();
      return db.checklist
        .filter((c) => c.taskId === taskId)
        .sort((a, b) => a.sortIndex - b.sortIndex);
    },
    async addChecklist(taskId: Id, title: string): Promise<ChecklistItem> {
      const db = load();
      const siblings = db.checklist.filter((c) => c.taskId === taskId);
      const max = siblings.reduce((m, c) => Math.max(m, c.sortIndex), 0);
      const item: ChecklistItem = {
        id: nextId("cl"),
        taskId,
        title,
        done: false,
        sortIndex: max + 1000,
      };
      db.checklist.push(item);
      save(db);
      return item;
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
      const db = load();
      const it = db.checklist.find((c) => c.id === itemId);
      if (!it) return null;
      if (typeof patch.title === "string") it.title = patch.title;
      if (typeof patch.done === "boolean") it.done = patch.done;
      if (typeof patch.sortIndex === "number") it.sortIndex = patch.sortIndex;
      if (typeof patch.dueDate !== "undefined") it.dueDate = patch.dueDate;
      if (typeof patch.assigneeId !== "undefined")
        it.assigneeId = patch.assigneeId;
      save(db);
      return it;
    },
    async toggleChecklist(
      itemId: Id,
      done: boolean
    ): Promise<ChecklistItem | null> {
      const db = load();
      const it = db.checklist.find((c) => c.id === itemId);
      if (!it) return null;
      it.done = done;
      save(db);
      return it;
    },
    async removeChecklist(itemId: Id): Promise<void> {
      const db = load();
      db.checklist = db.checklist.filter((c) => c.id !== itemId);
      save(db);
    },
    async listComments(taskId: Id): Promise<Comment[]> {
      const db = load();
      return db.comments
        .filter((c) => c.taskId === taskId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async addComment(taskId: Id, body: string): Promise<Comment> {
      const db = load();
      const cm: Comment = {
        id: nextId("cm"),
        taskId,
        authorId: "u1",
        body,
        createdAt: now(),
      };
      db.comments.push(cm);
      save(db);
      return cm;
    },
    async removeComment(commentId: Id): Promise<void> {
      const db = load();
      db.comments = db.comments.filter((c) => c.id !== commentId);
      save(db);
    },
    async listProjectTags(projectId: Id): Promise<Tag[]> {
      const db = load();
      return db.tags
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async addProjectTag(
      projectId: Id,
      name: string,
      color: string
    ): Promise<Tag> {
      const db = load();
      const existed = db.tags.find(
        (t) => t.projectId === projectId && t.name === name
      );
      if (existed) return existed;
      const tag: Tag = { id: nextId("tg"), projectId, name, color };
      db.tags.push(tag);
      save(db);
      return tag;
    },
    async removeProjectTag(tagId: Id): Promise<void> {
      const db = load();
      db.tags = db.tags.filter((t) => t.id !== tagId);
      db.taskTags = db.taskTags.filter((tt) => tt.tagId !== tagId);
      save(db);
    },
    async listTaskTags(taskId: Id): Promise<Tag[]> {
      const db = load();
      const ids = db.taskTags
        .filter((tt) => tt.taskId === taskId)
        .map((x) => x.tagId);
      return db.tags.filter((t) => ids.includes(t.id));
    },
    async addTagToTask(taskId: Id, tagId: Id): Promise<void> {
      const db = load();
      if (!db.taskTags.find((x) => x.taskId === taskId && x.tagId === tagId)) {
        db.taskTags.push({ taskId, tagId });
        save(db);
      }
    },
    async removeTagFromTask(taskId: Id, tagId: Id): Promise<void> {
      const db = load();
      db.taskTags = db.taskTags.filter(
        (x) => !(x.taskId === taskId && x.tagId === tagId)
      );
      save(db);
    },
    async listProjectMembers(projectId: Id): Promise<Member[]> {
      const db = load();
      return db.members.filter((m) => m.projectId === projectId);
    },
    async getUser(userId: Id): Promise<User | null> {
      const db = load();
      return db.users.find((u) => u.id === userId) ?? null;
    },
    async listTaskAssignees(taskId: Id): Promise<Id[]> {
      const db = load();
      return db.taskAssignees
        .filter((a) => a.taskId === taskId)
        .map((a) => a.userId);
    },
    async assignTask(taskId: Id, userId: Id): Promise<void> {
      const db = load();
      if (
        !db.taskAssignees.find(
          (a) => a.taskId === taskId && a.userId === userId
        )
      ) {
        db.taskAssignees.push({ taskId, userId });
        save(db);
      }
    },
    async unassignTask(taskId: Id, userId: Id): Promise<void> {
      const db = load();
      db.taskAssignees = db.taskAssignees.filter(
        (a) => !(a.taskId === taskId && a.userId === userId)
      );
      save(db);
    },
    async addUser(email: string, displayName: string): Promise<User> {
      const db = load();
      const existed = db.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (existed) return existed;
      const u: User = { id: nextId("u"), email, displayName, createdAt: now() };
      db.users.push(u);
      save(db);
      return u;
    },
    async addProjectMember(
      projectId: Id,
      userId: Id,
      role: Role
    ): Promise<Member> {
      const db = load();
      const existed = db.members.find(
        (m) => m.projectId === projectId && m.userId === userId
      );
      if (existed) return existed;
      const m: Member = {
        id: nextId("m"),
        projectId,
        userId,
        role,
        joinedAt: now(),
      };
      db.members.push(m);
      save(db);
      return m;
    },
    async removeProjectMember(memberId: Id): Promise<void> {
      const db = load();
      const mem = db.members.find((m) => m.id === memberId);
      if (mem) {
        db.members = db.members.filter((m) => m.id !== memberId);
        db.taskAssignees = db.taskAssignees.filter(
          (a) => a.userId !== mem.userId
        );
        save(db);
      }
    },
    async listProjects(): Promise<Project[]> {
      const db = load();
      return db.projects;
    },
    async createProject(name: string, description?: string): Promise<Project> {
      const db = load();
      const p: Project = {
        id: nextId("p"),
        name,
        description,
        createdAt: now(),
        createdBy: "u1",
      };
      db.projects.push(p);
      // create a board
      db.boards.push({
        id: nextId("b"),
        projectId: p.id,
        name: "Board",
        sortIndex: 1000,
      });
      save(db);
      return p;
    },
    async createColumns(projectId: Id, names: string[]): Promise<Column[]> {
      const db = load();
      const board = db.boards.find((b) => b.projectId === projectId) || {
        id: nextId("b"),
        projectId,
        name: "Board",
        sortIndex: 1000,
      };
      if (!db.boards.find((b) => b.id === board.id)) db.boards.push(board);
      const start = db.columns.filter((c) => c.boardId === board.id).length;
      const cols: Column[] = names.map((n, i) => ({
        id: nextId("c"),
        boardId: board.id,
        name: n,
        sortIndex: (start + i + 1) * 1000,
      }));
      db.columns.push(...cols);
      save(db);
      return cols;
    },
    async addSubtask(parentTaskId: Id, title: string): Promise<Task> {
      const db = load();
      const parent = db.tasks.find((t) => t.id === parentTaskId);
      if (!parent) throw new Error("parent not found");
      const siblings = db.tasks.filter((t) => t.parentId === parentTaskId);
      const max = siblings.reduce((m, t) => Math.max(m, t.sortIndex), 0);
      const task: Task = {
        id: nextId("t"),
        projectId: parent.projectId,
        columnId: parent.columnId,
        title,
        description: undefined,
        startDate: undefined,
        dueDate: undefined,
        progress: 0,
        sortIndex: max + 1000,
        createdAt: now(),
        createdBy: "u1",
        parentId: parentTaskId,
      };
      db.tasks.push(task);
      save(db);
      return task;
    },
  };
}

// デモ用に不足タスクを自動生成
function ensureDemoTasks(db: any, projectId: Id, targetCount: number) {
  const existing = db.tasks.filter(
    (t: Task) => t.projectId === projectId
  ).length;
  const need = Math.max(0, targetCount - existing);
  if (need <= 0) return;
  // 対象ボードとカラム
  let board = db.boards.find((b: any) => b.projectId === projectId);
  if (!board) {
    board = { id: nextId("b"), projectId, name: "Board", sortIndex: 1000 };
    db.boards.push(board);
  }
  let cols: Column[] = db.columns.filter((c: Column) => c.boardId === board.id);
  if (cols.length === 0) {
    cols = ["To Do", "Doing", "Done"].map((name, i) => ({
      id: nextId("c"),
      boardId: board.id,
      name,
      sortIndex: (i + 1) * 1000,
    }));
    db.columns.push(...cols);
  }
  // 既存の siblings max sortIndex per column
  const byCol = new Map<string, number>();
  for (const c of cols) {
    const max = db.tasks
      .filter((t: Task) => t.columnId === c.id)
      .reduce((m: number, t: Task) => Math.max(m, t.sortIndex), 0);
    byCol.set(c.id, max);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const namePool = [
    "見積作成",
    "要件整理",
    "初回ヒアリング",
    "契約手続き",
    "請求処理",
    "導入準備",
    "QA対応",
    "改善提案",
    "仕様レビュー",
    "デモ実施",
    "社内承認",
    "納期調整",
    "検収対応",
    "フォローアップ",
    "資料作成",
  ];
  for (let i = 0; i < need; i++) {
    const col = cols[i % cols.length];
    const inc = (byCol.get(col.id) ?? 0) + 1000;
    byCol.set(col.id, inc);
    const offsetStart = Math.floor(Math.random() * 5) - 2; // -2..+2
    const offsetDue = offsetStart + 1 + Math.floor(Math.random() * 10); // 1..10日後
    const sd = new Date(today);
    sd.setDate(sd.getDate() + offsetStart);
    const dd = new Date(today);
    dd.setDate(dd.getDate() + offsetDue);
    const title = `デモ案件 ${existing + i + 1} - ${
      namePool[i % namePool.length]
    }`;
    const task: Task = {
      id: nextId("t"),
      projectId,
      columnId: col.id,
      title,
      description: undefined,
      startDate: toISO(sd),
      dueDate: toISO(dd),
      progress: Math.floor(Math.random() * 101),
      sortIndex: inc,
      createdAt: now(),
      createdBy: "u1",
    };
    db.tasks.push(task);
  }
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
