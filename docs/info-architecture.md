# 拡張後の情報設計（v1）

本ドキュメントは Secretary の拡張後ドメインを定義します。対象は ER 図、API v1 仕様（型定義含む）、イベント/通知、権限/ロールです。現行 UI/ローカル状態を壊さず、アダプタ層で段階導入する前提です。

## 目標

- タスクの可視化/進捗共有/期限管理をプロジェクト単位で実現
- カンバン（列/並び替え/D&D）、ガント（期間/依存/進捗）を段階導入
- コメント/通知/検索/添付を備え、ロール（管理者/編集者/閲覧者）で権限制御
- API v1 は後方互換に配慮し、フロントはアダプタで切替可能に

---

## ER 図（Mermaid）

```mermaid
erDiagram
  User ||--o{ ProjectMember : has
  Project ||--o{ ProjectMember : has
  Project ||--o{ Board : has
  Board ||--o{ Column : has
  Project ||--o{ Tag : has

  Project ||--o{ Task : has
  Column ||--o{ Task : contains
  Task }o--o{ User : TaskAssignee
  Task ||--o{ ChecklistItem : has
  Task ||--o{ Comment : has
  Task ||--o{ Attachment : has
  Task ||--o{ TaskDependency : depends
  TaskDependency }o--|| Task : prerequisite

  Notification }o--|| User : recipient
  Notification }o--|| Project : scope

  User {
    uuid id PK
    string email
    string displayName
    datetime createdAt
  }

  Project {
    uuid id PK
    string name
    string description
    datetime createdAt
    uuid createdBy FK -> User.id
  }

  ProjectMember {
    uuid id PK
    uuid projectId FK -> Project.id
    uuid userId FK -> User.id
    string role  // admin | editor | viewer
    datetime joinedAt
    UNIQUE(projectId, userId)
  }

  Board {
    uuid id PK
    uuid projectId FK -> Project.id
    string name
    int sortIndex
  }

  Column {
    uuid id PK
    uuid boardId FK -> Board.id
    string name
    int wipLimit
    int sortIndex
  }

  Task {
    uuid id PK
    uuid projectId FK -> Project.id
    uuid columnId FK -> Column.id
    string title
    string description
    date startDate
    date dueDate
    int progress  // 0..100
    int sortIndex
    datetime createdAt
    uuid createdBy FK -> User.id
  }

  TaskAssignee {
    uuid id PK
    uuid taskId FK -> Task.id
    uuid userId FK -> User.id
    UNIQUE(taskId, userId)
  }

  ChecklistItem {
    uuid id PK
    uuid taskId FK -> Task.id
    string title
    boolean done
    int sortIndex
  }

  Tag {
    uuid id PK
    uuid projectId FK -> Project.id
    string name
    string color  // token key
    UNIQUE(projectId, name)
  }

  TaskTag {
    uuid id PK
    uuid taskId FK -> Task.id
    uuid tagId FK -> Tag.id
    UNIQUE(taskId, tagId)
  }

  Comment {
    uuid id PK
    uuid taskId FK -> Task.id
    uuid authorId FK -> User.id
    string body
    datetime createdAt
  }

  Attachment {
    uuid id PK
    uuid taskId FK -> Task.id
    string filename
    string mimeType
    int sizeBytes
    string storageKey // e.g. s3 key
    datetime createdAt
  }

  TaskDependency {
    uuid id PK
    uuid taskId FK -> Task.id
    uuid dependsOnTaskId FK -> Task.id
    UNIQUE(taskId, dependsOnTaskId)
  }

  Notification {
    uuid id PK
    uuid projectId FK -> Project.id
    uuid recipientId FK -> User.id
    string type  // due_soon | overdue | comment | reassigned | mention
    string refType // task | comment | project
    uuid refId
    boolean read
    datetime createdAt
  }
```

主インデックス例: `(ProjectMember.projectId, userId)`, `(Column.boardId, sortIndex)`, `(Task.projectId, columnId, sortIndex)`, `(Task.dueDate)`, `(TaskDependency.taskId)`

---

## API v1 仕様（要約）

- ベースパス: `/api/v1`
- 認証: JWT（Cookie/HttpOnly 推奨）
- 形式: `application/json`。アップロードはマルチパートまたは事前署名URL
- エラー: `{"error": {"code": string, "message": string}}`

