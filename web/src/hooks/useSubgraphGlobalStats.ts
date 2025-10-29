import { useCallback, useEffect, useMemo, useState } from 'react'
import config from '../config.json'
import { buildGraphHeaders } from '../lib/graphHeaders'
const SUPPORTED_CHAIN_IDS = ['ethereum', 'polygon', 'avalanche'] as const

interface SubgraphGlobalStat {
  holderCount: string
  totalSupply: string
  updatedAtTimestamp?: string
}

export interface ChainGlobalStat {
  chainId: string
  name: string
  accent: string
  holderCount: number
  totalSupply: number
  updatedAt: number
}

export const useSubgraphGlobalStats = () => {
  const [globalStats, setGlobalStats] = useState<ChainGlobalStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetChains = useMemo(
    () =>
      config.chains.filter(
        (chain) =>
          SUPPORTED_CHAIN_IDS.includes(chain.id as (typeof SUPPORTED_CHAIN_IDS)[number]) &&
          typeof chain.subgraphUrl === 'string' &&
          chain.subgraphUrl.length > 0 &&
          typeof chain.globalStatId === 'string' &&
          chain.globalStatId.length > 0
      ),
    []
  )

  const normalizeSupply = (value: string) => {
    const raw = BigInt(value)
    const divisor = 10n ** BigInt(config.token.decimals)
    const integerPart = Number(raw / divisor)
    const fractionPart = Number(raw % divisor) / Number(divisor)
    return integerPart + fractionPart
  }

  const fetchGlobalStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (targetChains.length === 0) {
        throw new Error('対象チェーンの subgraph 設定が見つかりません。')
      }

      const stats = await Promise.all(
        targetChains.map(async (chain) => {
          const response = await fetch(chain.subgraphUrl, {
            method: 'POST',
            headers: buildGraphHeaders(),
            body: JSON.stringify({
              query: `
                query GlobalStat($id: ID!) {
                  globalStat(id: $id) {
                    holderCount
                    totalSupply
                    updatedAtTimestamp
                  }
                }
              `,
              variables: { id: chain.globalStatId }
            })
          })

          if (!response.ok) {
            throw new Error(`Subgraph error (${chain.name}): ${response.status}`)
          }

          const payload = (await response.json()) as {
            data?: { globalStat?: SubgraphGlobalStat | null }
            errors?: { message: string }[]
          }

          if (payload.errors && payload.errors.length > 0) {
            throw new Error(payload.errors[0].message)
          }

          const stat = payload.data?.globalStat

          if (!stat) {
            throw new Error(`globalStat が取得できません (${chain.name})`)
          }

          return {
            chainId: chain.id,
            name: chain.name,
            accent: chain.accent,
            holderCount: Number(stat.holderCount),
            totalSupply: normalizeSupply(stat.totalSupply),
            updatedAt: Number(stat.updatedAtTimestamp ?? 0)
          }
        })
      )

      setGlobalStats(stats)
    } catch (err) {
      setGlobalStats([])
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [targetChains])

  useEffect(() => {
    void fetchGlobalStats()
  }, [fetchGlobalStats])

  const reload = useCallback(() => {
    void fetchGlobalStats()
  }, [fetchGlobalStats])

  return {
    globalStats,
    loading,
    error,
    reload
  }
}
