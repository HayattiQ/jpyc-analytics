# Pool List API（Beta）仕様

## 1. 目的とゴール
- GeckoTerminal API をデータソースに、チェーン横断で主要プール情報（流動性・出来高・価格指標）をまとめて取得する `pool_list` エンドポイントを提供する。
- JPYC のエコシステム監視に必要なビュー（トッププール、新規プール、トレンドプール、アドレス指定プール）を統一したレスポンスに正規化する。
- Beta リリース中の API であるため、ヘッダでバージョンを固定しつつ変更容易な実装（feature flag / config 駆動）を行う。

## 2. GeckoTerminal API 利用方針
- **Base URL**: `https://api.geckoterminal.com/api/v2`
- **バージョン固定**: `Accept: application/json;version=20230203`（未指定の場合は最新バージョンになり互換性が崩れる可能性があるため必須）
- **レートリミット**: 30 req/min（free tier）。`pool_list` 内ではチェーン別にリクエストをまとめ、同一クエリの重複を 60 秒キャッシュで抑制する。
- **データ鮮度**: GeckoTerminal 側で 1 分キャッシュ。`pool_list` は 55 秒 TTL のアプリケーションキャッシュを設け、フェッチタイミングをずらして突発的なバーストを避ける。
- **障害時の扱い**: GeckoTerminal から 4xx/5xx が返却された場合は `source_error` をレスポンスに添付し、フォールバック（最後に成功したスナップショット）を返す。

### 2.1 使用するエンドポイント
|用途|HTTP|Path|メモ|
|----|----|----|----|
|トッププール|GET|`/networks/{network}/pools`|`sort=volume` `page` `per_page` で制御|
|DEX 別トップ|GET|`/networks/{network}/dexes/{dex}/pools`|`dex_id` が指定された場合のみ|
|トレンド|GET|`/networks/{network}/trending_pools`|`filter=trending` に対応|
|新規プール|GET|`/networks/{network}/new_pools`|`filter=new` に対応|
|アドレス指定|GET|`/networks/{network}/pools/multi/{addresses}`|CSV 形式で最大 50 件|
|メタデータ|GET|`/networks/{network}/dexes` ` /networks`|内部キャッシュを 24h 更新で保持し、ID→名称マッピングに利用|

## 3. `GET /api/pool_list` インターフェース
### 3.1 リクエストパラメータ
|パラメータ|必須|型|説明|
|----------|----|--|----|
|`network`|△|string|GeckoTerminal の network slug（例: `ethereum`, `polygon-pos`）。未指定時は `config.poolList.defaultNetwork`。複数指定は `network=eth,polygon-pos` 形式。|
|`filter`|×|enum|`top`（デフォルト） / `trending` / `new` / `dex` / `addresses`。|
|`dex_id`|×|string|filter=`dex` のとき必須。GeckoTerminal dex slug。|
|`addresses`|×|string|filter=`addresses` のとき必須。`0x...` をカンマ区切り（最大 50）。|
|`page`|×|number|1 以上。`top`/`dex` 用。|
|`per_page`|×|number|1-100。デフォルト 25。|
|`quote_currency`|×|enum|`usd`（既定） / `native`。内部では GeckoTerminal の USD 値を利用し、`native` の場合は `token_prices` を再計算。|

### 3.2 レスポンスフォーマット
```jsonc
{
  "meta": {
    "filter": "top",
    "networks": ["polygon-pos"],
    "source": "geckoterminal",
    "fetched_at": "2024-05-18T12:34:56Z",
    "cache_ttl_sec": 55,
    "source_error": null
  },
  "data": [
    {
      "network": "polygon-pos",
      "dex_id": "quickswap",
      "dex_name": "QuickSwap",
      "pool_address": "0xabc...",
      "pool_name": "JPYC/USDC",
      "base_token": {
        "address": "0x6ae7...jpyc",
        "symbol": "JPYC",
        "decimals": 18,
        "price_usd": 0.0064
      },
      "quote_token": {
        "address": "0x2791...usdc",
        "symbol": "USDC",
        "decimals": 6,
        "price_usd": 1.0
      },
      "price_ratio": 0.0064,
      "liquidity_usd": 1200000,
      "volume_24h_usd": 540000,
      "fees_24h_usd": 1080,
      "txns_24h": 230,
      "fdv_usd": 6400000,
      "last_trade_at": "2024-05-18T12:30:00Z",
      "source_payload": { "...": "GeckoTerminal raw response (optional, feature flag)" }
    }
  ]
}
```
- `source_payload` はデバッグ用途。Feature flag (`config.poolList.debugPayload`) が `true` のときのみ含める。
- `fdv_usd` は GeckoTerminal `fully_diluted_valuation_usd` が存在しない場合、`base_token.price_usd * base_token.supply` が取得できるケースに限定して表示する。

