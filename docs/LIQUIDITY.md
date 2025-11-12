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

## 9. Uniswap V4 サブグラフ連携（JPYC）
### 9.1 目的
- `external-subgraph/v4-subgraph` に追加した Uniswap v4 サブグラフを活用し、JPYC のマルチチェーン流動性を公式インデックスから直接取得する。
- Ethereum / Polygon / Avalanche の 3 チェーンについて、JPYC を含む v4 プールを自動検出して流動性・価格・取引量を日次/時間軸で可視化する。

### 9.2 デプロイ & エンドポイント
| Chain | Graph `network` | PoolManager | Subgraph Name (予定) | Subgraph ID (env key) | Gateway Endpoint 例 |
|-------|-----------------|-------------|----------------------|-----------------------|---------------------|
| Ethereum | `mainnet` | `0x000000000004444c5dc75cB358380D2e3dE08A90` | `jpyc-uniswap-v4-ethereum` | `DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G` | `https://gateway.thegraph.com/api/[API_KEY]/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G` |
| Polygon | `matic` | `0x67366782805870060151383F4BbFF9daB53e5cD6` | `jpyc-uniswap-v4-polygon` | `9yedwRwgQukqbE9KoddUBkLtzNr6tdefQUWT9cDQuKqJ` | `https://gateway.thegraph.com/api/[API_KEY]/subgraphs/id/9yedwRwgQukqbE9KoddUBkLtzNr6tdefQUWT9cDQuKqJ` |
| Avalanche | `avalanche` | `0x06380C0e0912312B5150364B9DC4542BA0DbBc85` | `jpyc-uniswap-v4-avalanche` | `49JxRo9FGxWpSf5Y5GKQPj5NUpX2HhpoZHpGzNEWQZjq` | `https://gateway.thegraph.com/api/[API_KEY]/subgraphs/id/49JxRo9FGxWpSf5Y5GKQPj5NUpX2HhpoZHpGzNEWQZjq` |

- `graph deploy --node https://subgraphs.alchemy.com/api/subgraphs/deploy --ipfs https://ipfs.satsuma.xyz <Subgraph Name> --version-label liquidity-v4-jpyc` で各チェーンへ公開。デプロイ後に得られる `deploymentId` を上記 env に格納し、`info/web/src/config.json.chains[].liquidity.providers[].subgraph.url` へ反映する。
- 本番アクセスは Edge Function `/api/subgraph` を経由（`GRAPH_API_BEARER` を Authorization に使用）。TTL は既存設定 (`SUBGRAPH_CACHE_TTL`) を踏襲。

### 9.3 対象エンティティと ID
- `Token`: JPYC の ID は全チェーン共通で **小文字アドレス** `0xe7c3d8c9a439fede00d2600032d5db0be71c3c29`。`token.decimals`=18。
- `Pool`: `id` がプールアドレス。JPYC が `token0` or `token1` のものを対象とする。
- `PoolDayData` / `PoolHourData`: 各プールの日次・時間足スナップショット。履歴チャート／24h 集計に利用。
- `TokenDayData` / `TokenHourData`: チェーン内の JPYC 全体の流動性・価格・ボリュームを取得。

### 9.4 GraphQL クエリ仕様
1. **プール一覧（現在値）**
    ```graphql
    query JPYCActivePools($token: String!, $minUsd: BigDecimal!, $skip: Int!) {
      token0Pools: pools(
        first: 50
        skip: $skip
        orderBy: totalValueLockedUSD
        orderDirection: desc
        where: { token0: $token, totalValueLockedUSD_gte: $minUsd }
      ) {
        id
        feeTier
        liquidity
        token0 { id symbol decimals }
        token1 { id symbol decimals }
        token0Price
        token1Price
        totalValueLockedUSD
        totalValueLockedToken0
        totalValueLockedToken1
        volumeUSD
        feesUSD
        poolDayData(first: 1, orderBy: date, orderDirection: desc) {
          date
          tvlUSD
          volumeUSD
          feesUSD
        }
      }
      token1Pools: pools(
        first: 50
        skip: $skip
        orderBy: totalValueLockedUSD
        orderDirection: desc
        where: { token1: $token, totalValueLockedUSD_gte: $minUsd }
      ) {
        id
        feeTier
        liquidity
        token0 { id symbol decimals }
        token1 { id symbol decimals }
        token0Price
        token1Price
        totalValueLockedUSD
        totalValueLockedToken0
        totalValueLockedToken1
        volumeUSD
        feesUSD
        poolDayData(first: 1, orderBy: date, orderDirection: desc) {
          date
          tvlUSD
          volumeUSD
          feesUSD
        }
      }
    }
    ```
    - GraphQL では `OR` 条件が使えないため、`token0`/`token1` で 2 クエリに分けて結果を結合・重複排除する。
    - `$minUsd` は 1,000 USD などのしきい値でノイズプールを除外。

