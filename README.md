# Secretary

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
2. `.env` ファイルをプロジェクトルートに作成し、Google Gemini API キーを設定します。
   ```env
   VITE_GEMINI_API_KEY=あなたのAPIキー
   ```
   - `.env` は `.gitignore` に登録済みのため、リポジトリにはコミットされません。
   - API キーは絶対に公開せず、安全な場所に保管してください。

## 開発コマンド

- 開発サーバー起動: `npm run dev`
- 型チェック: `npm run type-check`
- Lint: `npm run lint`
- テスト: `npm test`
- ビルド: `npm run build`

## テスト駆動について

このプロジェクトは TDD を採用しています。新機能を追加する際は、テストを先に記述し、`npm test` で常にグリーンであることを確認してください。

## デプロイ

ステージング環境での動作確認後、本番環境へデプロイします。CI/CD パイプラインで lint / test / build が自動実行される想定です。
