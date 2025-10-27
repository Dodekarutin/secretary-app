# Secretary

この README は、開発者および AI エージェントが本リポジトリを引き継いだ際に、要件・背景・設計を短時間で把握できることを目的とした最新版ドキュメントです（2025-10）。詳細仕様は `docs/` 配下を参照してください。

## 目的 / ビジョン

- 雑多な要求を素早くタスクへ分解し、チームの「タスクの可視化」「進捗共有」「期限管理」を支援する Web アプリ。
- Jooto のようなプロジェクト/タスク管理を目標に、カンバン・ガント・コメント・通知・添付・検索などを段階導入。

## 現状の主機能（MVP）

- ダッシュボード: 進捗バー、期限接近/期限超過の一覧
- カンバン: 列追加予定に先立ち、表示・カード D&D（列間/列内並び替え）、列ヘッダーの D&D/矢印キー並び替え、タスク詳細ドロワー
- ガント: 開始/期限の ±1 日調整、進捗スライダー、依存関係の追加/削除（ローカル）
- 設定: プロジェクト名/説明の編集保存、データソース切替（Local/HTTP のトグル UI。HTTP は FF で有効化）
- タスク分解: ローカル分割に加えて Gemini 呼び出し（既存 UI）。新 UI とは FF でトグル

実装の詳細は次のドキュメントを参照:

- 情報設計: `docs/info-architecture.md`
- UI 仕様: `docs/ui-spec.md`

## アーキテクチャ概要

- フロント: React 18 + Vite + TypeScript + Tailwind（テーマトークン: `brand`=紫, `accent`=水色/青）
- ルーティング: 依存ゼロのハッシュルーター（`src/lib/router.tsx`）
- データアクセス: Adapter パターン
  - LocalAdapter（`localStorage`）: 既定データソース
  - HttpAdapter（骨子）: `/api/v1` に接続予定
  - AdapterProvider（`src/adapters/adapter-context.tsx`）で全画面に注入
- フィーチャーフラグ
  - `VITE_FF_KANBAN`: 新 UI（ナビ/各ページ）を有効化
  - `VITE_FF_TASK_BACKEND`: HTTP アダプタ切替 UI を有効化（API 接続の段階導入）
- 状態管理: 各 Feature 内のローカル State + Adapter 再読込（グローバル Store 未導入）
- i18n: 最小`t(key)`ユーティリティ（`src/lib/i18n.ts`）
- アクセシビリティ: フォーカス可視化、キーボード代替（Kanban 列ヘッダーの左右移動など）

## データモデル（要約）

- Project, Board, Column, Task を中心に、ChecklistItem, Comment, Tag, TaskDependency, Attachment, Notification へ拡張可能。
- 並び順は `sortIndex` のギャップ方式（1000 刻み）。詳細は `docs/info-architecture.md`。

## API v1（計画）

- ベース: `/api/v1`、認証は JWT 想定。REST でプロジェクト/タスク/カンバン/コメント/タグ/依存/添付/検索/通知を提供。
- 仕様は `docs/info-architecture.md` を参照（DTO/権限/イベント設計含む）。

## セットアップ / 実行

1. 依存関係のインストール

```bash
npm install
```

2. 環境変数（オプショナル）

基本的な機能（カンバン、タスク一覧など）はデフォルトで有効です。
以下は必要に応じて `.env` ファイルで設定してください：

```env
# AI分解機能を使用する場合（Gemini API）
VITE_GEMINI_API_KEY=あなたのAPIキー

# 音声入力機能を使用する場合（OpenAI Whisper API）
VITE_OPENAI_API_KEY=あなたのOpenAI APIキー

# データソース切替UI（HTTPアダプタ）を有効化する場合
VITE_FF_TASK_BACKEND=true

# 基本機能を無効にする場合（通常は不要）
# VITE_FF_KANBAN=false
# VITE_FF_WBS=false
```

3. 開発サーバー

```bash
npm run dev
```

アクセス: `http://localhost:5173`

## 開発コマンド

- 開発サーバー起動: `npm run dev`
- 型チェック: `npm run type-check`
- Lint: `npm run lint`
- テスト: `npm test`
- ビルド: `npm run build`

注記: AGENTS.md では pnpm 推奨ですが、現状は `package-lock.json` が存在します。ローカル/CI とも npm を使用してください（pnpm への統一は将来の変更候補）。

