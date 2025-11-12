type EnvRecord = Record<string, string | undefined>

declare const process: {
  env?: EnvRecord
}

type ChainConfig = {
  id: string
  name: string
  subgraphId: string
}

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
  poolDayData: PoolSnapshot[]
}

type PoolsResponse = {
  data?: {
    token0Pools?: PoolEntity[]
    token1Pools?: PoolEntity[]
  }
  errors?: { message?: string }[]
}

type ApiPool = {
  chainId: string
  chainName: string
  poolAddress: string
  pair: string
  feeTier: number
  liquidityUSD: number
  jpycSide: 'token0' | 'token1'
  jpycLiquidity: number
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
    subgraphId: 'DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G'
  },
  {
    id: 'polygon',
    name: 'Polygon',
    subgraphId: 'CwpebM66AH5uqS5sreKij8yEkkPcHvmyEs7EwFtdM5ND'
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    subgraphId: '49JxRo9FGxWpSf5Y5GKQPj5NUpX2HhpoZHpGzNEWQZjq'
  }
]

const env = (process?.env ?? {}) as EnvRecord
const apiKey = env.GRAPH_API_LIQUIDITY_KEY ?? ''
const jpycAddress = ("0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29").toLowerCase()
const minTvlUsd = Number(env.JPYC_MIN_TVL_USD ?? '1000')
const maxPages = Number(env.JPYC_MAX_PAGES ?? '5')

const JPYC_ACTIVE_POOLS = `
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

const fetchPoolsPage = async (chain: ChainConfig, skip: number) => {
  const subgraphURL = buildSubgraphUrl(chain.subgraphId)
  console.log(`Fetching JPYC pools from ${subgraphURL} address, ${jpycAddress}`)
  const response = await fetch(subgraphURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query: JPYC_ACTIVE_POOLS,
      variables: {
        token: jpycAddress,
        minUsd: minTvlUsd.toString(),
        skip
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Subgraph request failed (${chain.id} ${response.status})`)
  }

  const payload = (await response.json()) as PoolsResponse
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0].message ?? 'Unknown subgraph error')
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

  while (page < maxPages) {
    const { token0Pools, token1Pools } = await fetchPoolsPage(chain, skip)

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

  return pools.map((pool) => {
    const jpycIsToken0 = pool.token0.id.toLowerCase() === jpycAddress
    const snapshot = pool.poolDayData?.[0]

    return {
      chainId: chain.id,
      chainName: chain.name,
      poolAddress: pool.id,
      pair: `${pool.token0.symbol}/${pool.token1.symbol}`,
      feeTier: Number(pool.feeTier) / 1e4,
      liquidityUSD: toNumber(pool.totalValueLockedUSD),
      jpycSide: jpycIsToken0 ? 'token0' : 'token1',
      jpycLiquidity: jpycIsToken0
        ? toNumber(pool.totalValueLockedToken0)
        : toNumber(pool.totalValueLockedToken1),
      volume24hUSD: toNumber(snapshot?.volumeUSD),
      fees24hUSD: toNumber(snapshot?.feesUSD),
      token0: pool.token0,
      token1: pool.token1,
      token0Price: toNumber(pool.token0Price),
      token1Price: toNumber(pool.token1Price),
      snapshotDate: snapshot ? new Date(snapshot.date * 1000).toISOString() : undefined
    }
  })
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
