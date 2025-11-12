type EnvRecord = Record<string, string | undefined>

declare const process: {
  env?: EnvRecord
}

type ChainConfig = {
  id: string
  name: string
  subgraphId: string
  providerType: string
  queryType: 'uniswap_v4' | 'uniswap_v3' | 'messari_pool'
}

type Token = {
  id: string
  symbol: string
  decimals: string
}

type PoolHourSnapshot = {
  periodStartUnix: number
  tvlUSD: string
  volumeUSD: string
  feesUSD: string
}

type PoolEntity = {
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
  poolHourData: PoolHourSnapshot[]
}

type PoolsResponse = {
  data?: {
    token0Pools?: PoolEntity[]
    token1Pools?: PoolEntity[]
    liquidityPools?: MessariLiquidityPool[]
  }
  errors?: { message?: string }[]
}

type ApiPool = {
  chainId: string
  chainName: string
  providerType: string
  poolAddress: string
  pair: string
  feeTier: number
  liquidityUSD: number
  jpycSide: 'token0' | 'token1'
  jpycLiquidity: number
  counterTokenSymbol: string
  counterTokenLiquidity: number
  volume24hUSD: number
  fees24hUSD: number
  token0: Token
  token1: Token
  token0Price: number
  token1Price: number
  snapshotDate?: string
}

const CHAINS: ChainConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    subgraphId: 'DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G',
    providerType: 'uniswap_v4',
    queryType: 'uniswap_v4'
  },
  {
    id: 'polygon',
    name: 'Polygon',
    subgraphId: 'CwpebM66AH5uqS5sreKij8yEkkPcHvmyEs7EwFtdM5ND',
    providerType: 'uniswap_v4',
    queryType: 'uniswap_v4'
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    subgraphId: '49JxRo9FGxWpSf5Y5GKQPj5NUpX2HhpoZHpGzNEWQZjq',
    providerType: 'uniswap_v4',
    queryType: 'uniswap_v4'
  },
  {
    id: 'polygon-univ3',
    name: 'Polygon (Uniswap v3)',
    subgraphId: '3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm',
    providerType: 'uniswap_v3',
    queryType: 'uniswap_v3'
  },
  {
    id: 'avalanche-lfj',
    name: 'LFJ (Avalanche)',
    subgraphId: 'H2VGe2tYavUEosSjomHwxbvCKy3LaNaW8Kjw2KhhHs1K',
    providerType: 'lfj',
    queryType: 'messari_pool'
  }
]

const env = (process?.env ?? {}) as EnvRecord
const apiKey = env.GRAPH_API_LIQUIDITY_KEY ?? ''
const jpycAddress = ("0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29").toLowerCase()
const minTvlUsd = Number(env.JPYC_MIN_TVL_USD ?? '1000')
const maxPages = Number(env.JPYC_MAX_PAGES ?? '5')

const UNISWAP_V4_POOLS_QUERY = `
  query JPYCActivePools($token: String!, $minUsd: BigDecimal!, $skip: Int!, $from: Int!) {
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
      poolHourData(
        first: 24
        orderBy: periodStartUnix
        orderDirection: desc
        where: { periodStartUnix_gte: $from }
      ) {
        periodStartUnix
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
      poolHourData(
        first: 24
        orderBy: periodStartUnix
        orderDirection: desc
        where: { periodStartUnix_gte: $from }
      ) {
        periodStartUnix
        tvlUSD
        volumeUSD
        feesUSD
      }
    }
  }
`

const UNISWAP_V3_POOLS_QUERY = `
  query Pools($first: Int!, $skip: Int!, $whereToken0: Pool_filter!, $whereToken1: Pool_filter!, $from: Int!) {
    token0Pools: pools(
      first: $first
      skip: $skip
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: $whereToken0
    ) {
      id
      feeTier
      liquidity
      token0 { id symbol decimals }
      token1 { id symbol decimals }
      token0Price
      token1Price
      totalValueLockedUSD
      totalValueLockedUSDUntracked
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedETH
      volumeToken0
      volumeToken1
      volumeUSD
      feesUSD
      poolHourData(
        first: 24
        orderBy: periodStartUnix
        orderDirection: desc
        where: { periodStartUnix_gte: $from }
      ) {
        periodStartUnix
        tvlUSD
        volumeUSD
        feesUSD
      }
    }
    token1Pools: pools(
      first: $first
      skip: $skip
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: $whereToken1
    ) {
      id
      feeTier
      liquidity
      token0 { id symbol decimals }
      token1 { id symbol decimals }
      token0Price
      token1Price
      totalValueLockedUSD
      totalValueLockedUSDUntracked
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedETH
      volumeToken0
      volumeToken1
      volumeUSD
      feesUSD
      poolHourData(
        first: 24
        orderBy: periodStartUnix
        orderDirection: desc
        where: { periodStartUnix_gte: $from }
      ) {
        periodStartUnix
        tvlUSD
        volumeUSD
        feesUSD
      }
    }
  }
`