2. **トークン全体の集計 & 日次ヒストリー**
    ```graphql
    query JPYCGlobalHistory($token: String!, $days: Int!) {
      token(id: $token) {
        id
        totalValueLockedUSD
        volumeUSD
        feesUSD
        derivedETH
      }
      tokenDayDatas(
        first: $days
        orderBy: date
        orderDirection: desc
        where: { token: $token }
      ) {
        date
        totalValueLockedUSD
        volumeUSD
        priceUSD
        feesUSD
      }
    }
    ```
    - `priceUSD` を Liquidity タブの DEX 価格カードに利用。Chainlink が落ちた際のフェイルオーバー経路としても使用。
    - `$days`=30（KPI）/90（チャート）で切替。

3. **プール別ヒストリカル（チャート / 24h 集計）**
    ```graphql
    query PoolHistory($poolId: ID!, $from: Int!) {
      pool(id: $poolId) {
        id
        token0 { id symbol }
        token1 { id symbol }
        totalValueLockedUSD
        poolHourData(
          first: 168
          orderBy: periodStartUnix
          orderDirection: desc
          where: { periodStartUnix_gte: $from }
        ) {
          periodStartUnix
          tvlUSD
          volumeUSD
          feesUSD
          token0Price
          token1Price
        }
        poolDayData(
          first: 30
          orderBy: date
          orderDirection: desc
        ) {
          date
          tvlUSD
          volumeUSD
          feesUSD
          token0Price
          token1Price
        }
      }
    }
    ```
    - `$from = now - 24h` で直近 24 時間分を取得し、`volumeUSD` の合計で「24h 取引量」を算出。
    - `poolDayData` は日次チャート／ツールチップに使用。UI 側で `date * 1000` を JS `Date` に変換。

### 9.5 KPI へのマッピング
- **リアルタイム流動性**: 上記プールクエリの `totalValueLockedUSD` を合計。JPYC 建て表示は `token0/1` のどちらで JPYC が出現したかで `totalValueLockedTokenX` を採用し、18 桁で正規化。
- **参照価格 (DEX)**: `tokenDayDatas[0].priceUSD` を第 2 優先順位として使用。プール個別では `token0Price` もしくは `1 / token1Price` で JPYC→USD レートを算出（JPYC が token1 の場合は逆数を取る）。
- **24h 取引量**: `poolHourData` の `volumeUSD` を 24 本分合計。複数プールを合算してチェーン単位 KPI にも利用。
- **手数料 APR 補完**: `poolHourData.volumeUSD * feeTier / 1e6` を日次手数料に変換し、`tvlUSD` で割って年率換算。

### 9.6 実装ノート
- `info/web/src/config.json.chains[].liquidity.providers` に `type: "uniswap_v4"` の新規 Provider を 3 チェーン分追加し、`subgraph.fields` へ上記フィールドマッピングを設定する。
- Edge Function `/api/subgraph` に `queryId: "UNIV4_POOLS" | "UNIV4_TOKEN_HISTORY" | "UNIV4_POOL_HISTORY"` を追加し、`variables` にチェーン ID と `jpycTokenId` を渡す。
- キャッシュ: プール一覧は 60 秒、ヒストリカルは 10 分キャッシュ。JPYC の新規プールを最大全て拾うため、一括取得→アプリ側でトップ N を選ぶ。
- エラー処理: `_meta { block { number timestamp } }` を各レスポンスに追加してブロック遅延を UI に表示。5 分以上遅延した場合は Provider 行を `stale` 表示。

## 10. 未決・TODO
1. QuickSwap / Trader Joe など他 AMM の Subgraph 優先順位と同様の仕様化。
2. DEX 価格のサンプル取得ロジック（TWAP vs Spot）。
3. 取引量チャートの履歴保持期間（30 日以上必要か）。

上記仕様に基づき、実装前に `config.json` と Subgraph スキーマ差異を洗い出し、必要に応じてモックデータで UI を先行着手する。
