# JPYC Analytics (Web)

このフォルダは Vite + React のフロントエンドです。

## 技術スタック / 指針
- フレームワーク: React 19 + Vite 7（TypeScript 5.9, ESM）
- 型/品質: TypeScript strict、ESLint（typescript-eslint, react-hooks, react-refresh）
- チャート: Recharts
- 計測: @vercel/analytics
- スタイル: 現状はプレーンCSS（`src/App.css`, `src/index.css`）。Tailwind 導入予定（下記）
- ルーティング: SPA 単一エントリ（Hero直下にタブUI）。将来的に `/services` を導入
- データ: DB 非採用。`public/data/*.json` を静的配信。
必要に応じて Headless UI / Radix UI を併用し、アクセシビリティを担保します。

### Services 一覧（計画）
- ライブラリ: TanStack Table を採用（ヘッドレス）。UIは Tailwind ベースで構築
- ルート: `/services`（初期リリースは詳細ページなし）
- データ: `public/data/services.json`（スキーマは `@spec/schemas/services.schema.json`）
- 機能: 検索、タグANDフィルター、ソート（name）、ページネーション（20/頁）
- クリック: 名前/アイコンセルで `url` を新規タブ（`rel="noopener noreferrer"`）

## メタ/OG/Twitter
- タイトル/説明/OG/Twitter メタは `web/index.html` に定義しています。
- 既定の OG 画像は `web/public/ogimage2.png`（1200x675, PNG）を参照します。


## セットアップ/開発
- 依存解決: `bun i`
- 開発サーバ: `bun run dev`
- ビルド: `bun run build`
- Lint/型チェック: `bun run lint && bun run typecheck`

### Subgraph プロキシ
- Vercel Edge Function (`api/subgraph.ts`) がサブグラフへの GraphQL リクエストを中継します。
- Edge Function では `GRAPH_API_BEARER`（Authorization 用）を参照し、クライアントは `/api/subgraph?chain=...&queryId=...` へ `GET` するだけで OK です（必要に応じて `variables` パラメータに JSON 文字列を追加）。クエリ文字列はサーバー側にハードコードされており、`queryId` で切り替えます。
- 現状はチェーンごとのサブグラフ URL をコードにハードコードしています。追加が必要な場合は `api/subgraph.ts` の `CHAINS` を更新してください。
- Vercel でのデプロイ時は `vercel.json` にて `bunVersion: "1.x"` を指定しています（Edge Function を Bun Runtime で実行）。

## コーディング規約（抜粋）
- TypeScript: strict、型エラーゼロを維持
- import順序: eslint-plugin-import 準拠（現状は typescript-eslint と hooks ルール中心）
- 秘密情報を埋め込まない（APIキー等は禁止）

## ディレクトリ
- `src/panels/*`: 既存 Analytics の UI パネル
- `src/components/*`: タブ等の共有UI
- `public/data/services.json`: Services 一覧のモックデータ
- `@spec/*`: スキーマ/モック/仕様（同リポジトリ直下）
