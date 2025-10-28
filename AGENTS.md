# AGENTS.md（エージェント向けガイド・最新版）

この文書は、どの AI/開発者が読んでも作業方針と前提を素早く共有できることを目的とします。詳細は `README.md` および `docs/` を参照してください。

## スコープ / ディレクトリ

- `/src/features/*`: 画面単位の機能（dashboard/kanban/gantt/settings）。新規ページはここに作成
- `/src/components/*`: 再利用コンポーネント
- `/src/adapters/*`: DataAdapter（`local`/`http`）と `AdapterProvider`
- `/src/lib/*`: ルーター（`router.tsx`）、i18n、flags 等
- `/docs/*`: 情報設計（ER/API/イベント）と UI 仕様
- `/tests/*`: 単体テスト（Vitest）

## 技術スタック / 実行

- Node.js 18（推奨）。`package.json` は `"engines": { "node": "^18" }`
- React 18 + Vite + TypeScript + Tailwind
- 依存のインストール: `npm install`（現状は npm を使用。pnpm 統一は将来検討）
- 開発サーバー: `npm run dev`

## フィーチャーフラグ（段階導入）

- `VITE_FF_KANBAN`: 新 UI（ダッシュボード/カンバン/ガント/設定）— **デフォルトで有効**
- `VITE_FF_WBS`: タスク一覧（階層構造表示）— **デフォルトで有効**
- `VITE_FF_TASK_BACKEND`: データソース切替（Local/HTTP）UI を表示 — デフォルトで無効。HTTP は API 接続準備後に使用

注: デフォルトで有効な機能を無効にするには、`.env` で `VITE_FF_KANBAN=false` のように明示的に設定

## Adapter パターン（重要）

- すべてのデータアクセスは `DataAdapter` 経由に統一
- 既定は `LocalAdapter`（`localStorage` seed）。`HttpAdapter` は `/api/v1` に接続する骨子
- 画面側は `useAdapter()`（`AdapterProvider`）から取得して使用
- 既存機能との互換を最優先。破壊的変更は FF またはアダプタで吸収

## コードスタイル / 規約

- ダブルクォート、セミコロン無し、2 スペースインデント
- ファイル・ディレクトリは kebab-case
- 非同期は `async/await` を使用
- JSX を含むファイルは `.tsx` 拡張子を使用

## TDD / テスト

- 変更時は関連ユニットテストを追加（`tests/`）。まず狭い単位（関数/アダプタ）→ UI の表示テスト
- 実行: `npm test`。必要に応じて `--coverage`

## UI / UX 原則

- テーマトークン: `brand`（紫）, `accent`（水色/青）を Tailwind の extend に定義済
- アクセシビリティ: フォーカス可視化、キーボード代替操作（Kanban 列の左右移動など）を必ず用意
- i18n: 文言は `t("...")` キー経由で出力。キー追加時は `src/lib/i18n.ts` を更新

## 変更方針

- 後方互換を維持。必要なら FF/互換層/マイグレーションで段階導入
- 小さな PR に分割（1PR=1 責務）。`lint` と `test` が通ること
- 既存の命名・型・API 契約の整合を最優先
- ドキュメント（`docs/`、README/AGENTS）を随時更新

## セキュリティ

- `.env` に秘密情報を含めない（`.gitignore` 済）。外部キーは安全に保管
- 将来の HTTP 接続では、サーバ側で認証/入力検証/レート制限/監査ログを実施

## よくある落とし穴 / Tips

- JSX エラー: JSX を含むユーティリティ（例: ルーター）は `.tsx` にする
- Node エンジン警告: Node 18 系を推奨（それ以外は警告が出る場合あり）
- 並び替え: `sortIndex` は 1000 刻みのギャップ方式で再採番

## 参考

- 情報設計: `docs/info-architecture.md`
- UI 仕様: `docs/ui-spec.md`
- 主要エントリ: `src/app-routed.tsx`, `src/components/layout/app-shell.tsx`
