# UI 仕様（Kanban / Gantt / Task / Project Settings）

目的は日本語 UI、紫ベース＋水色/青アクセントで、アクセシビリティとレスポンシブを担保しつつ段階導入を可能にすること。実装は小PRで進め、既存単一ページ構成に破壊的変更を加えず Adapter と FF で切替えます。

## 画面ワイヤ（簡易）

Kanban（ボード）

```
┌──────────────────────────────────────────────────────────────────────┐
│ ヘッダー: プロジェクト名 | 検索 | フィルタ | 追加 | ユーザ/テーマ      │
├──────────────────────────────────────────────────────────────────────┤
│ [To Do]        [Doing]        [Review]        [Done]                 │
│ ┌───────┐     ┌───────┐     ┌───────┐     ┌───────┐                │
│ │Card A │ ... │Card C │ ... │Card E │ ... │Card G │ ...            │
│ └───────┘     └───────┘     └───────┘     └───────┘                │
│  D&Dで並び替え／列移動、列の追加/編集/削除が可能                   │
└──────────────────────────────────────────────────────────────────────┘
```

Gantt（期間/依存）

```
┌──────────────────────────────────────────────────────────────────────┐
│ ヘッダー: プロジェクト名 | 表示範囲(月/週/日) | 絞り込み | 書き出し      │
├──────────────┬───────────────────────────────────────────────────────┤
│ タスク一覧    │  タイムライン（ドラッグで期間変更、線で依存作成）       │
│ Task A       │  ─────────────■───────────                           │
│ Task B       │          ────────■───────────→──────                 │
│ Task C       │     ─────■─────                                        │
└──────────────┴───────────────────────────────────────────────────────┘
```

Task 詳細（ドロワー）

```
┌───────────────────────────── ドロワー（右） ──────────────────────────┐
│ タイトル [編集]  進捗%  期限  担当  タグ                                   │
│ 説明（Markdown）                                                      │
│ チェックリスト [追加]                                                 │
│ 添付 [アップロード]                                                   │
│ コメント [入力欄]                                                     │
└──────────────────────────────────────────────────────────────────────┘
```

Project 設定

```
┌──────────────────────────────────────────────────────────────────────┐
│ 一般: 名前/説明  | メンバー: 追加/ロール変更  | タグ: 追加/色            │
│ 高度: 権限/招待リンク/エクスポート                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## コンポーネント設計（Props）

命名はケバブケースのファイル、ダブルクォート、セミコロン無し。型は `src/types/domain.ts` を参照。

Kanban

```ts
// src/components/kanban/kanban-board.tsx（予定）
export type KanbanBoardProps = {
  projectId: string
  columns: Column[]
  tasksByColumn: Record<string, Task[]>
  onTaskMove: (taskId: string, toColumnId: string, toIndex: number) => Promise<void>
  onColumnReorder: (ordered: { columnId: string, sortIndex: number }[]) => Promise<void>
  onAddTask: (columnId: string) => void
  filters?: {
    assigneeId?: string
    tagId?: string
    q?: string
  }
  loading?: boolean
}

export type KanbanColumnProps = {
  column: Column
  tasks: Task[]
  onTaskDrop: (taskId: string, toIndex: number) => void
  onAddTask: () => void
  onEditColumn: () => void
}

export type TaskCardProps = {
  task: Task
  onClick: (taskId: string) => void
  onDragStart?: (taskId: string) => void
  onDragEnd?: () => void
}
```

Gantt

```ts
// src/components/gantt/gantt-chart.tsx（予定）
export type GanttChartProps = {
  tasks: Task[]
  dependencies: { taskId: string, dependsOnTaskId: string }[]
  view: "month" | "week" | "day"
  timelineStart: string
  timelineEnd: string
  onDateChange: (taskId: string, start?: string, due?: string) => Promise<void>
  onProgressChange?: (taskId: string, progress: number) => Promise<void>
  onLinkCreate?: (fromTaskId: string, toTaskId: string) => Promise<void>
}