const MESSARI_POOLS_QUERY = `
  query MessariPools($token: String!, $minUsd: BigDecimal!, $skip: Int!) {
    liquidityPools(
      first: 50
      skip: $skip
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: { inputTokens_contains: [$token], totalValueLockedUSD_gte: $minUsd }
    ) {
      id
      name
      inputTokens { id symbol decimals }
      inputTokenBalances
      totalValueLockedUSD
      dailySnapshots(
        first: 1
        orderBy: timestamp
        orderDirection: desc
      ) {
        timestamp
        totalValueLockedUSD
        dailyVolumeUSD
        dailySupplySideRevenueUSD
      }
    }
  }
`

const SUBGRAPH_QUERIES: Record<ChainConfig['queryType'], { query: string }> = {
  uniswap_v4: { query: UNISWAP_V4_POOLS_QUERY },
  uniswap_v3: { query: UNISWAP_V3_POOLS_QUERY },
  messari_pool: { query: MESSARI_POOLS_QUERY }
}

const convertMessariPool = (pool: MessariLiquidityPool): PoolEntity | null => {
  if (!Array.isArray(pool.inputTokens) || pool.inputTokens.length < 2) {
    return null
  }
  const balances = pool.inputTokenBalances ?? []
  if (balances.length < 2) {
    return null
  }
  const jpycIndex = pool.inputTokens.findIndex(
    (token) => token.id.toLowerCase() === jpycAddress
  )
  if (jpycIndex === -1) {
    return null
  }
  const counterIndex = jpycIndex === 0 ? 1 : 0
  const jpycToken = pool.inputTokens[jpycIndex]
  const counterToken = pool.inputTokens[counterIndex]
  const jpycAmount = normalizeMessariBalance(balances[jpycIndex], jpycToken.decimals)
  const counterAmount = normalizeMessariBalance(balances[counterIndex], counterToken.decimals)
  const snapshot = pool.dailySnapshots?.[0]
  const periodStartUnix = snapshot ? Number(snapshot.timestamp) : undefined
  return {
    id: pool.id,
    feeTier: '0',
    liquidity: '0',
    token0: jpycToken,
    token1: counterToken,
    token0Price: '0',
    token1Price: '0',
    totalValueLockedUSD: pool.totalValueLockedUSD,
    totalValueLockedToken0: jpycAmount.toString(),
    totalValueLockedToken1: counterAmount.toString(),
    volumeUSD: '0',
    feesUSD: '0',
    poolHourData:
      typeof periodStartUnix === 'number'
        ? [
            {
              periodStartUnix,
              tvlUSD: snapshot?.totalValueLockedUSD ?? pool.totalValueLockedUSD,
              volumeUSD: snapshot?.dailyVolumeUSD ?? '0',
              feesUSD: snapshot?.dailySupplySideRevenueUSD ?? '0'
            }
          ]
        : []
  }
}

const normalizeMessariBalance = (rawBalance: string | undefined, decimalsStr: string): number => {
  if (!rawBalance) return 0
  const decimals = Number(decimalsStr ?? '0')
  const divisor = Math.pow(10, decimals)
  return Number(rawBalance) / (divisor === 0 ? 1 : divisor)
}

export const config = { runtime: 'edge' }

const respondJson = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60'
    }
  })

const buildSubgraphUrl = (subgraphId: string) =>
  `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`

const toNumber = (value: string | undefined) => {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

const fetchPoolsPage = async (chain: ChainConfig, skip: number, from: number, query: string) => {
  const subgraphURL = buildSubgraphUrl(chain.subgraphId)
  console.log(`Fetching JPYC pools from ${subgraphURL} address, ${jpycAddress}`)
  const variables = (() => {
    switch (chain.queryType) {
      case 'uniswap_v3':
        return {
          first: 50,
          skip,
          from,
          whereToken0: { token0: jpycAddress, totalValueLockedUSD_gte: minTvlUsd.toString() },
          whereToken1: { token1: jpycAddress, totalValueLockedUSD_gte: minTvlUsd.toString() }
        }
      case 'messari_pool':
        return {
          token: jpycAddress,
          minUsd: minTvlUsd.toString(),
          skip
        }
      default:
        return {
          token: jpycAddress,
          minUsd: minTvlUsd.toString(),
          skip,
          from
        }
    }
  })()
  const response = await fetch(subgraphURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  })

  if (!response.ok) {
    throw new Error(`Subgraph request failed (${chain.id} ${response.status})`)
  }

  const payload = (await response.json()) as PoolsResponse
  console.log(`[jpyc-pool-list] Raw subgraph response (${chain.id}, skip=${skip}):`, JSON.stringify(payload, null, 2))
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0].message ?? 'Unknown subgraph error')
  }

  if (chain.queryType === 'messari_pool') {
    const pools = (payload.data?.liquidityPools ?? []).map(convertMessariPool).filter((pool): pool is PoolEntity => pool !== null)
    return {
      token0Pools: pools,
      token1Pools: []
    }
  }

  return {
    token0Pools: payload.data?.token0Pools ?? [],
    token1Pools: payload.data?.token1Pools ?? []
  }
}

