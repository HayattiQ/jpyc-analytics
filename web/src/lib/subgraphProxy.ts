import { buildGraphHeaders } from './graphHeaders'

type ChainConfig = {
  id: string
  name: string
  subgraphUrl?: string
}

const DEFAULT_PROXY_BASE = '/api/subgraph'
const PROXY_DISABLE_SENTINEL = 'direct'

const appendChainQuery = (base: string, chainId: string) => {
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}chain=${encodeURIComponent(chainId)}`
}

const resolveProxyBase = () => {
  const raw = import.meta.env.VITE_SUBGRAPH_PROXY_BASE
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return DEFAULT_PROXY_BASE
  }
  return raw.trim()
}

interface PostSubgraphOptions {
  signal?: AbortSignal
}

export const postSubgraph = async (
  chain: ChainConfig,
  payload: unknown,
  options: PostSubgraphOptions = {}
): Promise<Response> => {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  if (!body || body.length === 0) {
    throw new Error('Subgraph リクエストのペイロードが空です')
  }

  const proxyBase = resolveProxyBase()
  const targets: Array<{ url: string; kind: 'proxy' | 'direct' }> = []
  if (proxyBase !== PROXY_DISABLE_SENTINEL && proxyBase.length > 0) {
    targets.push({ url: appendChainQuery(proxyBase, chain.id), kind: 'proxy' })
  }
  if (typeof chain.subgraphUrl === 'string' && chain.subgraphUrl.length > 0) {
    targets.push({ url: chain.subgraphUrl, kind: 'direct' })
  }

  if (targets.length === 0) {
    throw new Error(`Subgraph エンドポイントが設定されていません (${chain.name})`)
  }

  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetch(target.url, {
        method: 'POST',
        headers:
          target.kind === 'direct'
            ? buildGraphHeaders()
            : { 'Content-Type': 'application/json' },
        body,
        signal: options.signal
      })

      if (
        target.kind === 'proxy' &&
        (response.status === 404 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504)
      ) {
        lastError = new Error(`Proxy responded with ${response.status}`)
        continue
      }

      return response
    } catch (error) {
      lastError = error as Error
      continue
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error(`Subgraph リクエストに失敗しました (${chain.name})`)
}
