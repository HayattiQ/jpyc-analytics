# Service 一覧 仕様（ドラフト）

## 目的
JPYC を採用しているサービスを表形式で一覧表示し、検索/フィルター/ソートを提供する。
ルートは `/services`。

## データソース
- JSON ファイルで管理（DB 非採用）。
- スキーマ: `@spec/schemas/services.schema.json`
- モック: `@spec/mocks/services.mock.json`

## 列定義（必須）
- 名前: `name`（並び替え可能、検索対象）
- アイコン: `iconUrl`（16–32px 推奨、代替テキスト必須）
- タグ: `tags[]`（フィルター対象。複数選択 AND/OR は要件下記）
- 説明: `description`（全文検索対象、行高は2–3行でクリップ）
- （任意）公式URL: `url`（外部リンク。新規タブ、`rel="noopener"`）

## 機能要件
- 検索: グローバル検索ボックス（`name`/`description`/`tags` を対象）
- フィルター: タグのチップ/チェックボックス。モード切替（AND/OR）を UI で許容
- ソート: `name` 昇降順。将来は任意列に拡張
- ページネーション: 20 件/ページをデフォルト（可変）
- 列制御: 列の表示/非表示切替
- レスポンシブ: モバイルではカード型レイアウトへフォールバック可
 - クリック遷移: `name` および `icon` セルをクリックで `url` に外部遷移（新規タブ、`rel="noopener noreferrer"`）。`url` が無い場合は非活性/ツールチップ表示。

## 非機能/UX
- パフォーマンス: 数千件まで快適。必要に応じて仮想リスト
- アクセシビリティ: セマンティックな表、キーボード操作、フォーカス管理。リンクには適切な `aria-label` を付与。

## ライブラリ（候補）
- TanStack Table: 軽量・拡張性高。UI 実装が必要
- MUI Data Grid: 機能豊富・導入容易。MUI 依存
- AG Grid Community: 高機能・やや重量

採用: TanStack Table を使用する。

## JSON スキーマ
- 別ファイル: `@spec/schemas/services.schema.json`

## 受け入れ基準
- 表示: 上記 4 列（+ URL 任意）が表示される
- 検索/フィルター/ソート/ページネーションが動作
- `name`/`icon` セルのクリックで `url` が新規タブで開く（`rel="noopener noreferrer"`）。
- `url` が無い行ではクリック不可であることが視覚/操作上で判別できる。
- モック JSON を読み込んで一覧生成