### 3.3 ステータスコード
|コード|条件|レスポンス例|
|-----|----|-----------|
|200|正常|上記フォーマット|
|400|バリデーション失敗|`{"error":"invalid_filter","message":"filter dex requires dex_id"}`|
|429|内部レート制限|`{"error":"rate_limited","retry_after":5}`|
|502|GeckoTerminal 障害|`{"error":"upstream_error","message":"geckoterminal timeout","source_status":504}`|

## 4. データ変換・ビジネスルール
- **ネットワーク & DEX メタ情報**: 起動時に `/networks` `/networks/{network}/dexes` を同期し、`networkAliases` `dexAliases` 設定で内部 ID にマッピング。
- **価格指標**: GeckoTerminal の `attributes.token_prices.usd` を優先。`quote_currency=native` の場合は `token_prices.native_token` を使用し、ハンドリングできない場合は USD をチェーンの最新 `native/usd` 為替（`config.prices.nativeUsd`）で割り戻す。
- **ボリューム & 手数料**: `volume_usd.h24`, `fees_usd.h24` を採用。存在しない場合は `volume_usd.h1 * 24` の近似値で補完し、`meta.source_error` に `volume_h24_missing` を追加。
- **並び順**: `top`/`dex` は `volume_24h_usd` DESC、`trending` は GeckoTerminal 提供順、`new` は `pool.created_at` DESC。
- **キャッシング**: `Cache-Control` 相当のミドル層は無し。Redis などのアプリ側キャッシュキー: `pool_list:{network}:{filter}:{hash(params)}`。
- **ロギング**: GeckoTerminal 呼び出しごとに `network`, `filter`, `status`, `latency_ms`, `remaining_quota` を構造化ログへ送信。

## 5. バリデーション・エラーハンドリング
- `network` がサポート対象外の場合は 400 (`unsupported_network`)。
- `addresses` は 0x プレフィックス、40 hex を強制。ユニーク化し 50 件を超えたら 400 (`too_many_addresses`)。
- GeckoTerminal から 404 が返った場合は、該当プールのみ `not_found` としてスキップし `meta.source_error` に `addresses_not_found` を積む。
- タイムアウトは 8 秒。1 回リトライ（指数バックオフ 200ms）。失敗時にフォールバックキャッシュ（最大 10 分）を返す。

## 6. 設定値
```ts
type PoolListConfig = {
  defaultNetwork: string;
  debugPayload: boolean;
  cacheTtlSec: number; // 55 (<= GeckoTerminal 60s キャッシュ)
  rateLimit: {
    windowSec: number; // 60
    maxCalls: number;  // 25 (余裕を持って GeckoTerminal 30 以下)
  };
  networkAliases: Record<string, string>;
  dexAliases: Record<string, string>;
  nativeUsd: Record<string, number>; // native トークンから USD 換算する際に使用
};
```

## 7. テスト要件
- `filter` ごとの E2E モックテスト（VCR キャプチャ or `msw`）。Accept ヘッダと Query の組み合わせを全カバレッジ。
- ネットワーク別キャッシュキーの衝突がないことを検証するユニットテスト。
- 429/5xx フォールバックの統合テスト（GeckoTerminal モックで強制）。
- Schema バリデーション（zod）でレスポンスを検証し、壊れたフィールドがあれば `source_error` に収集すること。

## 8. 今後の拡張（Beta 想定）
- `include=ohlcv` クエリで `/networks/{network}/pools/{pool}/ohlcv/day` をまとめて取得し、チャート描画向けに返却する。
- プール内の `token0`/`token1` 以外のメタデータ（LP fee tier、pool type）を `attributes.pool_type` が公開され次第レスポンスへ追加。
- CoinGecko 有料プラン移行時にはレートリミット設定を `rateLimit.maxCalls=55` に切り替え可能にする。