## コードスタイル / 規約

- ダブルクォート、セミコロン無し、2 スペースインデント
- ファイル/ディレクトリは kebab-case
- 非同期処理は `async/await`

## テスト / TDD

- テストランナー: Vitest + RTL + jsdom
- 既存テスト: `tests/*.test.ts(x)`（adapter 挙動、Kanban 表示など）
- 変更時は関連テストを追加し、`npm test` でグリーン維持

## ディレクトリ

- `src/features/*`: ページ単位の機能（dashboard/kanban/gantt/settings）
- `src/components/*`: 再利用コンポーネント
- `src/adapters/*`: DataAdapter 群（local/http, provider）
- `src/lib/*`: ルーター、i18n、flags 等
- `docs/*`: 情報設計/UI 仕様
- `tests/*`: 単体テスト

## セキュリティ / 秘密情報

- `.env` は `.gitignore` 済み。API キーはサーバ側保護が望ましく、ブラウザ露出は避ける（HTTP アダプタ導入時にプロキシ化）

## トラブルシュート

- Vite の JSX パースエラー: JSX を含むファイル拡張子は `.tsx` を使用（例: `src/lib/router.tsx`）
- Node エンジン警告: `package.json` は Node `^18` を要求。Node 22 でも動作はするが、18 系 LTS を推奨

## ロードマップ（抜粋）

- Task ドロワーの A11y 強化（フォーカストラップ/ESC 閉じ）
- 添付の実装（presign→ アップロード → 登録）
- HTTP アダプタの実 API 接続（/api/v1）と FF での段階切替
- 依存の視覚化/循環検出、E2E テストの導入

AI を活用して雑多なタスクを瞬時に細分化し、モダンな UI で整理できるタスクマネージャーです。React と TypeScript をベースに、軽量で心地よい操作感を目指しています。

## 主な機能

- タスクの自然言語入力を AI で分解
- **🎤 音声入力対応**：OpenAI Whisper API を使った音声入力でタスク分解が可能
- テーマ切り替え（System / Light / Dark）
- 進捗率と完了済みタスク数のリアルタイム表示
- 完了状態に応じて視覚的に変化する TODO ボード

## 開発環境

- Node.js 18 系
- React 18
- Vite + TypeScript

## セットアップ

1. 依存関係をインストールします。
   ```bash
   npm install
   ```
2. （オプショナル）AI 分解機能や音声入力を使う場合は `.env` ファイルを作成して API キーを設定します。

   ```env
   # AI分解機能（Gemini API）
   VITE_GEMINI_API_KEY=あなたのAPIキー

   # 音声入力機能（OpenAI Whisper API）
   VITE_OPENAI_API_KEY=あなたのOpenAI APIキー
   ```

   - 基本機能（カンバン、タスク一覧など）は `.env` なしで動作します
   - `.env` は `.gitignore` に登録済みのため、リポジトリにはコミットされません
   - API キーは絶対に公開せず、安全な場所に保管してください

## 開発コマンド

- 開発サーバー起動: `npm run dev`
- 型チェック: `npm run type-check`
- Lint: `npm run lint`
- テスト: `npm test`
- ビルド: `npm run build`

## フィーチャーフラグ

以下の機能は**デフォルトで有効**です：

- ✅ カンバン UI（ダッシュボード、タスク一覧、ガントチャート、設定）
- ✅ WBS/タスク一覧（階層構造表示）

オプショナルな設定：

- **データソース切替（HTTP アダプタ）**

  - 設定画面に「データソース」の切替を表示するには `.env` に以下を追加：

  ```env
  VITE_FF_TASK_BACKEND=true
  ```

  - 注意: 現状は HTTP アダプタは骨子のみです。API サーバーを用意してから有効化してください。

- **基本機能の無効化**（通常は不要）
  ```env
  VITE_FF_KANBAN=false  # カンバンUIを無効化
  VITE_FF_WBS=false     # タスク一覧を無効化
  ```

## テスト駆動について

このプロジェクトは TDD を採用しています。新機能を追加する際は、テストを先に記述し、`npm test` で常にグリーンであることを確認してください。

## デプロイ

ステージングで動作確認後、本番へ段階デプロイ。CI/CD で `lint`/`test`/`build` を自動実行。API 導入時は後方互換・マイグレーション・ロールバック手順を徹底します。
