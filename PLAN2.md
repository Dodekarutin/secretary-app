# PLAN2.md - タスクデータのローカル永続化実装プラン（IndexedDB 版）

最終更新: 2025-10-31

## Goal

タスク分解画面（`/decomposer`）で AI が生成したタスクの階層構造とメタ情報を**IndexedDB**で管理し、編集・保存・カンバンへの追加時に親子関係を維持できるようにする。

## エグゼクティブサマリー

### 技術決定: localStorage → IndexedDB

**問題**: localStorage の容量制限（約 5MB）では、大量のタスク、メタ情報、添付ファイル、履歴を保存できない。

**解決**: **IndexedDB** を採用することで以下を実現：

- ✅ **大容量**: 数百 MB〜数 GB まで拡張可能（ブラウザにより異なる）
- ✅ **高速検索**: インデックスによる効率的なクエリ
- ✅ **構造化データ**: JSON、Blob、バイナリを直接保存
- ✅ **トランザクション**: データ整合性の保証
- ✅ **非同期 API**: UI ブロックなし

注記: 現在のデータはモックのため、は不要。新規に IndexedDB を採用する。

## 現状分析

### 既存の実装

✅ **実装済み**

- `LocalAdapter` による `localStorage` へのデータ保存（`secretary.local.adapter.v1`）
  - **制限**: localStorage は約 5MB の容量制限があり、大量のタスク保存には不適切
- `Task` 型に `parentId` フィールドあり（階層構造対応可能）
- `DecomposedTask` 型で階層構造のタスクを表現
- decomposer から `adapter.addTask()` でカンバンへ追加

### 問題点

❌ **未実装・不足している機能**

1. **ストレージ容量の限界**: localStorage (5MB) では大量タスク・添付・履歴の保存が困難
2. **階層構造の喪失**: decomposer で生成した親子関係がカンバン追加時に平坦化される
3. **メタ情報の未保存**: 優先度・見積もり工数・メモなどが設定・保存できない
4. **編集状態の揮発**: ページをリロードすると分解結果が消える
5. **一時保存がない**: 作業途中の状態を保存できない
6. **検索・フィルタ性能**: localStorage では大量データの検索が遅い

### 現在のデータフロー（問題あり）

```
[ユーザー入力]
    ↓
[AI 分解] → DecomposedTask[] (メモリ上のみ)
    ↓
[選択 & 追加] → adapter.addTask() (平坦化されてカンバンへ)
    ↓
[localStorage] (親子関係は失われる、容量制限 5MB)
```

### 新しいデータフロー（IndexedDB 採用）

```
[ユーザー入力]
    ↓
[AI 分解] → DecomposedTask[] → IndexedDB (自動保存)
    ↓                              ↓
    |                          [下書き管理]
    |                              ↓
    |                          [復元可能]
    ↓
[選択 & メタ情報編集] → IndexedDB に保存
    ↓
[カンバンへ追加] → adapter.addTask() (階層構造を保持)
    ↓
[IndexedDB] (容量: 数GB、親子関係・メタ情報を完全保存)
```

## 実装ゴール

### Phase 1: 階層構造の永続化（重要度: 高）

**目標**: 親子関係を保ったままタスクをカンバンに追加できるようにする

- ☐ `addTask` 実行時に `parentId` を正しく設定
- ☐ 親タスクを先に作成し、その ID を子・孫タスクに設定
- ☐ 再帰的なタスク追加関数を実装（`addTaskHierarchy`）
- ☐ カンバン・ガント・WBS で親子関係を表示

**成果物**:

- `src/lib/task-hierarchy.ts`: 階層構造管理のユーティリティ
- `decomposer-root.tsx` の `addTasks` 関数を拡張
- ユニットテスト: 親子関係の保存・取得

---

### Phase 2: 編集中タスクの一時保存（重要度: 高）

**目標**: 分解結果とユーザーの編集内容を IndexedDB に自動保存

