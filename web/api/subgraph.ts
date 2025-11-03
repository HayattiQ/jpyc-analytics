type ChainConfig = {
  id: string
  name: string
  subgraphUrl: string
}

type EnvRecord = Record<string, string | undefined>

declare const process: {
  env?: EnvRecord
}

const CHAINS: ChainConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/4VHKVn3U9Zr9Mw2q6fzb6VkzQAY4zeA2MzCefV5o4Ygs'
  },
  {
    id: 'polygon',
    name: 'Polygon',
    subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/2g8tfyQFYbAnRgskDRHkar3fRh4srEnKhu5nbRXdZFdB'
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    subgraphUrl: 'https://gateway.thegraph.com/api/subgraphs/id/5UqZe8GkX1uQwPGxuPobHgp3PsprJrdvLTRDfyXMvJsX'
  }
]

const chainsById = new Map<string, ChainConfig>(CHAINS.map((chain) => [chain.id, chain]))

const env = (process?.env ?? {}) as EnvRecord
const bearerToken = env.GRAPH_API_BEARER ?? ''

const SUBGRAPH_QUERIES = {
  GLOBAL_STAT: `
    query GlobalStat($id: ID!) {
      globalStat(id: $id) {
        holderCount
        totalSupply
        updatedAtTimestamp
      }
    }
  `,
  GLOBAL_BUCKETS: `
    query GlobalBuckets($id: ID!) {
      globalStat(id: $id) {
        holderCount
        holdersLe10k
        holdersLe100k
        holdersLe1m
        holdersLe10m
        holdersGt10m
      }
    }
  `,
  LATEST_DAILY_HOLDER: `
    query LatestDailyHolder {
      dailyStats(first: 1, orderBy: dayStartTimestamp, orderDirection: desc) {
        holderCount
      }
    }
  `,
  GLOBAL_STAT_SIMPLE: `
    query GlobalStat($id: ID!) {
      globalStat(id: $id) {
        holderCount
      }
    }
  `,
  DAILY_STATS: `
    query DailyStats($days: Int!) {
      dailyStats(first: $days, orderBy: dayStartTimestamp, orderDirection: desc) {
        dayStartTimestamp
        totalSupply
        holderCount
      }
    }
  `,
  DAILY_STATS_FROM: `
    query DailyStatsFrom($from: BigInt!) {
      dailyStats(
        first: 1000,
        where: { dayStartTimestamp_gte: $from },
        orderBy: dayStartTimestamp,
        orderDirection: asc
      ) {
        dayStartTimestamp
        totalSupply
        holderCount
      }
    }
  `
} as const

type SubgraphQueryId = keyof typeof SUBGRAPH_QUERIES

export const config = { runtime: 'edge' }

const respond = (status: number, message: string) =>
  new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

const parseVariables = (raw: string | null) => {
  if (raw === null || raw.length === 0) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new Error('Invalid variables JSON')
  }
}

const buildUpstreamRequest = (chain: ChainConfig, query: string, variables?: unknown) => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (bearerToken.length > 0) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }
  const body = JSON.stringify(
    typeof variables === 'undefined'
      ? { query }
      : {
          query,
          variables
        }
  )
  return new Request(chain.subgraphUrl, {
    method: 'POST',
    headers,
    body
  })
}

const isValidQueryId = (value: string): value is SubgraphQueryId =>
  Object.prototype.hasOwnProperty.call(SUBGRAPH_QUERIES, value)

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'GET' }
    })
  }

  const url = new URL(request.url)
  const chainId = url.searchParams.get('chain')
  if (!chainId) {
    return respond(400, 'Missing chain parameter')
  }

  const chain = chainsById.get(chainId)
  if (!chain) {
    return respond(404, 'Unsupported chain')
  }

  const queryId = url.searchParams.get('queryId')
  if (!queryId || !isValidQueryId(queryId)) {
    return respond(400, 'Invalid queryId')
  }
  const query = SUBGRAPH_QUERIES[queryId]

  let variables: unknown
  try {
    variables = parseVariables(url.searchParams.get('variables'))
  } catch (error) {
    return respond(400, (error as Error).message)
  }

  const upstreamResponse = await fetch(buildUpstreamRequest(chain, query, variables))
  const body = await upstreamResponse.text()

  const headers = new Headers(upstreamResponse.headers)
  headers.set('Content-Type', 'application/json')
  headers.delete('content-length')

  return new Response(body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers
  })
}