### 認証

- POST `/auth/signup` { email, password, displayName }
- POST `/auth/login` { email, password }
- POST `/auth/logout`
- GET `/auth/me` → { user }

### プロジェクト / メンバー

- GET `/projects` → Project[]
- POST `/projects` { name, description? } → Project
- GET `/projects/:projectId` → Project
- PATCH `/projects/:projectId` { name?, description? }
- DELETE `/projects/:projectId`

- GET `/projects/:projectId/members` → Member[]
- POST `/projects/:projectId/members` { userId, role }
- PATCH `/projects/:projectId/members/:memberId` { role }
- DELETE `/projects/:projectId/members/:memberId`

### ボード / カラム

- GET `/projects/:projectId/boards` → Board[]
- POST `/projects/:projectId/boards` { name } → Board
- PATCH `/boards/:boardId` { name?, sortIndex? }
- DELETE `/boards/:boardId`

- GET `/boards/:boardId/columns` → Column[]
- POST `/boards/:boardId/columns` { name, wipLimit?, sortIndex? } → Column
- PATCH `/columns/:columnId` { name?, wipLimit?, sortIndex? }
- DELETE `/columns/:columnId`

### タスク

- GET `/projects/:projectId/tasks` → Task[]（クエリ: `columnId?`, `assigneeId?`, `tagId?`, `dueFrom?`, `dueTo?`, `q?`）
- POST `/projects/:projectId/tasks` { title, description?, columnId, startDate?, dueDate?, progress? } → Task
- GET `/tasks/:taskId` → TaskDetail
- PATCH `/tasks/:taskId` { title?, description?, columnId?, startDate?, dueDate?, progress?, sortIndex? }
- DELETE `/tasks/:taskId`

並び替え（D&D）:
- POST `/columns/:columnId/tasks:reorder` { ordered: { taskId, sortIndex }[] }
- POST `/tasks/:taskId:move` { toColumnId, toSortIndex }

担当/チェックリスト/タグ:
- POST `/tasks/:taskId/assignees` { userId }
- DELETE `/tasks/:taskId/assignees/:userId`
- GET `/tasks/:taskId/checklist` → ChecklistItem[]
- POST `/tasks/:taskId/checklist` { title } → ChecklistItem
- PATCH `/checklist/:itemId` { title?, done?, sortIndex? }
- DELETE `/checklist/:itemId`
- GET `/projects/:projectId/tags` → Tag[]
- POST `/projects/:projectId/tags` { name, color } → Tag
- POST `/tasks/:taskId/tags` { tagId }
- DELETE `/tasks/:taskId/tags/:tagId`

コメント:
- GET `/tasks/:taskId/comments` → Comment[]
- POST `/tasks/:taskId/comments` { body } → Comment
- DELETE `/comments/:commentId`

依存関係:
- GET `/tasks/:taskId/dependencies` → { dependsOn: Task[], blockers: Task[] }
- POST `/tasks/:taskId/dependencies` { dependsOnTaskId }
- DELETE `/tasks/:taskId/dependencies/:dependsOnTaskId`

ファイル（添付）:
- POST `/files/presign` { filename, mimeType, sizeBytes } → { uploadUrl, storageKey }
- POST `/tasks/:taskId/attachments` { filename, mimeType, sizeBytes, storageKey } → Attachment
- GET `/attachments/:attachmentId/download` → 302/URL

通知:
- GET `/notifications` → Notification[]（`projectId?`, `read?`）
- POST `/notifications/:id:read`

検索:
- GET `/search`（`projectId`, `q`, `assigneeId?`, `dueFrom?`, `dueTo?`, `tagId?`, `status?`）→ { tasks: Task[] }

---

## TypeScript 型（DTO/クライアント）

実装時は `src/types` に共有型を配置し、zod 等でバリデーションを付与予定。以下は概要です。

