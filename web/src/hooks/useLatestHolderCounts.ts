import { useCallback, useEffect, useMemo, useState } from 'react'
import config from '../config.json'
import { fetchSubgraph } from '../lib/subgraphProxy'

type ChainConfig = (typeof config.chains)[number]

export interface LatestHolderCount {
  chainId: string
  name: string
  accent: string
  holderCount: number | null
}

export const useLatestHolderCounts = () => {
  const [data, setData] = useState<LatestHolderCount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetChains = useMemo(
    () => config.chains.filter((c) => typeof c.subgraphUrl === 'string' && c.subgraphUrl.length > 0),
    []
  )

  const fetchLatestFor = async (chain: ChainConfig): Promise<LatestHolderCount> => {
    try {
      const res = await fetchSubgraph(chain, {
        queryId: 'LATEST_DAILY_HOLDER'
      })

      if (!res.ok) throw new Error(`Subgraph error (${chain.name}): ${res.status}`)
      const payload = (await res.json()) as {
        data?: { dailyStats?: { holderCount: string }[] }
        errors?: { message: string }[]
      }
      if (payload.errors && payload.errors.length > 0) {
        throw new Error(payload.errors[0].message ?? 'Subgraph error')
      }
      const val = payload.data?.dailyStats?.[0]?.holderCount
      const holderCount = typeof val === 'string' ? Number(val) : null
      return { chainId: chain.id, name: chain.name, accent: chain.accent, holderCount }
    } catch (e) {
      console.error(`[dailyHolder] ${chain.name} failed: ${(e as Error).message}`)
      return { chainId: chain.id, name: chain.name, accent: chain.accent, holderCount: null }
    }
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(targetChains.map((c) => fetchLatestFor(c)))
      setData(results)
    } catch (e) {
      setError((e as Error).message)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [targetChains])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  return { data, loading, error, reload: fetchAll }
}
