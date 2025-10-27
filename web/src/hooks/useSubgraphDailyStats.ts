import { useCallback, useEffect, useMemo, useState } from 'react'
import config from '../config.json'
import type { ChainDailySeries } from '../lib/dailySeries'

const TOKEN_DECIMALS = 10 ** config.token.decimals
const SUPPORTED_CHAIN_IDS = ['ethereum', 'polygon', 'avalanche'] as const

interface SubgraphDailyStat {
  dayStartTimestamp: string
  totalSupply: string
}

export type ChainDailyStatsResult = ChainDailySeries

export const useSubgraphDailyStats = (days = 7) => {
  const [chainStats, setChainStats] = useState<ChainDailyStatsResult[]>([])
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

  const normalizeSupply = (value: string) => Number(value) / TOKEN_DECIMALS

  const fetchDailyStats = useCallback(async () => {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query DailyStats($days: Int!) {
                  dailyStats(first: $days, orderBy: dayStartTimestamp, orderDirection: desc) {
                    dayStartTimestamp
                    totalSupply
                  }
                }
              `,
              variables: { days }
            })
          })

          if (!response.ok) {
            throw new Error(`Subgraph error (${chain.name}): ${response.status}`)
          }

          const payload = (await response.json()) as {
            data?: { dailyStats?: SubgraphDailyStat[] }
            errors?: { message: string }[]
          }

          if (payload.errors && payload.errors.length > 0) {
            throw new Error(payload.errors[0].message)
          }

          const normalizedStats =
            payload.data?.dailyStats?.map((stat) => ({
              dayStartTimestamp: Number(stat.dayStartTimestamp),
              totalSupply: normalizeSupply(stat.totalSupply)
            })) ?? []

          return {
            chainId: chain.id,
            name: chain.name,
            accent: chain.accent,
            stats: normalizedStats.sort((a, b) => a.dayStartTimestamp - b.dayStartTimestamp)
          }
        })
      )

      setChainStats(stats)
    } catch (err) {
      setChainStats([])
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [days, targetChains])

  useEffect(() => {
    void fetchDailyStats()
  }, [fetchDailyStats])

  const reload = useCallback(() => {
    void fetchDailyStats()
  }, [fetchDailyStats])

  return {
    chainStats,
    loading,
    error,
    reload
  }
}
