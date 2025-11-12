# Liquidity タブ仕様

## 1. 目的とゴール
- 各チェーン上の主要 AMM における JPYC の流動性状況を単一タブで可視化し、健全性を即時に把握できるようにする。
- Subgraph から抽出した「流動性量」「価格（Oracle / 主要 DEX）」「取引量」を同一 UI で比較し、異常や偏りを早期に検知する。
- `config.json` にチェーン単位で Liquidity Provider / 価格ソースを登録し、ゼロコードで監視対象を増減できるようにする。

## 2. 画面構成
1. **チェーン切替トグル**: 既存チェーン（Ethereum / Polygon / Avalanche ...）をタブで切替。初期値は `config.json` 内の `defaultChain`（未指定の場合は Ethereum）。
2. **グローバル KPI カード（4 枚）**
   - 総流動性 (USD 換算)
   - 24h 取引量
   - 参照価格（Oracle 優先）
   - DEX 価格乖離率（Oracle vs 選択済み DEX）
3. **Liquidity Provider テーブル**
   - 列: Provider 名、AMM / プール種別、流動性 (JPYC / USD)、24h 取引量、手数料 APR（任意）、最終更新時刻、価格ソース。
   - 行ごとにチェーンカラーアクセント。並び替え（流動性・取引量 DESC）、テキストフィルタ、チェーン絞り込み。
4. **価格ソースカード**
   - Oracle、Uniswap V3、QuickSwap 等の主要 DEX を `config.json` の順序で表示。各カードには価格、更新タイムスタンプ、流動性深度（取得できる場合）を記載。
5. **24h 取引量チャート**
   - 選択チェーンの Provider 単位で積み上げ棒グラフ。ツールチップで Provider 名、Volume、変化率を表示。
6. **アラート表示（任意）**
   - 参照価格と DEX 価格の乖離が閾値超過、または流動性が警告閾値を下回った場合にバッジ表示。

## 3. データ項目と算出ルール
| 指標 | 定義 / 算出ルール |
|------|-------------------|
| 流動性量 | 各 Provider の Subgraph から取得するプール内 JPYC 残高を `token.decimals` で正規化。USD 換算値は `displayPrice`（下記）を掛ける。合計値を KPI で表示。 |
| 参照価格 (`displayPrice`) | Chainlink Price Feeds HTTP API（例: `https://cl-marketplace-api.chain.link/price_feeds/ethereum/USD-JPY/history?interval=1h`）から取得。API 応答が無い場合はエラーとして扱い、価格カードに警告を表示。`config.json.chains[].liquidity.pricePreference` に従い、Oracle → 指定 DEX → Fallback（直近 1h 平均）で決定。Chainlink 値は `oraclePrice / 10^8` として USD 建てに換算し、JPYC=JPY を仮定して `displayPrice` に利用する。 |
| DEX 価格 | `config.json.priceFeeds.dex[]` に定義された JPYC/USDC プールから取得。主要 DEX は最大 3 件まで表示し、Oracle との乖離率 = `(dexPrice - oraclePrice) / oraclePrice`。 |
| 24h 取引量 | Provider ごとに Subgraph の `volumeUSD` (または `volumeToken`) から `now - 24h` で集計。USD ベースが無い場合は `volumeJPYC * displayPrice`。 |
| 手数料 APR | Subgraph の `feesUSD` or `apr` を利用。無い場合は `volumeUSD * feeTier / liquidityUSD * 365` の近似値。 |
| 最終更新 | Subgraph レスポンスに含まれる最新ブロックタイムスタンプ。 |

## 4. Oracle (Chainlink USD/JPY) 取得要件
- **データ**: Chainlink Price Feeds HTTP API（`https://cl-marketplace-api.chain.link/price_feeds/ethereum/USD-JPY/history`）を 1h/24h 解像度で呼び出し、`price`, `timestamp`, `confidenceInterval` を表示。API Key は `.env` 管理し、CDN キャッシュ 5 分。
- **API 障害時の挙動**: Chainlink API がタイムアウト / 4xx / 5xx を返した場合は即座にエラー表示に切り替え。
- **API/サブグラフ切替**: `config.json.priceFeeds.oracles[].history.type` に `api` / `subgraph` を指定し、手動でヒストリー取得元を切り替える。

## 5. サブグラフ要件
- Provider ごとに The Graph Subgraph もしくは互換 GraphQL エンドポイントを利用する。
- 必須フィールド: `pool(id)` → `totalValueLockedToken`, `totalValueLockedUSD`, `volumeUSD`, `feesUSD`, `lastUpdateTimestamp`。存在しない場合は `entities` 名を `config.json` で指定。
- クエリ例（Uniswap V3）:
  ```graphql
  {
    pool(id: "0x...") {
      totalValueLockedToken0
      totalValueLockedUSD
      volumeUSD
      feesUSD
      liquidity
      token0Price
      token1Price
      updatedAtTimestamp
    }
  }
  ```
