import type { SubgraphQueryId } from './subgraphQueries'

type ChainConfig = {
  id: string
  name: string
  subgraphUrl?: string
}

interface SubgraphRequestOptions {
  signal?: AbortSignal
}

interface SubgraphRequestPayload {
  queryId: SubgraphQueryId
  variables?: unknown
}

const buildQueryString = (chainId: string, payload: SubgraphRequestPayload) => {
  const params = new URLSearchParams()
  params.set('chain', chainId)
  params.set('queryId', payload.queryId)
  if (typeof payload.variables !== 'undefined') {
    params.set('variables', JSON.stringify(payload.variables))
  }
  return params.toString()
}

export const fetchSubgraph = async (
  chain: ChainConfig,
  payload: SubgraphRequestPayload,
  options: SubgraphRequestOptions = {}
): Promise<Response> => {
  const qs = buildQueryString(chain.id, payload)
  const response = await fetch(`/api/subgraph?${qs}`, {
    method: 'GET',
    signal: options.signal
  })

  if (!response.ok) {
    throw new Error(
      `Subgraph プロキシ経由のリクエストに失敗しました (${chain.name}): ${response.status}`
    )
  }

  return response
}
