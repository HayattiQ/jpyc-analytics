import { useCallback, useEffect, useMemo, useState } from 'react'
import config from '../config.json'
import { buildGraphHeaders } from '../lib/graphHeaders'

export interface EthHolderBucketsData {
  total: number
  le10k: number
  r10k_100k: number
  r100k_1m: number
  r1m_10m: number
  gt10m: number
}

export const useEthHolderBuckets = () => {
  const [data, setData] = useState<EthHolderBucketsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eth = useMemo(() => config.chains.find((c) => c.id === 'ethereum'), [])

  const fetchBuckets = useCallback(async () => {
    if (!eth?.subgraphUrl) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(eth.subgraphUrl, {
        method: 'POST',
        headers: buildGraphHeaders(),
        body: JSON.stringify({
          query: `
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
          variables: { id: eth.globalStatId }
        })
      })
      if (!res.ok) throw new Error(`Subgraph error (Ethereum): ${res.status}`)
      const payload = (await res.json()) as {
        data?: {
          globalStat?: {
            holderCount: string
            holdersLe10k?: string
            holdersLe100k?: string
            holdersLe1m?: string
            holdersLe10m?: string
            holdersGt10m?: string
          } | null
        }
        errors?: { message: string }[]
      }
      if (payload.errors && payload.errors.length > 0) throw new Error(payload.errors[0].message)
      const gs = payload.data?.globalStat
      if (!gs) throw new Error('globalStat が取得できません (Ethereum)')

      const total = Number(gs.holderCount)
      const le10k = Number(gs.holdersLe10k ?? 0)
      const le100k = Number(gs.holdersLe100k ?? 0)
      const le1m = Number(gs.holdersLe1m ?? 0)
      const le10m = Number(gs.holdersLe10m ?? 0)
      const gt10m = Number(gs.holdersGt10m ?? 0)

      const r10k_100k = Math.max(le100k - le10k, 0)
      const r100k_1m = Math.max(le1m - le100k, 0)
      const r1m_10m = Math.max(le10m - le1m, 0)

      setData({ total, le10k, r10k_100k, r100k_1m, r1m_10m, gt10m })
    } catch (e) {
      setError((e as Error).message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [eth])

  useEffect(() => {
    void fetchBuckets()
  }, [fetchBuckets])

  return { data, loading, error, reload: fetchBuckets }
}