- 取得間隔: 60 秒毎のポーリング（既存データフェッチと同じスケジューラを再利用）。レスポンスタイムアウト 10 秒。
- フェイルオーバー: 3 回リトライ後に Provider 行へ「取得失敗」表示。失敗時は直近キャッシュを最大 10 分間表示。

## 6. `config.json` 拡張
### 6.1 ルート構造
```jsonc
{
  "priceFeeds": {
    "oracles": [
      {
        "id": "chainlink_jpyc_usd",
        "chainId": "ethereum",
        "type": "chainlink",
        "feedAddress": "0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3",
        "decimals": 8,
        "history": {
          "type": "api",
          "url": "https://cl-marketplace-api.chain.link/price_feeds/ethereum/USD-JPY/history",
          "method": "GET",
          "query": { "interval": "1h", "lookbackHours": 168 },
          "responsePath": "data.points",
          "fields": {
            "value": "price",
            "timestamp": "timestamp",
            "confidence": "confidenceInterval"
          }
        }
      }
    ],
    "dex": [
      { "id": "uniswap_v3_jpyc_usdc", "chainId": "ethereum", "type": "uniswap_v3", "poolAddress": "0x...", "feeTier": 500 }
    ]
  },
  "chains": [
    {
      "id": "polygon",
      "...": "...",
      "liquidity": {
        "pricePreference": ["oracle:chainlink_jpyc_usd", "dex:uniswap_v3_jpyc_usdc", "dex:quick_v3_jpyc_usdc"],
        "providers": [
          {
            "id": "quick_v3_jpyc_usdc",
            "label": "QuickSwap V3 JPYC/USDC",
            "type": "amm",
            "subgraph": {
              "url": "https://api.thegraph.com/subgraphs/name/quickswap",
              "entity": "pool",
              "id": "0x...",
              "fields": {
                "liquidityToken": "totalValueLockedToken0",
                "liquidityUsd": "totalValueLockedUSD",
                "volumeUsd": "volumeUSD",
                "feeUsd": "feesUSD",
                "updatedAt": "updatedAtTimestamp"
              }
            },
            "token": { "symbol": "JPYC", "decimals": 18 },
            "volumeWindowHours": 24,
            "alertThreshold": { "minLiquidityUsd": 50000, "maxPriceDeviationBps": 300 }
          }
        ]
      }
    }
  ]
}
```
- `pricePreference` は文字列配列。`oracle:` / `dex:` プレフィックス付き ID で優先順位を管理。
- `providers[].subgraph.fields` により、Subgraph ごとの差異を吸収。
- Provider タイプは `amm`（デフォルト）/ `lending` 等、将来拡張の余地を残す。
- `priceFeeds.oracles[].history` は `type=api` を標準とし、`responsePath` でネストを特定、`fields` で値マッピングを行う。`type=subgraph` を指定した場合は別途クエリ定義を行い、運用で手動切替する（自動フェイルオーバーはしない）。

### 6.2 バリデーション
- `providers[].id` はチェーン内で一意。
- `subgraph.url` が空の場合はエラー扱い。
- `fields` に最低 1 つは流動性フィールドを指定（`liquidityToken` または `liquidityUsd`）。
- `volumeWindowHours` は 1〜168 の整数のみ許容。

## 7. 取引量チャート仕様
- デフォルト期間は 24h。クイック切替 7d / 30d。
- データは `providers[].subgraph` から `volumeSnapshots` (日次) を取得。存在しない場合は `poolDayDatas` / `poolHourDatas` を利用。
- 積み上げ棒グラフ (Recharts BarChart) + レジェンドで Provider の表示切替。
- Y 軸単位: USD (千/百万単位でフォーマット)。

## 8. エラー・ローディング UI
- サブグラフ API 失敗: パネルをエラー専用のものに表示。
- 価格ソース失敗: `displayPrice` は Fallback (最後に成功した価格) を使用し、KPI カードに警告アイコン。
- データ無し: 「未登録の Liquidity Provider です」メッセージと、`config.json` 追記のガイドリンクを docs へ表示。

## 9. 未決・TODO
1. 各 AMM の Subgraph URL。QuickSwap / Trader Joe / Uniswap V3 以外の優先度調整。
2. DEX 価格のサンプル取得ロジック（TWAP vs Spot）。
3. 取引量チャートの履歴保持期間（30 日以上必要か）。

上記仕様に基づき、実装前に `config.json` と Subgraph スキーマ差異を洗い出し、必要に応じてモックデータで UI を先行着手する。
