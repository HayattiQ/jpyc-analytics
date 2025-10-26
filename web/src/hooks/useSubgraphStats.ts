import { useCallback, useEffect, useMemo, useState } from 'react'
import config from '../config.json'

const subgraphConfig = config.chains.find(
  (chain) =>
    typeof chain.subgraphUrl === 'string' &&
    chain.subgraphUrl.length > 0 &&
    typeof chain.globalStatId === 'string' &&
    chain.globalStatId.length > 0
)
const SUBGRAPH_URL = subgraphConfig?.subgraphUrl ?? ''
const GLOBAL_ID = subgraphConfig?.globalStatId ?? ''
const TOKEN_DECIMALS = 10 ** config.token.decimals

export interface NormalizedGlobalStat {
  holderCount: number
  totalSupply: number
  updatedAt: number
}

export interface NormalizedDailyStat {
  dayStartTimestamp: number
  holderCount: number
  totalSupply: number
}

interface SubgraphGlobalStat {
  holderCount: string
  totalSupply: string
  updatedAtTimestamp: string
}

interface SubgraphDailyStat {
  dayStartTimestamp: string
  holderCount: string
  totalSupply: string
}

export const useSubgraphStats = (days = 7) => {
  const [globalStat, setGlobalStat] = useState<NormalizedGlobalStat | null>(null)
  const [dailyStats, setDailyStats] = useState<NormalizedDailyStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeValue = (value: string) => Number(value) / TOKEN_DECIMALS

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (!SUBGRAPH_URL || !GLOBAL_ID) {
      setGlobalStat(null)
      setDailyStats([])
      setLoading(false)
      setError('Subgraph endpoint or globalStatId is not configured')
      return
    }
    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query Stats($days: Int!) {
              globalStat(id: "${GLOBAL_ID}") {
                holderCount
                totalSupply
                updatedAtTimestamp
              }
              dailyStats(first: $days, orderBy: dayStartTimestamp, orderDirection: desc) {
                dayStartTimestamp
                holderCount
                totalSupply
              }
            }
          `,
          variables: { days }
        })
      })

      if (!response.ok) {
        throw new Error(`Subgraph request failed: ${response.status}`)
      }

      const payload = (await response.json()) as {
        data?: {
          globalStat?: SubgraphGlobalStat | null
          dailyStats?: SubgraphDailyStat[]
        }
        errors?: { message: string }[]
      }

      if (payload.errors && payload.errors.length > 0) {
        throw new Error(payload.errors[0].message)
      }

      if (payload.data?.globalStat) {
        const stat = payload.data.globalStat
        setGlobalStat({
          holderCount: Number(stat.holderCount),
          totalSupply: normalizeValue(stat.totalSupply),
          updatedAt: Number(stat.updatedAtTimestamp)
        })
      } else {
        setGlobalStat(null)
      }

      const normalizedDaily =
        payload.data?.dailyStats?.map((stat) => ({
          dayStartTimestamp: Number(stat.dayStartTimestamp),
          holderCount: Number(stat.holderCount),
          totalSupply: normalizeValue(stat.totalSupply)
        })) ?? []

      setDailyStats(normalizedDaily)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const reload = useCallback(() => {
    void fetchStats()
  }, [fetchStats])

  const sortedDailyStats = useMemo(
    () => [...dailyStats].sort((a, b) => a.dayStartTimestamp - b.dayStartTimestamp),
    [dailyStats]
  )

  return {
    globalStat,
    dailyStats: sortedDailyStats,
    loading,
    error,
    reload
  }
}