```ts
// src/types/domain.ts（予定）
export type Id = string

export type Role = "admin" | "editor" | "viewer"

export type User = {
  id: Id
  email: string
  displayName: string
  createdAt: string
}

export type Project = {
  id: Id
  name: string
  description?: string
  createdAt: string
  createdBy: Id
}

export type Member = {
  id: Id
  projectId: Id
  userId: Id
  role: Role
  joinedAt: string
}

export type Board = {
  id: Id
  projectId: Id
  name: string
  sortIndex: number
}

export type Column = {
  id: Id
  boardId: Id
  name: string
  wipLimit?: number
  sortIndex: number
}

export type Task = {
  id: Id
  projectId: Id
  columnId: Id
  title: string
  description?: string
  startDate?: string
  dueDate?: string
  progress: number
  sortIndex: number
  createdAt: string
  createdBy: Id
}

export type ChecklistItem = {
  id: Id
  taskId: Id
  title: string
  done: boolean
  sortIndex: number
}

export type Tag = {
  id: Id
  projectId: Id
  name: string
  color: string
}

export type Comment = {
  id: Id
  taskId: Id
  authorId: Id
  body: string
  createdAt: string
}

export type Attachment = {
  id: Id
  taskId: Id
  filename: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  createdAt: string
}

export type NotificationType =
  | "due_soon"
  | "overdue"
  | "comment"
  | "reassigned"
  | "mention"

export type Notification = {
  id: Id
  projectId: Id
  recipientId: Id
  type: NotificationType
  refType: "task" | "comment" | "project"
  refId: Id
  read: boolean
  createdAt: string
}
```

クライアント DTO は、サーバ返却の `createdAt` などは ISO8601 文字列を基本とし、フロントで `Date` に変換する責務を Adapter 側に寄せます。

---

## ドメインイベント / 通知設計

リアルタイムは Socket.io/SSE のいずれか。イベント名は `project:{id}:*` 名前空間を推奨。通知は永続化し、ユーザー既読を保持。

イベント（例）:

- `project:{id}:task.created` { task }
- `project:{id}:task.updated` { task, diff }
- `project:{id}:task.moved` { taskId, fromColumnId, toColumnId, toSortIndex }
- `project:{id}:comment.created` { comment }
- `project:{id}:assignee.changed` { taskId, assignees: Id[] }
- `project:{id}:tag.updated` { tag }
- `project:{id}:column.reordered` { columnId, sortIndex }

通知トリガー（例）:

- 期限接近（24/48 時間前）: type `due_soon`
- 期限超過: type `overdue`
- コメント追加: type `comment`
- 担当変更: type `reassigned`
- メンション（@user）: type `mention`

抑制/集約:

- 同一タスクの期限通知は 1 日 1 回まで
- バルク編集時はサマリー通知に集約

---

## 権限/ロール定義

- `admin`: プロジェクト設定/メンバー管理/全 CRUD
- `editor`: タスク/カラム/コメント/タグ/添付の CRUD、並び替え可。メンバー管理不可
- `viewer`: 読み取り、コメント作成可（削除は自分のコメントのみ）

エンドポイント許可（要旨）:

- プロジェクト作成: 認証済み
- メンバー管理: admin
- ボード/カラム CRUD: admin, editor（削除は admin 優先でも可）
- タスク/コメント/タグ/添付 CRUD: admin, editor（viewer は作成/編集不可、コメント作成のみ可）

---

## 並び順・D&D指針

- `sortIndex` は 1000 刻みのギャップ方式を採用し、D&D 時は区間内再割当で衝突を低減
- 列移動は `toColumnId` と `toSortIndex` を付与

---

## バリデーション/パフォーマンス

- タイトル: 1..200 文字、必須
- 説明: 最大 10,000 文字
- 添付: 最大 50MB/ファイル、合計 500MB/タスク（実装時に制限）
- 期限: `startDate <= dueDate`
- 索引: `projectId + columnId + sortIndex`、`dueDate`、`assigneeId`（結合）、全文検索は後続で導入

---

## 互換方針（現行アプリ連携）

- フロントに `DataAdapter` を導入し、`LocalAdapter`（現行 State/localStorage）と `HttpAdapter(v1)` を FF で切替
- 既存 `Todo` 型は `Task` のサブセットにマップ（title, done→progress=100 で相当）。既存 UI はアダプタ変換結果を表示
- AI 分解結果は新規 `Task` 作成ダイアログに流し込み可能（既存 decomposer を再利用）

