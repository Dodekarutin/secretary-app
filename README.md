# Secretary

このREADMEは、開発者およびAIエージェントが本リポジトリを引き継いだ際に、要件・背景・設計を短時間で把握できることを目的とした最新版ドキュメントです（2025-10）。詳細仕様は `docs/` 配下を参照してください。

## 目的 / ビジョン

- 雑多な要求を素早くタスクへ分解し、チームの「タスクの可視化」「進捗共有」「期限管理」を支援するWebアプリ。
- Jootoのようなプロジェクト/タスク管理を目標に、カンバン・ガント・コメント・通知・添付・検索などを段階導入。

## 現状の主機能（MVP）

- ダッシュボード: 進捗バー、期限接近/期限超過の一覧
- カンバン: 列追加予定に先立ち、表示・カードD&D（列間/列内並び替え）、列ヘッダーのD&D/矢印キー並び替え、タスク詳細ドロワー
- ガント: 開始/期限の±1日調整、進捗スライダー、依存関係の追加/削除（ローカル）
- 設定: プロジェクト名/説明の編集保存、データソース切替（Local/HTTPのトグルUI。HTTPはFFで有効化）
- タスク分解: ローカル分割に加えてGemini呼び出し（既存UI）。新UIとはFFでトグル

実装の詳細は次のドキュメントを参照:
- 情報設計: `docs/info-architecture.md`
- UI仕様: `docs/ui-spec.md`

## アーキテクチャ概要

- フロント: React 18 + Vite + TypeScript + Tailwind（テーマトークン: `brand`=紫, `accent`=水色/青）
- ルーティング: 依存ゼロのハッシュルーター（`src/lib/router.tsx`）
- データアクセス: Adapterパターン
  - LocalAdapter（`localStorage`）: 既定データソース
  - HttpAdapter（骨子）: `/api/v1` に接続予定
  - AdapterProvider（`src/adapters/adapter-context.tsx`）で全画面に注入
- フィーチャーフラグ
  - `VITE_FF_KANBAN`: 新UI（ナビ/各ページ）を有効化
  - `VITE_FF_TASK_BACKEND`: HTTPアダプタ切替UIを有効化（API接続の段階導入）
- 状態管理: 各Feature内のローカルState + Adapter再読込（グローバルStore未導入）
- i18n: 最小`t(key)`ユーティリティ（`src/lib/i18n.ts`）
- アクセシビリティ: フォーカス可視化、キーボード代替（Kanban列ヘッダーの左右移動など）

## データモデル（要約）

- Project, Board, Column, Task を中心に、ChecklistItem, Comment, Tag, TaskDependency, Attachment, Notification へ拡張可能。
- 並び順は `sortIndex` のギャップ方式（1000刻み）。詳細は `docs/info-architecture.md`。

## API v1（計画）

- ベース: `/api/v1`、認証はJWT想定。RESTでプロジェクト/タスク/カンバン/コメント/タグ/依存/添付/検索/通知を提供。
- 仕様は `docs/info-architecture.md` を参照（DTO/権限/イベント設計含む）。

## セットアップ / 実行

1) 依存関係のインストール
```bash
npm install
```

2) 環境変数（必要に応じて）
```env
# 新UI/ページ群
VITE_FF_KANBAN=true

# HTTPアダプタの切替UI（API接続を段階導入するとき）
VITE_FF_TASK_BACKEND=true

# 既存のAI分解で使用（旧UI）。新UIの動作には不要
VITE_GEMINI_API_KEY=あなたのAPIキー
```

3) 開発サーバー
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

注記: AGENTS.mdではpnpm推奨ですが、現状は `package-lock.json` が存在します。ローカル/CIとも npm を使用してください（pnpmへの統一は将来の変更候補）。

## コードスタイル / 規約

- ダブルクォート、セミコロン無し、2スペースインデント
- ファイル/ディレクトリは kebab-case
- 非同期処理は `async/await`

## テスト / TDD

- テストランナー: Vitest + RTL + jsdom
- 既存テスト: `tests/*.test.ts(x)`（adapter挙動、Kanban表示など）
- 変更時は関連テストを追加し、`npm test` でグリーン維持

## ディレクトリ

- `src/features/*`: ページ単位の機能（dashboard/kanban/gantt/settings）
- `src/components/*`: 再利用コンポーネント
- `src/adapters/*`: DataAdapter群（local/http, provider）
- `src/lib/*`: ルーター、i18n、flags 等
- `docs/*`: 情報設計/UI仕様
- `tests/*`: 単体テスト

## セキュリティ / 秘密情報

- `.env` は `.gitignore` 済み。APIキーはサーバ側保護が望ましく、ブラウザ露出は避ける（HTTPアダプタ導入時にプロキシ化）

## トラブルシュート

- ViteのJSXパースエラー: JSXを含むファイル拡張子は `.tsx` を使用（例: `src/lib/router.tsx`）
- Nodeエンジン警告: `package.json` は Node `^18` を要求。Node 22 でも動作はするが、18系LTSを推奨

## ロードマップ（抜粋）

- TaskドロワーのA11y強化（フォーカストラップ/ESC閉じ）
- 添付の実装（presign→アップロード→登録）
- HTTPアダプタの実API接続（/api/v1）とFFでの段階切替
- 依存の視覚化/循環検出、E2Eテストの導入

AI を活用して雑多なタスクを瞬時に細分化し、モダンな UI で整理できるタスクマネージャーです。React と TypeScript をベースに、軽量で心地よい操作感を目指しています。

## 主な機能

- タスクの自然言語入力を AI で分解
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
2. `.env` ファイルをプロジェクトルートに作成し、必要なフラグ/キーを設定します（上記「セットアップ / 実行」参照）。
   ```env
   VITE_GEMINI_API_KEY=あなたのAPIキー（旧UIでAI分解を使う場合のみ）
   ```
   - `.env` は `.gitignore` に登録済みのため、リポジトリにはコミットされません。
   - API キーは絶対に公開せず、安全な場所に保管してください。

## 開発コマンド

- 開発サーバー起動: `npm run dev`
- 型チェック: `npm run type-check`
- Lint: `npm run lint`
- テスト: `npm test`
- ビルド: `npm run build`

## フィーチャーフラグ（試験中UI）

- カンバンUIプレビューを有効化するには `.env` に以下を追加します。
  ```env
  VITE_FF_KANBAN=true
  ```
  有効化時はアプリ起動直後にカンバン画面が表示されます（ローカルアダプタによるダミーデータ）。

- データソース切替（HTTPアダプタの有効化）
  - 設定画面に「データソース」の切替を表示するには以下を追加します。
  ```env
  VITE_FF_TASK_BACKEND=true
  ```
  - 現状はHTTPアダプタは骨子のみです。APIサーバーを用意してから有効化してください。

## テスト駆動について

このプロジェクトは TDD を採用しています。新機能を追加する際は、テストを先に記述し、`npm test` で常にグリーンであることを確認してください。

## デプロイ

ステージングで動作確認後、本番へ段階デプロイ。CI/CD で `lint`/`test`/`build` を自動実行。API導入時は後方互換・マイグレーション・ロールバック手順を徹底します。
