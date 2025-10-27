# JPYC Analytics (Web)

このフォルダは Vite + React のフロントエンドです。

## メタ/OG/Twitter
- タイトル/説明/OG/Twitter メタは `web/index.html` に定義しています。
- 既定の OG 画像は `web/public/ogimage2.png`（1200x675, PNG）を参照します。

### 時価総額入りの動的OG画像（SVG）生成
依存ゼロのスクリプトで SVG を生成できます。価格と供給量から時価総額を描画します。

実行例:
```
PRICE=1.02 SUPPLY=100000000 node ../scripts/generate-og.mjs
# または
node ../scripts/generate-og.mjs --price 1.02 --supply 100000000
```

出力: `web/public/og.svg`（既存ファイルを上書き）。本番は静的 `ogimage2.png` を利用中。

メモ:
- 画像はSNS側で強くキャッシュされることがあります。更新の即時反映が必要な場合はファイル名にバージョンを付与（例: `ogimage2-v2.png`）し、`index.html` の参照先を更新してください。

注記:
- X(Twitter) など一部プラットフォームは SVG の `og:image` を安定表示しない場合があります。最終的には同デザインの PNG を用意することを推奨します（サーバレス関数やスケジュールジョブで PNG 生成/更新）。