- ☐ 分解結果を **IndexedDB** に一時保存
- ☐ ページリロード時に前回の分解結果を復元
- ☐ 「下書きをクリア」ボタンで明示的に削除可能
- ☐ 複数の下書きを保存（タイムスタンプ付き）
- ☐ 下書き一覧から選択して復元
- ☐ 下書きの検索・フィルタ機能（作成日、更新日、タイトル）

**データ構造**:

```typescript
type DecomposerDraft = {
  id: string; // 下書き ID
  createdAt: string; // 作成日時
  updatedAt: string; // 更新日時
  originalInput: string; // 元の入力テキスト
  tasks: DecomposedTask[]; // 分解結果
  selected: string[]; // 選択されたタスクのパス
  targetColumnId: string; // 対象列
  defaultDue?: string; // デフォルト期限
};
```

**成果物**:

- `src/lib/decomposer-storage.ts`: 下書き保存・復元のユーティリティ
- `decomposer-root.tsx` に自動保存機能を追加
- 下書き一覧 UI（モーダルまたはサイドバー）
- ユニットテスト: 下書きの CRUD

---

### Phase 3: メタ情報の拡張（重要度: 中）

**目標**: タスクに優先度・工数・メモなどの情報を追加

**3.1 型定義の拡張**

現在の `DecomposedTask` を拡張:

```typescript
export type TaskPriority = "high" | "medium" | "low";

export type DecomposedTaskWithMeta = {
  title: string;
  description?: string; // 詳細説明
  estimatedHours?: number; // 見積もり工数（時間）
  dueDate?: string; // 期限（ISO 日付）
  priority?: TaskPriority; // 優先度
  tags?: string[]; // タグ
  children?: DecomposedTaskWithMeta[];
};
```

**3.2 メタ情報入力 UI**

- ☐ 各タスクに「詳細を編集」ボタン追加
- ☐ インラインまたはモーダルで以下を入力可能に:
  - 優先度選択（高/中/低、色分け）
  - 見積もり工数（0.5h 刻み）
  - 期限（デートピッカー）
  - タグ選択（既存タグから選択、または新規作成）
  - メモ/説明（テキストエリア、最大 500 文字）

**3.3 カンバン追加時のメタ情報反映**

- ☐ `addTask` 後に `updateTask` でメタ情報を設定
- ☐ タグは `addTagToTask` API を使用

**成果物**:

- 型定義の拡張
- メタ情報入力 UI コンポーネント（`TaskMetaEditor`）
- カンバン追加時のメタ情報反映ロジック
- ユニットテスト: メタ情報の保存・取得

---

### Phase 4: 一括設定とバリデーション（重要度: 中）

**目標**: 複数タスクに一括でメタ情報を設定し、不正な入力を防ぐ

- ☐ 選択したタスクに一括で期限・優先度・タグを設定
- ☐ 子・孫タスクの工数を自動集計して親に表示
- ☐ 期限のバリデーション（親より子の期限が遅い場合に警告）
- ☐ 見積もり工数のバリデーション（親の合計と子の合計の整合性チェック）
- ☐ 必須項目の入力チェック（タイトル空白禁止など）

**成果物**:

- 一括設定 UI
- バリデーションロジック（`src/lib/task-validation.ts`）
- エラーメッセージの表示
- ユニットテスト: バリデーション

---

### Phase 5: インライン編集（重要度: 中）

**目標**: タスク名や説明をその場で編集可能にする

- ☐ タスク名をダブルクリックで編集モードに
- ☐ Enter で保存、Esc でキャンセル
- ☐ 説明欄も同様に編集可能
- ☐ タスクの削除（確認ダイアログ付き）
- ☐ タスクの追加（同階層・サブタスク）
- ☐ 編集中の状態を即座に localStorage に反映

**成果物**:

- インライン編集機能
- 編集時の UI フィードバック（フォーカス、ハイライト）
- キーボードショートカット
- ユニットテスト: 編集・削除・追加

---

### Phase 6: UI/UX 改善（重要度: 低）

**目標**: 視覚的な改善とユーザビリティ向上