const collectPoolsForChain = async (chain: ChainConfig): Promise<ApiPool[]> => {
  const poolMap = new Map<string, PoolEntity>()
  let skip = 0
  let page = 0
  const now = Math.floor(Date.now() / 1000)
  const from = now - 24 * 60 * 60
  const queryDef = SUBGRAPH_QUERIES[chain.queryType]
  if (!queryDef) {
    throw new Error(`Unsupported query type for chain ${chain.id}`)
  }
  const query = queryDef.query

  while (page < maxPages) {
    const { token0Pools, token1Pools } = await fetchPoolsPage(chain, skip, from, query)

    ;[...token0Pools, ...token1Pools].forEach((pool) => {
      poolMap.set(pool.id.toLowerCase(), pool)
    })

    const hasMore = token0Pools.length === 50 || token1Pools.length === 50
    if (!hasMore) {
      break
    }
    skip += 50
    page += 1
  }

  const pools = Array.from(poolMap.values()).sort(
    (a, b) => toNumber(b.totalValueLockedUSD) - toNumber(a.totalValueLockedUSD)
  )

  return pools
    .map((pool) => {
      const jpycIsToken0 = pool.token0.id.toLowerCase() === jpycAddress
      const counterToken = jpycIsToken0 ? pool.token1 : pool.token0
      const rawHourly = pool.poolHourData ?? []
      const hourly =  rawHourly
      const volume24h = hourly.reduce((sum, snap) => sum + toNumber(snap.volumeUSD), 0)
      const fees24h = hourly.reduce((sum, snap) => sum + toNumber(snap.feesUSD), 0)
      const latestSnapshot = hourly[0]

      const rawJpycLiquidity = jpycIsToken0
        ? toNumber(pool.totalValueLockedToken0)
        : toNumber(pool.totalValueLockedToken1)
      const rawCounterLiquidity = jpycIsToken0
        ? toNumber(pool.totalValueLockedToken1)
        : toNumber(pool.totalValueLockedToken0)
      const jpycLiquidity = Math.max(0, rawJpycLiquidity)
      const counterLiquidity = Math.max(0, rawCounterLiquidity)

      const base: ApiPool = {
        chainId: chain.id,
        chainName: chain.name,
        providerType: chain.providerType,
        poolAddress: pool.id,
        pair: `${pool.token0.symbol}/${pool.token1.symbol}`,
        feeTier: Number(pool.feeTier) / 1e4,
        liquidityUSD: toNumber(pool.totalValueLockedUSD),
        jpycSide: jpycIsToken0 ? 'token0' : 'token1',
        jpycLiquidity,
        counterTokenSymbol: counterToken.symbol,
        counterTokenLiquidity: counterLiquidity,
        volume24hUSD: volume24h,
        fees24hUSD: fees24h,
        token0: pool.token0,
        token1: pool.token1,
        token0Price: toNumber(pool.token0Price),
        token1Price: toNumber(pool.token1Price),
        snapshotDate: latestSnapshot ? new Date(latestSnapshot.periodStartUnix * 1000).toISOString() : undefined
      }

    if (chain.queryType === 'uniswap_v3') {
        const price = jpycIsToken0 ? toNumber(pool.token1Price) : toNumber(pool.token0Price)
        const jpycUsd = jpycLiquidity * price
        const counterUsd = counterLiquidity
        const liquidityUSD = jpycUsd + counterUsd
        return { ...base, liquidityUSD: liquidityUSD > 0 ? liquidityUSD : base.liquidityUSD }
      }

      return base
    })
    .filter(
      (pool) =>
        pool.liquidityUSD > 0 && pool.jpycLiquidity > 0 && pool.counterTokenLiquidity > 0
    )
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return respondJson(405, { error: 'Method Not Allowed' })
  }

  if (!apiKey) {
    return respondJson(500, { error: 'GRAPHQL_API_KEY is not configured' })
  }

  const fetchChainPools = async (chain: ChainConfig) => {
    try {
      const pools = await collectPoolsForChain(chain)
      return { chain, pools }
    } catch (error) {
      const message = (error as Error).message
      console.error(`[jpyc-pool-list] Failed to fetch ${chain.id}: ${message}`)
      return { chain, error: message }
    }
  }

  const results = await Promise.all(CHAINS.map((chain) => fetchChainPools(chain)))
  const successes = results.filter(
    (result): result is { chain: ChainConfig; pools: ApiPool[] } => 'pools' in result
  )
  const failures = results.filter(
    (result): result is { chain: ChainConfig; error: string } => 'error' in result
  )

  const pools = successes.flatMap((result) => result.pools)

  return respondJson(failures.length > 0 ? 206 : 200, {
    updatedAt: new Date().toISOString(),
    count: pools.length,
    pools,
    failedChains: failures.map(({ chain, error }) => ({
      chainId: chain.id,
      subgraphId: chain.subgraphId,
      error
    }))
  })
}
type MessariLiquidityPool = {
  id: string
  name: string
  inputTokens: Token[]
  inputTokenBalances: string[]
  totalValueLockedUSD: string
  dailySnapshots?: MessariPoolSnapshot[]
}

type MessariPoolSnapshot = {
  timestamp: string
  totalValueLockedUSD?: string
  dailyVolumeUSD?: string
  dailySupplySideRevenueUSD?: string
}