export type GanttRowProps = {
  task: Task
  onDateChange: (start?: string, due?: string) => void
}
```

Task 詳細

```ts
// src/components/task/task-drawer.tsx（予定）
export type TaskDrawerProps = {
  open: boolean
  task: Task | null
  members: Member[]
  tags: Tag[]
  onClose: () => void
  onUpdate: (patch: Partial<Task>) => Promise<void>
  onToggleChecklist: (itemId: string, done: boolean) => Promise<void>
  onAddChecklist: (title: string) => Promise<void>
  onRemoveChecklist: (itemId: string) => Promise<void>
  onAddComment: (body: string) => Promise<void>
  onRemoveComment: (commentId: string) => Promise<void>
  onAttach: (file: File) => Promise<void>
}
```

Project 設定

```ts
// src/components/project/project-settings.tsx（予定）
export type ProjectSettingsProps = {
  project: Project
  members: Member[]
  tags: Tag[]
  onUpdateProject: (patch: Partial<Project>) => Promise<void>
  onInvite: (email: string, role: Role) => Promise<void>
  onChangeRole: (memberId: string, role: Role) => Promise<void>
  onRemoveMember: (memberId: string) => Promise<void>
  onAddTag: (name: string, color: string) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
}
```

クロスカット（共通）

```ts
// src/components/common
export type ToolbarProps = {
  title?: string
  children?: React.ReactNode
  right?: React.ReactNode
}

export type FilterBarProps = {
  q?: string
  assigneeId?: string
  tagId?: string
  onChange: (patch: { q?: string, assigneeId?: string, tagId?: string }) => void
}
```

---

## テーマトークン（紫＋水色/青）

Tailwind 拡張想定。色は `brand` と `accent` を基本に、CSS 変数でダークモードにも連動可能。

Tailwind 例（導入時に `tailwind.config.ts` を extend）

```ts
// tailwind.config.ts（例）
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87"
        },
        accent: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e"
        }
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px"
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.06)",
        float: "0 8px 24px rgb(0 0 0 / 0.12)"
      }
    }
  }
}
```

利用ガイド

- 主要CTA/選択状態: `bg-brand-600 hover:bg-brand-700 text-white`
- アクセント/リンク/ハイライト: `text-accent-500`, `bg-accent-100`
- 情報レイヤ: `shadow-soft`、モーダル/ドロワー: `shadow-float`

---

## アクセシビリティ

- キーボード操作
  - Kanban D&D の代替: フォーカス行で `Alt+↑/↓` 並び替え、`Alt+←/→` 列移動
  - Gantt バー変更: フォーカス時に `←/→` で期間 1 日、`Shift+←/→` で 7 日
- ARIA
  - Kanban: `role="list"` 列、`role="listitem"` カード、`aria-grabbed`/`aria-dropeffect`
  - Gantt: タイムラインはグリッドロール、タスクバーは `aria-label` にタイトル/期間
- コントラスト比 4.5:1 以上（ブランド色は 600/700 を主に使用）

---

## レスポンシブ

- breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`
- Kanban: `md` 未満は横スクロール、列ヘッダはコンパクト
- Gantt: `md` 未満はリスト＋日付のみの簡易ビュー（FFで後追い可）
- ドロワー: `sm` 未満は全画面モーダル化

---

## i18n 方針（キー例）

```
kanban.title = カンバン
kanban.addColumn = 列を追加
kanban.addTask = タスクを追加
gantt.title = ガントチャート
task.assignees = 担当者
task.due = 期限
project.members = メンバー
project.role.admin = 管理者
project.role.editor = 編集者
project.role.viewer = 閲覧者
```

---

## D&D 挙動（要件）

- Kanban
  - 同一列 内: ドラッグで `sortIndex` 再割当（1000 ギャップ方式）
  - 別列 移動: `toColumnId` と `toIndex` を渡し、前後の `sortIndex` から中間値を採用
  - アクセシビリティ: キーボード操作は代替の再配置 API を呼ぶ
- Gantt
  - バー端ドラッグで開始/期限更新、中央ドラッグで平行移動
  - 依存作成はバー端をドラッグして他バーへ接続

---

## スタイルガイド（抜粋）

- 見出し: `text-2xl font-semibold`（モバイルは `text-xl`）
- 段落: `text-zinc-600 dark:text-zinc-400`
- 枠/背景: `border-zinc-200/70` と `bg-white/70`、ダークは `border-zinc-700/60` と `bg-zinc-900/70`
- フォーカス: `focus-visible:ring-2 focus-visible:ring-zinc-400`

---

## 実装順（UI スライス案）

1. 共通レイアウトとテーマトークンの適用（FF_NEW_THEME_TOKENS）
2. Kanban MVP（表示＋D&D 並び替え＋列追加）
3. Task ドロワー（編集/コメント/チェックリストの表示系）
4. Gantt MVP（読み取り専用バー表示）
5. Project 設定（メンバー/タグの表示系）
6. 双方向更新（PATCH/並び替え API 連携）