- ☐ 階層レベルごとの色分け（親: brand, 子: accent, 孫: グレー）
- ☐ サマリー表示（合計工数、最遅期限、完了率）
- ☐ 展開/折りたたみ状態の保存
- ☐ ドラッグ&ドロップでの並び替え（同階層内）
- ☐ タスクのプレビュー（カード形式）
- ☐ アクセシビリティ対応（ARIA ラベル、キーボード操作）

**成果物**:

- スタイリング改善
- サマリー計算ロジック
- D&D 機能（`@dnd-kit/core` 検討）
- A11y 対応

---

## 技術設計

### なぜ IndexedDB なのか？

| 特性               | localStorage       | IndexedDB              |
| ------------------ | ------------------ | ---------------------- |
| 容量制限           | ~5MB               | 数百 MB〜数 GB         |
| データ型           | 文字列のみ         | 構造化データ、Blob     |
| 同期/非同期        | 同期               | 非同期（Worker 可）    |
| インデックス・検索 | なし               | あり（高速）           |
| トランザクション   | なし               | あり                   |
| ブラウザサポート   | すべて             | すべてのモダンブラウザ |
| パフォーマンス     | 遅い（大量データ） | 高速                   |

**結論**: タスクデータ、添付ファイル、履歴を扱うには IndexedDB が最適

### IndexedDB スキーマ設計

#### データベース構造

```typescript
// データベース名とバージョン
const DB_NAME = "secretary-app";
const DB_VERSION = 1;

// Object Store（テーブルに相当）
interface SecretaryDB {
  // 既存のタスクデータ（LocalAdapter から）
  projects: Project;
  tasks: Task;
  columns: Column;
  tags: Tag;
  comments: Comment;
  checklist: ChecklistItem;

  // 新規: decomposer の下書き
  decomposerDrafts: DecomposerDraft;

  // 将来: 添付ファイル
  attachments?: Attachment;
}
```

#### インデックス設計

```typescript
// decomposerDrafts のインデックス
{
  keyPath: "id",
  indexes: [
    { name: "createdAt", keyPath: "createdAt" },
    { name: "updatedAt", keyPath: "updatedAt" },
    { name: "projectId", keyPath: "projectId" } // 将来のマルチプロジェクト対応
  ]
}

// tasks のインデックス
{
  keyPath: "id",
  indexes: [
    { name: "projectId", keyPath: "projectId" },
    { name: "columnId", keyPath: "columnId" },
    { name: "parentId", keyPath: "parentId" }, // 階層構造クエリ用
    { name: "dueDate", keyPath: "dueDate" }
  ]
}
```

#### 下書きデータ型

```typescript
type DecomposerDraft = {
  id: string; // UUID
  projectId: string; // プロジェクトID
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  originalInput: string; // 元の入力テキスト
  tasks: DecomposedTaskWithMeta[]; // 階層構造のタスク
  selected: string[]; // 選択されたタスクのパス
  targetColumnId: string; // 追加先の列
  defaultDue?: string; // デフォルト期限
  title?: string; // 下書きのタイトル（検索用）
};
```

### IndexedDB ラッパーライブラリ

