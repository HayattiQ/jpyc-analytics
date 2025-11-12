/**
 * JPYCActivePools クエリを叩いて、JPYC を含む Uniswap v4 プールの
 * TVL / 直近 24h ボリュームなどを一覧表示する簡易スクリプト。
 *
 * 使い方:
 *   GRAPH_API_BEARER=xxx UNI_V4_ETH_SUBGRAPH_URL=https://gateway... \
 *   npx tsx info/subgraph/tests/fetchJPYCActivePools.ts ethereum
 *
 * 引数:
 *   1. chain (省略時 ethereum) ... ethereum / polygon / avalanche など
 *
 * 必要な環境変数:
 *   - GRAPH_API_BEARER            : (任意) The Graph Gateway 用 Bearer トークン
 *   - UNI_V4_<CHAIN>_SUBGRAPH_URL : チェーン別エンドポイント (例: UNI_V4_ETHEREUM_SUBGRAPH_URL)
 *     もしくは UNI_V4_SUBGRAPH_URL で一括指定
 *   - JPYC_MIN_TVL_USD            : (任意) 取得対象とする最低 TVL (USD) / 既定 1000
 *   - JPYC_TOKEN_ADDRESS          : (任意) JPYC トークンアドレス / 既定 0xE7C3...
 */

type Token = {
  id: string
  symbol: string
  decimals: string
}

type PoolSnapshot = {
  date: number
  tvlUSD: string
  volumeUSD: string
  feesUSD: string
}

type Pool = {
  id: string
  feeTier: string
  liquidity: string
  token0: Token
  token1: Token
  token0Price: string
  token1Price: string
  totalValueLockedUSD: string
  totalValueLockedToken0: string
  totalValueLockedToken1: string
  volumeUSD: string
  feesUSD: string
  poolDayData: PoolSnapshot[]
}

type QueryResponse = {
  data?: {
    token0Pools?: Pool[]
    token1Pools?: Pool[]
  }
  errors?: { message?: string }[]
}

const JPYC_TOKEN_ADDRESS = (process.env.JPYC_TOKEN_ADDRESS ?? '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29').toLowerCase()
const MIN_TVL_USD = Number(process.env.JPYC_MIN_TVL_USD ?? '1000')
const DEFAULT_CHAIN = 'ethereum'
const chainArg = process.argv[2]?.toLowerCase() ?? DEFAULT_CHAIN
const GRAPH_API_BEARER = process.env.GRAPH_API_BEARER

const ENV_KEY = `UNI_V4_${chainArg.toUpperCase()}_SUBGRAPH_URL`
const SUBGRAPH_URL = process.env[ENV_KEY] ?? process.env.UNI_V4_SUBGRAPH_URL

if (!SUBGRAPH_URL) {
  console.error(`${ENV_KEY} または UNI_V4_SUBGRAPH_URL を設定してください。`)
  process.exit(1)
}

const headers: Record<string, string> = {
  'Content-Type': 'application/json'
}
if (GRAPH_API_BEARER) {
  headers.Authorization = `Bearer ${GRAPH_API_BEARER}`
}

const query = /* GraphQL */ `
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
`

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
})

const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2
})

const formatUsd = (value: string | undefined) => {
  if (!value) return '-'
  const num = Number(value)
  return Number.isFinite(num) ? usdFormatter.format(num) : value
}

const formatAmount = (value: string | undefined) => {
  if (!value) return '-'
  const num = Number(value)
  return Number.isFinite(num) ? amountFormatter.format(num) : value
}

const fetchPoolsPage = async (skip: number) => {
  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables: {
        token: JPYC_TOKEN_ADDRESS,
        minUsd: MIN_TVL_USD.toString(),
        skip
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Subgraph request failed (${response.status} ${response.statusText})`)
  }

  const payload = (await response.json()) as QueryResponse

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0].message ?? 'Unknown subgraph error')
  }

  return {
    token0Pools: payload.data?.token0Pools ?? [],
    token1Pools: payload.data?.token1Pools ?? []
  }
}

const collectPools = async () => {
  const poolMap = new Map<string, Pool>()
  let skip = 0

  while (true) {
    const { token0Pools, token1Pools } = await fetchPoolsPage(skip)
    ;[...token0Pools, ...token1Pools].forEach((pool) => {
      poolMap.set(pool.id.toLowerCase(), pool)
    })

    const hasMore = token0Pools.length === 50 || token1Pools.length === 50
    if (!hasMore) break
    skip += 50
  }

  return Array.from(poolMap.values()).sort(
    (a, b) => Number(b.totalValueLockedUSD) - Number(a.totalValueLockedUSD)
  )
}

const describePool = (pool: Pool) => {
  const jpycAsToken0 = pool.token0.id.toLowerCase() === JPYC_TOKEN_ADDRESS
  const jpycSide = jpycAsToken0 ? 'token0' : 'token1'
  const jpycAmount = jpycAsToken0 ? pool.totalValueLockedToken0 : pool.totalValueLockedToken1
  const latestDay = pool.poolDayData?.[0]

  return {
    pool: pool.id,
    pair: `${pool.token0.symbol}/${pool.token1.symbol}`,
    fee: `${Number(pool.feeTier) / 1e4}%`,
    tvlUSD: formatUsd(pool.totalValueLockedUSD),
    jpycSide,
    jpycAmount: formatAmount(jpycAmount),
    volume24h: formatUsd(latestDay?.volumeUSD ?? '0'),
    fees24h: formatUsd(latestDay?.feesUSD ?? '0'),
    snapshot: latestDay ? new Date(latestDay.date * 1000).toISOString().slice(0, 10) : '-'
  }
}

const main = async () => {
  console.log(`Fetching JPYCActivePools on ${chainArg} (min TVL ${MIN_TVL_USD} USD)`)
  console.log(`Endpoint: ${SUBGRAPH_URL}`)

  const pools = await collectPools()

  if (pools.length === 0) {
    console.log('No pools found for the current criteria.')
    return
  }

  const rows = pools.map(describePool)
  console.table(rows)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