**推奨**: [idb](https://github.com/jakearchibald/idb) (Jake Archibald 作)

- Promise ベースの API
- TypeScript サポート
- 軽量（~2KB gzipped）
- IndexedDB の生 API をシンプルにラップ

```bash
npm install idb
```

**代替案**:

- [Dexie.js](https://dexie.org/): より高機能だがバンドルサイズが大きい (~20KB)
- 生の IndexedDB API: 複雑で冗長

### データ初期化ポリシー（モック全削除）

- 初回起動時に既存のモックデータを全削除する。
  - localStorage キー `secretary.local.adapter.v1` を削除
  - IndexedDB を空のストアで初期化
- 最小シードデータのみ投入:
  - Project: 1 件（`Secretary`）
  - Board/Columns: `To Do`, `Doing`, `Done`
  - タスク: なし（全て新規作成ベース）
- 本方針により「」や「データマージ」は行わない

### API 拡張

#### LocalAdapter への追加メソッド（オプション）

現在の `DataAdapter` インターフェースには以下が既にある:

- `addTask(projectId, columnId, title)`: 新規タスク作成
- `updateTask(taskId, patch)`: タスク更新（`parentId` 含む）
- `addSubtask(parentTaskId, title)`: サブタスク追加

追加で必要なメソッド:

```typescript
interface DataAdapter {
  // ... 既存メソッド ...

  // 階層構造でタスクを一括追加
  addTaskHierarchy?(
    projectId: Id,
    columnId: Id,
    task: DecomposedTaskWithMeta
  ): Promise<Task>;
}
```

### ユーティリティ関数

#### `src/lib/task-hierarchy.ts`

```typescript
/**
 * 階層構造のタスクを再帰的にアダプタに追加
 */
export async function addTaskHierarchy(
  adapter: DataAdapter,
  projectId: Id,
  columnId: Id,
  task: DecomposedTaskWithMeta,
  parentId?: Id
): Promise<Task> {
  // 1. 親タスクを作成
  const created = await adapter.addTask(projectId, columnId, task.title);

  // 2. メタ情報を更新
  await adapter.updateTask(created.id, {
    description: task.description,
    estimatedHours: task.estimatedHours,
    dueDate: task.dueDate,
    parentId: parentId,
  });

  // 3. タグを追加
  if (task.tags) {
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
  if (task.children) {
    for (const child of task.children) {
      await addTaskHierarchy(adapter, projectId, columnId, child, created.id);
    }
  }

  return created;
}
```

#### `src/lib/db.ts` - IndexedDB 初期化

```typescript
import { openDB, DBSchema, IDBPDatabase } from "idb";

const DB_NAME = "secretary-app";
const DB_VERSION = 1;

interface SecretaryDB extends DBSchema {
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
  decomposerDrafts: {
    key: string;
    value: DecomposerDraft;
    indexes: {
      projectId: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  // 他のストアも追加...
}

let dbInstance: IDBPDatabase<SecretaryDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<SecretaryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<SecretaryDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // projects ストア
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }

      // tasks ストア
      if (!db.objectStoreNames.contains("tasks")) {
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("projectId", "projectId");
        taskStore.createIndex("columnId", "columnId");
        taskStore.createIndex("parentId", "parentId");
        taskStore.createIndex("dueDate", "dueDate");
      }

      // columns ストア
      if (!db.objectStoreNames.contains("columns")) {
        const columnStore = db.createObjectStore("columns", { keyPath: "id" });
        columnStore.createIndex("boardId", "boardId");
      }

      // decomposerDrafts ストア
      if (!db.objectStoreNames.contains("decomposerDrafts")) {
        const draftStore = db.createObjectStore("decomposerDrafts", {
          keyPath: "id",
        });
        draftStore.createIndex("projectId", "projectId");
        draftStore.createIndex("createdAt", "createdAt");
        draftStore.createIndex("updatedAt", "updatedAt");
      }
    },
  });

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
```

#### `src/lib/decomposer-storage.ts` - IndexedDB 版

```typescript
import { getDB } from "./db";
import type { DecomposerDraft } from "./decomposer";

/**
 * 下書きを保存（新規作成または更新）
 */
export async function saveDraft(
  draft: Omit<DecomposerDraft, "id" | "createdAt" | "updatedAt">
): Promise<DecomposerDraft> {
  const db = await getDB();
  const now = new Date().toISOString();

  const fullDraft: DecomposerDraft = {
    ...draft,
    id: draft.id || crypto.randomUUID(),
    createdAt: draft.createdAt || now,
    updatedAt: now,
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
```

#### `src/lib/task-validation.ts`

```typescript
export type ValidationError = {
  path: string;
  field: string;
  message: string;
};

/**
 * タスク階層のバリデーション
 */
export function validateTaskHierarchy(
  tasks: DecomposedTaskWithMeta[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  function validate(
    task: DecomposedTaskWithMeta,
    path: string,
    parentDue?: string
  ) {
    // タイトル必須チェック
    if (!task.title.trim()) {
      errors.push({
        path,
        field: "title",
        message: "タスク名は必須です",
      });
    }

    // 期限の整合性チェック（子は親より前に完了する必要がある）
    if (task.dueDate && parentDue) {
      if (task.dueDate > parentDue) {
        errors.push({
          path,
          field: "dueDate",
          message: "子タスクの期限は親タスクより前である必要があります",
        });
      }
    }

    // 見積もり工数の整合性チェック
    if (task.children && task.children.length > 0) {
      const childrenTotal = task.children.reduce(
        (sum, c) => sum + (c.estimatedHours || 0),
        0
      );
      if (task.estimatedHours && childrenTotal > task.estimatedHours) {
        errors.push({
          path,
          field: "estimatedHours",
          message: `子タスクの合計工数（${childrenTotal}h）が親の工数（${task.estimatedHours}h）を超えています`,
        });
      }
    }

    // 再帰的にチェック
    if (task.children) {
      task.children.forEach((child, idx) => {
        validate(child, `${path}.${idx}`, task.dueDate);
      });
    }
  }

  tasks.forEach((task, idx) => validate(task, `${idx}`));
  return errors;
}
```

---

## パフォーマンス最適化

- `React.memo` でコンポーネントのメモ化
- `useMemo` でサマリー計算をキャッシュ
- debounce で localStorage への自動保存頻度を制御（500ms）
- 大量タスク（50+）時は仮想スクロール検討（`react-window`）

---

## アクセシビリティ

- ARIA: `role="tree"`, `role="treeitem"`, `aria-label`, `aria-expanded`
- キーボード: Tab/Enter/Esc/矢印キー/Space
- スクリーンリーダー対応: 階層レベルとタスク名のアナウンス
- フォーカス管理: 編集時の自動フォーカス、編集完了後の復帰

---

## テスト戦略

### ユニットテスト

- ☐ `task-hierarchy.ts`: 階層追加ロジック
- ☐ `decomposer-storage.ts`: 下書き CRUD
- ☐ `task-validation.ts`: バリデーションロジック
- ☐ `LocalAdapter`: `parentId` を含むタスク保存・取得

### 統合テスト

- ☐ decomposer での分解 → 編集 → 保存 → カンバン追加の一連フロー
- ☐ ページリロード後の下書き復元
- ☐ 階層構造がカンバン・WBS で正しく表示されるか

### E2E テスト（将来）

- ☐ Playwright でユーザーフロー全体をテスト

---

## マイグレーション

本計画では、現状データがモックのためは行わない。IndexedDB を新規採用し、初期データは必要に応じてシードで投入する。

### 段階的な切り替え

#### Adapter の切り替え戦略

```typescript
// src/adapters/adapter-context.tsx

import { createIndexedDBAdapter } from "./indexeddb-adapter";

export function AdapterProvider({ children }: { children: React.ReactNode }) {
  const [adapter, setAdapter] = useState<DataAdapter | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const idbAdapter = createIndexedDBAdapter();
        setAdapter(idbAdapter);
        setReady(true);
      } catch (error) {
        console.error("Adapter initialization failed:", error);
        // エラー時は localStorage Adapter を使用
        const localAdapter = createLocalAdapter();
        setAdapter(localAdapter);
        setMigrationStatus("error");
      }
    }

    init();
  }, []);

  if (!adapter || !ready) {
    return <div>Loading...</div>;
  }

  return (
    <AdapterContext.Provider value={{ adapter }}>
      {children}
    </AdapterContext.Provider>
  );
}
```

### データバックアップとリストア

```typescript
// src/lib/backup.ts

/**
 * IndexedDB のデータをエクスポート（JSON）
 */
export async function exportData(): Promise<string> {
  const db = await getDB();
  const data: any = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: await db.getAll("projects"),
    tasks: await db.getAll("tasks"),
    columns: await db.getAll("columns"),
    decomposerDrafts: await db.getAll("decomposerDrafts"),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * JSONデータをインポート
 */
export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  const db = await getDB();

  const tx = db.transaction(
    ["projects", "tasks", "columns", "decomposerDrafts"],
    "readwrite"
  );

  // 既存データをクリア
  await tx.objectStore("projects").clear();
  await tx.objectStore("tasks").clear();
  await tx.objectStore("columns").clear();
  await tx.objectStore("decomposerDrafts").clear();

  // データをインポート
  for (const project of data.projects || []) {
    await tx.objectStore("projects").put(project);
  }
  for (const task of data.tasks || []) {
    await tx.objectStore("tasks").put(task);
  }
  // ...他のデータも同様に

  await tx.done;
}
```

### バージョニング

- データベースバージョン（`DB_VERSION`）で管理
- スキーマ変更時は `DB_VERSION` をインクリメント
- `upgrade` コールバックで旧バージョンからの処理を実装

---

## リスク & 対策

| リスク                             | 影響 | 確率 | 対策                                                      |
| ---------------------------------- | ---- | ---- | --------------------------------------------------------- |
| ~~localStorage 容量制限（5MB）~~   | -    | -    | **IndexedDB 採用により解決**（数 GB まで拡張可能）        |
| IndexedDB の容量超過               | 中   | 低   | 定期的なクリーンアップ、エクスポート機能の提供            |
| ブラウザの IndexedDB サポート      | 低   | 極低 | モダンブラウザはすべて対応、localStorage にフォールバック |
| データ破損（トランザクション失敗） | 高   | 低   | try-catch、トランザクション、定期バックアップ             |
| 親子関係の循環参照                 | 高   | 低   | バリデーションで検出、エラーを表示                        |
| 大量タスクでのパフォーマンス低下   | 中   | 低   | インデックスの最適化、仮想スクロール                      |
| 非同期 API による複雑性            | 中   | 中   | async/await の統一、エラーハンドリングの標準化            |
| プライベートブラウジング時の制限   | 中   | 低   | エラーメッセージの表示、localStorage フォールバック       |
| 複数タブでの同時編集               | 中   | 中   | Broadcast Channel API で同期、競合解決戦略                |

---

## Deliverables Checklist

### Phase 0: IndexedDB 基盤構築（新規）

- [ ] `idb` ライブラリのインストール
- [ ] `src/lib/db.ts` 実装（IndexedDB 初期化とスキーマ定義）
- [ ] - [ ] `src/adapters/indexeddb-adapter.ts` 実装
- [ ] `src/lib/backup.ts` 実装（エクスポート/インポート）
- [ ] - [ ]

### Phase 1: 階層構造の永続化

- [ ] `src/lib/task-hierarchy.ts` 実装
- [ ] `decomposer-root.tsx` の `addTasks` 関数拡張（IndexedDB 対応）
- [ ] IndexedDB の親子関係インデックスを活用
- [ ] ユニットテスト: 階層追加（IndexedDB）
- [ ] カンバン・WBS で親子関係の表示確認

### Phase 2: 一時保存

- [ ] `src/lib/decomposer-storage.ts` 実装（IndexedDB 版）
- [ ] 自動保存機能の追加（debounce 付き）
- [ ] 下書き一覧 UI（検索・フィルタ付き）
- [ ] 下書きの検索機能
- [ ] 古い下書きの自動削除機能
- [ ] ユニットテスト: 下書き CRUD（IndexedDB）

### Phase 3: メタ情報

- [ ] 型定義の拡張（`DecomposedTaskWithMeta`）
- [ ] メタ情報入力 UI（`TaskMetaEditor`）
- [ ] カンバン追加時の反映ロジック
- [ ] ユニットテスト: メタ情報の保存・取得

### Phase 4: 一括設定とバリデーション

- [ ] 一括設定 UI
- [ ] `src/lib/task-validation.ts` 実装
- [ ] エラー表示機能
- [ ] ユニットテスト: バリデーション

### Phase 5: インライン編集

- [ ] 編集・削除・追加機能
- [ ] キーボードショートカット
- [ ] ユニットテスト: 編集操作

### Phase 6: UI/UX 改善

- [ ] スタイリング改善
- [ ] サマリー表示
- [ ] D&D 機能（オプション）
- [ ] A11y 対応

### 統合テスト

- [ ] 分解 → 編集 → 保存 → カンバン追加の一連フロー
- [ ] ページリロード後の復元
- [ ] 階層構造の表示確認

### ドキュメント

- [x] PLAN2.md 作成
- [ ] API ドキュメント（新ユーティリティ関数）
- [ ] README.md に新機能の説明を追加

---

## 実装優先順位

### 最優先（MVP として必須）

1. **Phase 0: IndexedDB 基盤構築** - すべての機能の土台となるストレージ層
2. **Phase 1: 階層構造の永続化** - カンバンに親子関係を保ったまま追加できることが最重要
3. **Phase 2: 一時保存** - ユーザーの作業内容が失われないようにする

### 次点（UX 向上）

4. **Phase 3: メタ情報** - 実用的なタスク管理に必要
5. **Phase 5: インライン編集** - 使い勝手の向上

### 将来的に実装

6. **Phase 4: 一括設定とバリデーション** - あると便利だが必須ではない
7. **Phase 6: UI/UX 改善** - 磨き込み

---

## 開発スケジュール（目安）

| フェーズ | 見積もり | 累計 | 備考                           |
| -------- | -------- | ---- | ------------------------------ |
| Phase 0  | 8h       | 8h   | IndexedDB 基盤                 |
| Phase 1  | 4h       | 12h  | 階層構造の永続化               |
| Phase 2  | 6h       | 18h  | 下書き機能                     |
| Phase 3  | 8h       | 26h  | メタ情報                       |
| Phase 4  | 4h       | 30h  | 一括設定とバリデーション       |
| Phase 5  | 6h       | 36h  | インライン編集                 |
| Phase 6  | 8h       | 44h  | UI/UX 改善                     |
| テスト   | 10h      | 54h  | 単体・統合テスト               |
| 統合     | 4h       | 58h  | 全体統合、パフォーマンステスト |

合計: 約 58 時間（7〜8 営業日）

**注**: Phase 0 の IndexedDB 基盤構築が追加されたため、全体で約 10 時間増加

---

## Future Enhancements

### IndexedDB 関連

- **オフライン対応**: Service Worker と組み合わせた完全オフライン動作
- **添付ファイル保存**: Blob として IndexedDB に保存（画像、PDF など）
- **履歴管理**: タスクの変更履歴を IndexedDB に保存
- **フルテキスト検索**: 全タスクのタイトル・説明を横断検索
- **複数タブ同期**: Broadcast Channel API でリアルタイム同期
- **容量管理ダッシュボード**: IndexedDB 使用量の可視化、自動クリーンアップ

### 機能拡張

- 下書きのエクスポート/インポート（JSON ファイル）
- 下書きの共有（URL エンコード）
- テンプレート機能（よく使うタスク構造を保存）
- AI による工数自動見積もり
- 依存関係の設定（decomposer 内で）
- ガントチャートへの直接追加
- undo/redo 機能（変更履歴を IndexedDB に保存）

---

## 関連ドキュメント

- 元プラン: `PLAN.md`（タスク分解 UI/UX 改善）
- 実装: `src/features/decomposer/decomposer-root.tsx`
- 型定義: `src/lib/decomposer.ts`, `src/types/domain.ts`
- Adapter: `src/adapters/local-adapter.ts`, `src/adapters/data-adapter.ts`
- 設計: `docs/ui-spec.md`, `docs/info-architecture.md`
- 開発: `AGENTS.md`, `README.md`

---

## 変更履歴

| 日付       | 変更内容                                                             |
| ---------- | -------------------------------------------------------------------- |
| 2025-10-31 | 初版作成（ローカルデータ永続化プラン）                               |
| 2025-10-31 | localStorage から **IndexedDB** へ変更（容量制限の解決）             |
| 2025-10-31 | Phase 0（IndexedDB 基盤構築）を追加、方針を IndexedDB 単独採用に統一 |
| 2025-10-31 | データアーキテクチャを IndexedDB 中心に再設計完了                    |
